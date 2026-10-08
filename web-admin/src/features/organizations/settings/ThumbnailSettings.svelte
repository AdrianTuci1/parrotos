<script lang="ts">
  import { invalidate } from "$app/navigation";
  import {
    createAdminServiceUpdateOrganization,
    getAdminServiceGetOrganizationQueryKey,
  } from "@statsparrot/web-admin/client";
  import { getRpcErrorMessage } from "@statsparrot/web-admin/components/errors/error-utils";
  import SettingsContainer from "@statsparrot/web-admin/features/organizations/settings/SettingsContainer.svelte";
  import UploadImagePopover from "@statsparrot/web-admin/features/organizations/settings/UploadImagePopover.svelte";
  import { Button } from "@statsparrot/web-common/components/button";
  import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";

  let {
    organization,
    organizationThumbnailUrl,
  }: {
    organization: string;
    organizationThumbnailUrl: string | undefined;
  } = $props();

  const orgUpdater = createAdminServiceUpdateOrganization();
  let { error, isPending: isLoading, mutateAsync } = $derived($orgUpdater);

  async function onSave(assetId: string) {
    await mutateAsync({
      org: organization,
      data: {
        thumbnailAssetId: assetId,
      },
    });
    void queryClient.invalidateQueries({
      queryKey: getAdminServiceGetOrganizationQueryKey(organization),
    });
    void invalidate("app:root");
  }

  async function onRemove() {
    await mutateAsync({
      org: organization,
      data: {
        thumbnailAssetId: "",
      },
    });
    void queryClient.invalidateQueries({
      queryKey: getAdminServiceGetOrganizationQueryKey(organization),
    });
    void invalidate("app:root");
  }
</script>

{#snippet removeAction()}
  <Button
    type="secondary"
    onClick={onRemove}
    loading={isLoading}
    disabled={isLoading}
  >
    {m.settings_remove_button()}
  </Button>
{/snippet}

<SettingsContainer
  title={m.settings_thumbnail_title()}
  action={organizationThumbnailUrl ? removeAction : undefined}
>
  <div class="flex flex-col gap-y-2">
    <div>
      {m.settings_thumbnail_description()}
    </div>
    <UploadImagePopover
      imageUrl={organizationThumbnailUrl}
      accept="image/png, image/jpeg, image/gif"
      label={m.settings_thumbnail_title()}
      {organization}
      loading={isLoading}
      error={getRpcErrorMessage(error)}
      {onSave}
      {onRemove}
    >
      <img
        src="https://cdn.statsparrot.com/images/statsparrot-admin.png"
        alt={m.settings_thumbnail_title()}
        class="h-10"
      />
    </UploadImagePopover>
  </div>
</SettingsContainer>
