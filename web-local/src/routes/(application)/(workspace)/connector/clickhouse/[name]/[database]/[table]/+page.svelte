<script lang="ts">
  import { page } from "$app/stores";
  import TablePreviewWorkspace from "@statsparrot/web-common/features/connectors/olap/TablePreviewWorkspace.svelte";
  import { featureFlags } from "@statsparrot/web-common/features/feature-flags";
  import { error } from "@sveltejs/kit";
  import { onMount } from "svelte";

  const { readOnly } = featureFlags;

  $: name = $page.params.name;
  $: database = $page.params.database;
  // ClickHouse does not have a database "schema" concept
  // Parrot considers the ClickHouse "database" as the "database schema"
  $: table = $page.params.table;

  onMount(() => {
    if ($readOnly) {
      throw error(404, "Page not found");
    }
  });
</script>

<svelte:head>
  <title>Parrot Developer | {table}</title>
</svelte:head>

<TablePreviewWorkspace connector={name} databaseSchema={database} {table} />
