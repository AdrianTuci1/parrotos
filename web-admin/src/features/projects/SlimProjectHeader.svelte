<script lang="ts">
  import Breadcrumbs from "@statsparrot/web-common/components/navigation/breadcrumbs/Breadcrumbs.svelte";
  import Header from "@statsparrot/web-common/layout/header/Header.svelte";
  import HeaderLogo from "@statsparrot/web-common/layout/header/HeaderLogo.svelte";
  import { createAdminServiceGetCurrentUser } from "../../client";
  import {
    useBreadcrumbOrgPaths,
    useBreadcrumbProjectPaths,
  } from "../navigation/breadcrumb-selectors";
  import AvatarButton from "../authentication/AvatarButton.svelte";
  import SignIn from "../authentication/SignIn.svelte";

  export let organization: string;
  export let project: string;
  export let readProjects: boolean;
  export let planDisplayName: string | undefined;
  export let organizationLogoUrl: string | undefined;

  const user = createAdminServiceGetCurrentUser();

  $: loggedIn = !!$user.data?.user;
  $: statsparrotLogoHref = !loggedIn ? "https://www.statsparrot.com" : "/";

  $: orgPathsQuery = useBreadcrumbOrgPaths(
    loggedIn,
    organization,
    planDisplayName,
  );
  $: projectPathsQuery = useBreadcrumbProjectPaths(organization, readProjects);

  $: pathParts = [
    { options: $orgPathsQuery.data ?? new Map() },
    { options: $projectPathsQuery.data ?? new Map() },
  ];
  $: currentPath = [organization, project];
</script>

<Header borderBottom>
  <HeaderLogo href={statsparrotLogoHref} logoUrl={organizationLogoUrl} />
  <Breadcrumbs {pathParts} {currentPath} />

  <div class="flex gap-x-2 items-center ml-auto">
    {#if $user.isSuccess}
      {#if $user.data?.user}
        <AvatarButton />
      {:else}
        <SignIn />
      {/if}
    {/if}
  </div>
</Header>
