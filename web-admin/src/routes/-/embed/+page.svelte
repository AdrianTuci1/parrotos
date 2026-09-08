<script lang="ts">
  import ContentContainer from "@statsparrot/web-common/components/layout/ContentContainer.svelte";
  import DashboardsTable from "@statsparrot/web-admin/features/dashboards/listing/DashboardsTable.svelte";
</script>

<ContentContainer>
  <div class="flex flex-col items-center gap-y-4">
    <DashboardsTable isEmbedded />
  </div>
</ContentContainer>
