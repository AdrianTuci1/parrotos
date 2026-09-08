<script lang="ts">
  import type { EditorView } from "@codemirror/view";
  import { setLineStatuses } from "@statsparrot/web-common/components/editor/line-status";
  import { clearMostRecentExploreState } from "@statsparrot/web-common/features/dashboards/state-managers/loaders/most-recent-explore-state";
  import { metricsExplorerStore } from "@statsparrot/web-common/features/dashboards/stores/dashboard-stores";
  import { clearExploreSessionStore } from "@statsparrot/web-common/features/dashboards/state-managers/loaders/explore-web-view-store";
  import Editor from "@statsparrot/web-common/features/editor/Editor.svelte";
  import { FileArtifact } from "@statsparrot/web-common/features/entity-management/file-artifact";
  import { mapParseErrorToLine } from "@statsparrot/web-common/features/metrics-views/errors";
  import { yaml } from "@codemirror/lang-yaml";
  import type { V1ParseError } from "@statsparrot/web-common/runtime-client";

  export let exploreName: string;
  export let fileArtifact: FileArtifact;
  export let autoSave: boolean;
  export let parseError: V1ParseError | undefined = undefined;

  $: ({ remoteContent } = fileArtifact);

  let editor: EditorView;

  /** If the parse error changes, update the editor gutter. */
  $: lineStatus = mapParseErrorToLine(parseError, $remoteContent ?? "");
  $: if (editor) setLineStatuses(lineStatus ? [lineStatus] : [], editor);
</script>

<Editor
  bind:autoSave
  bind:editor
  onSave={(content) => {
    // Remove the explorer entity so that everything is reset to defaults next time user navigates to it
    metricsExplorerStore.remove(exploreName);
    // Reset local persisted dashboard state for the metrics view
    clearExploreSessionStore(exploreName, undefined);
    clearMostRecentExploreState(exploreName, undefined);

    if (!content?.length) {
      setLineStatuses([], editor);
    }
  }}
  {fileArtifact}
  extensions={[yaml()]}
/>
