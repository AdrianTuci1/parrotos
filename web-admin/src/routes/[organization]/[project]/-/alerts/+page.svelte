<script lang="ts">
  import { page } from "$app/stores";
  import AlertsTable from "@statsparrot/web-admin/features/alerts/listing/AlertsTable.svelte";
  import { useAlerts } from "@statsparrot/web-admin/features/alerts/selectors";
  import ProjectPage from "@statsparrot/web-admin/features/projects/ProjectPage.svelte";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  const runtimeClient = useRuntimeClient();

  $: ({
    params: { organization, project },
  } = $page);

  $: query = useAlerts(runtimeClient);

  $: ({ data } = $query);

  $: alerts = data?.resources ?? [];
</script>

<ProjectPage {query} kind="alert">
  <AlertsTable {organization} {project} data={alerts} slot="table" />
</ProjectPage>
