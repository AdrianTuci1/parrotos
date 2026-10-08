<script lang="ts">
  import { page } from "$app/stores";
  import TablePreviewWorkspace from "@statsparrot/web-common/features/connectors/olap/TablePreviewWorkspace.svelte";

  $: name = $page.params.name;
  $: databaseSchema = $page.params.schema;
  $: table = $page.params.table;
</script>

<svelte:head>
  <title>Parrot | {table}</title>
</svelte:head>

<TablePreviewWorkspace connector={name} {databaseSchema} {table} />
