<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    createAdminServiceDenyProjectAccess,
    createAdminServiceGetProjectAccessRequest,
  } from "@statsparrot/web-admin/client";
  import { parseAccessRequestError } from "@statsparrot/web-admin/features/access-request/utils";
  import { EntityStatus } from "@statsparrot/web-common/features/entity-management/types";
  import AccessRequestContainer from "@statsparrot/web-admin/features/access-request/AccessRequestContainer.svelte";
  import Spinner from "@statsparrot/web-common/features/entity-management/Spinner.svelte";
  import { eventBus } from "@statsparrot/web-common/lib/event-bus/event-bus";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import { escapeHtml } from "@statsparrot/web-common/lib/i18n";
  import type { AxiosError } from "axios";

  $: organization = $page.params.organization;
  $: project = $page.params.project;
  $: id = $page.params.id;

  let requested = false;
  $: denyAccess = createAdminServiceDenyProjectAccess();
  $: requestAccess = createAdminServiceGetProjectAccessRequest(id);

  async function onDeny() {
    if ($requestAccess.error) {
      eventBus.emit("notification", {
        type: "error",
        message: parseAccessRequestError(
          project,
          $requestAccess.error as unknown as AxiosError,
        ),
        options: {
          persisted: true,
        },
      });
      return goto(`/${organization}/${project}`);
    }

    requested = true;
    try {
      await $denyAccess.mutateAsync({
        id,
        data: {},
      });
      eventBus.emit("notification", {
        type: "success",
        message: m.auth_user_denied_access({
          email: $requestAccess.data.email,
          project,
        }),
      });
    } catch {
      eventBus.emit("notification", {
        type: "error",
        message: parseAccessRequestError(
          project,
          $requestAccess.error as unknown as AxiosError,
        ),
        options: {
          persisted: true,
        },
      });
    }
    return goto(`/${organization}/${project}`);
  }
  $: if (
    organization &&
    project &&
    id &&
    !$requestAccess.isLoading &&
    !requested
  ) {
    onDeny();
  }
</script>

<AccessRequestContainer>
  {#if $denyAccess.isPending && $requestAccess.data}
    <Spinner status={EntityStatus.Running} size="2rem" duration={725} />
    <div>
      {@html m.auth_denying_access({
        email: `<b>${escapeHtml($requestAccess.data.email)}</b>`,
        project: `<b>${escapeHtml(project)}</b>`,
      })}
    </div>
  {/if}
</AccessRequestContainer>
