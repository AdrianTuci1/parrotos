<script lang="ts">
  import ContentContainer from "@statsparrot/web-common/components/layout/ContentContainer.svelte";
  import DashboardList from "../../features/dashboards/DashboardList.svelte";
</script>

<ContentContainer title="Dashboards" maxWidth={1100}>
  <DashboardList showSearch />
</ContentContainer>
