<script lang="ts">
  import { page } from "$app/stores";
  import ContentContainer from "@statsparrot/web-common/components/layout/ContentContainer.svelte";
  import ReportHistoryTable from "@statsparrot/web-admin/features/scheduled-reports/history/ReportHistoryTable.svelte";
  import ReportMetadata from "@statsparrot/web-admin/features/scheduled-reports/metadata/ReportMetadata.svelte";

  $: organization = $page.params.organization;
  $: project = $page.params.project;
  $: report = $page.params.report;
</script>

<ContentContainer>
  <div class="flex justify-center">
    <div class="w-[960px] flex flex-col items-start gap-y-9">
      <ReportMetadata {organization} {project} {report} />
      <ReportHistoryTable {report} />
    </div>
  </div>
</ContentContainer>
