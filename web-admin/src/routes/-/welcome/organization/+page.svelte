<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "@statsparrot/web-common/components/button";
  import CreateNewOrgForm, {
    CreateNewOrgFormId,
  } from "@statsparrot/web-common/features/organization/CreateNewOrgForm.svelte";
  import ParrotLogoSquareNegative from "@statsparrot/web-common/components/icons/ParrotLogoSquareNegative.svelte";
  import {
    createAdminServiceCreateOrganization,
    getAdminServiceListOrganizationsQueryKey,
    type RpcStatus,
  } from "@statsparrot/web-admin/client";
  import type { AxiosError } from "axios";
  import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient.ts";

  const createOrgMutation = createAdminServiceCreateOrganization();
  $: ({ isPending, error } = $createOrgMutation);
  $: errorMessage = error
    ? ((error as unknown as AxiosError<RpcStatus>)?.response?.data?.message ??
      error.message)
    : undefined;

  async function createOrg(name: string, displayName: string) {
    await $createOrgMutation.mutateAsync({
      data: {
        name,
        displayName,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: getAdminServiceListOrganizationsQueryKey(),
    });

    // This navigation gets cancelled if we do not have `setTimeout` here.
    setTimeout(() => void goto(`/${name}/-/create-project`));
  }
</script>

<div class="flex flex-col gap-4 mx-auto w-fit">
  <ParrotLogoSquareNegative size="36px" />
  <div class="text-2xl font-extrabold text-fg-accent text-center">
    Create an organization
  </div>

  <div
    class="flex flex-col gap-6 text-left p-6 border rounded-md bg-surface-overlay"
  >
    <div>
      <div class="text-base font-semibold">Name your organization</div>
      <div class="text-sm text-fg-muted">
        You can change the name in organization settings.
      </div>
    </div>
    <CreateNewOrgForm {createOrg} size="xl" />
    {#if errorMessage}
      <div class="text-sm text-destructive">{errorMessage}</div>
    {/if}
    <div class="w-full flex justify-end">
      <Button
        type="primary"
        submitForm
        form={CreateNewOrgFormId}
        loading={isPending}
      >
        Continue
      </Button>
    </div>
  </div>
</div>
