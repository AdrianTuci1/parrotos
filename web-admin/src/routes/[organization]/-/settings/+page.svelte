<script lang="ts">
  import { page } from "$app/stores";
  import ChoosePlanDialog from "@statsparrot/web-admin/features/billing/plans/dialog/ChoosePlanDialog.svelte";
  import DangerZone from "@statsparrot/web-admin/components/danger-zone/DangerZone.svelte";
  import DeleteOrg from "@statsparrot/web-admin/features/organizations/settings/DeleteOrg.svelte";
  import FaviconSettings from "@statsparrot/web-admin/features/organizations/settings/FaviconSettings.svelte";
  import LogoSettings from "@statsparrot/web-admin/features/organizations/settings/LogoSettings.svelte";
  import OrgNameSettings from "@statsparrot/web-admin/features/organizations/settings/OrgNameSettings.svelte";
  import OrgDomainAllowListSettings from "@statsparrot/web-admin/features/organizations/settings/OrgDomainAllowListSettings.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: ({ showUpgradeDialog, organization: organizationObj } = data);

  $: ({
    logoUrl: organizationLogoUrl,
    logoDarkUrl: organizationLogoDarkUrl,
    faviconUrl: organizationFaviconUrl,
  } = organizationObj ?? {});

  $: organization = $page.params.organization;
</script>

<OrgNameSettings {organization} />
<LogoSettings {organization} {organizationLogoUrl} {organizationLogoDarkUrl} />
<FaviconSettings {organization} {organizationFaviconUrl} />
<OrgDomainAllowListSettings {organization} />

<DangerZone>
  <DeleteOrg {organization} />
</DangerZone>

{#if showUpgradeDialog}
  <ChoosePlanDialog open {organization} type="base" />
{/if}
