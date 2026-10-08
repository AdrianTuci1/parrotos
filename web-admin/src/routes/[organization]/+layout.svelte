<script lang="ts">
  import { page } from "$app/stores";
  import { createAdminServiceGetCurrentUser } from "@statsparrot/web-admin/client";
  import {
    showWelcomeToParrotDialog,
    showWelcomeToParrotDialogForPlan,
  } from "@statsparrot/web-admin/features/billing/plans/utils";
  import WelcomeToParrotCloudDialog from "@statsparrot/web-admin/features/billing/plans/dialog/WelcomeToParrotCloudDialog.svelte";
  import { getActiveOrgLocalStorageKey } from "@statsparrot/web-admin/features/organizations/active-org/local-storage";

  const user = createAdminServiceGetCurrentUser();
  $: organization = $page.params.organization;

  $: if ($user.data?.user?.id) {
    // get active org key for the current user
    const activeOrgLocalStorageKey = getActiveOrgLocalStorageKey(
      $user.data?.user?.id,
    );
    // store the navigated org to the local storage
    localStorage.setItem(activeOrgLocalStorageKey, organization);
  }
</script>

<slot />

<WelcomeToParrotCloudDialog
  bind:open={$showWelcomeToParrotDialog}
  planName={$showWelcomeToParrotDialogForPlan}
/>
