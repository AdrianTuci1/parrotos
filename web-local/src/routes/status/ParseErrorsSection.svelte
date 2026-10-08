<script lang="ts">
  import ParseErrorsSection from "@statsparrot/web-common/features/resources/ParseErrorsSection.svelte";
  import {
    ResourceKind,
    SingletonProjectParserName,
  } from "@statsparrot/web-common/features/entity-management/resource-selectors";
  import { createRuntimeServiceGetResource } from "@statsparrot/web-common/runtime-client";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  const runtimeClient = useRuntimeClient();

  $: projectParserQuery = createRuntimeServiceGetResource(
    runtimeClient,
    {
      name: {
        kind: ResourceKind.ProjectParser,
        name: SingletonProjectParserName,
      },
    },
    {
      query: {
        refetchOnMount: true,
        refetchOnWindowFocus: true,
      },
    },
  );

  $: parseErrors =
    $projectParserQuery.data?.resource?.projectParser?.state?.parseErrors ?? [];
  $: parserReconcileError =
    $projectParserQuery.data?.resource?.meta?.reconcileError;
</script>

<ParseErrorsSection
  {parseErrors}
  {parserReconcileError}
  isLoading={$projectParserQuery.isLoading}
  isError={$projectParserQuery.isError}
  errorMessage={$projectParserQuery.error?.message ?? ""}
/>
