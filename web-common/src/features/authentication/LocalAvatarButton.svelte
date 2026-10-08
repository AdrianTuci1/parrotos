<script lang="ts">
  import { page } from "$app/stores";
  import Avatar from "@statsparrot/web-common/components/avatar/Avatar.svelte";
  import * as DropdownMenu from "@statsparrot/web-common/components/dropdown-menu";
  import NoUser from "@statsparrot/web-common/components/icons/NoUser.svelte";
  import { EntityStatus } from "@statsparrot/web-common/features/entity-management/types";
  import { initPylonChat } from "@statsparrot/web-common/features/help/initPylonChat";
  import {
    createLocalServiceGetCurrentUser,
    createLocalServiceGetMetadata,
  } from "@statsparrot/web-common/runtime-client/local-service";
  import Spinner from "@statsparrot/web-common/features/entity-management/Spinner.svelte";
  import ThemeToggle from "@statsparrot/web-common/features/themes/ThemeToggle.svelte";

  $: user = createLocalServiceGetCurrentUser({
    query: {
      // refetch in case user does a login/logout from outside of statsparrot developer UI
      refetchOnWindowFocus: true,
    },
  });
  $: metadata = createLocalServiceGetMetadata();

  let loginUrl: string;
  $: if ($metadata.data?.loginUrl) {
    const u = new URL($metadata.data.loginUrl);
    u.searchParams.set(
      "redirect",
      `${window.location.origin}${window.location.pathname}`,
    );
    loginUrl = u.toString();
  }

  let logoutUrl: string;
  $: if ($metadata.data?.loginUrl) {
    const u = new URL($metadata.data.loginUrl + "/logout");
    u.searchParams.set("redirect", $page.url.href);
    logoutUrl = u.toString();
  }

  $: loggedIn = $user.isSuccess && $user.data?.user;

  $: if ($user.data?.user) {
    initPylonChat($user.data.user);
  }
  function handlePylon() {
    window.Pylon("show");
  }

  let photoUrlErrored = false;
</script>

{#if ($user.isLoading || $metadata.isLoading) && !$user.error && !$metadata.error}
  <div class="flex flex-row items-center h-7 mx-1.5">
    <Spinner size="16px" status={EntityStatus.Running} />
  </div>
{:else}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="flex-none w-7"
      aria-label="Avatar logged {loggedIn ? 'in' : 'out'}"
    >
      {#if loggedIn && !photoUrlErrored && $user.data && $metadata.data}
        <Avatar
          src={$user.data?.user?.photoUrl}
          alt={$user.data?.user?.displayName || $user.data?.user?.email}
          avatarSize="h-7 w-7"
        />
      {:else}
        <NoUser />
      {/if}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="p-1">
      <ThemeToggle />
      <DropdownMenu.Separator />

      <DropdownMenu.Item
        href="https://docs.statsparrot.com"
        target="_blank"
        rel="noreferrer noopener"
      >
        Documentation
      </DropdownMenu.Item>
      <DropdownMenu.Separator />

      <DropdownMenu.Item
        href="https://discord.gg/2ubRfjC7Rh"
        target="_blank"
        rel="noreferrer noopener"
      >
        Join us on Discord
      </DropdownMenu.Item>

      {#if loggedIn}
        <DropdownMenu.Item onclick={handlePylon}>
          Contact Parrot support
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item href={logoutUrl} rel="external">
          Logout
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Separator />
        <DropdownMenu.Item href={loginUrl} rel="external">
          Log in / Sign up
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
