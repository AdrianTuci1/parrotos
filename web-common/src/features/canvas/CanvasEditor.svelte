<script lang="ts">
  import { yaml } from "@codemirror/lang-yaml";
  import type { EditorView } from "@codemirror/view";
  import { setLineStatuses } from "@statsparrot/web-common/components/editor/line-status";
  import Editor from "@statsparrot/web-common/features/editor/Editor.svelte";
  import { FileArtifact } from "@statsparrot/web-common/features/entity-management/file-artifact";
  import { mapParseErrorToLine } from "@statsparrot/web-common/features/metrics-views/errors";
  import { removeCanvasStore } from "./state-managers/state-managers";
  import type { V1ParseError } from "@statsparrot/web-common/runtime-client";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  export let canvasName: string;
  export let fileArtifact: FileArtifact;
  export let autoSave: boolean;
  export let parseError: V1ParseError | undefined = undefined;

  const runtimeClient = useRuntimeClient();

  $: ({ remoteContent } = fileArtifact);

  let editor: EditorView;

  $: ({ instanceId } = runtimeClient);

  /** If the parse error changes, update the editor gutter. */
  $: lineStatus = mapParseErrorToLine(parseError, $remoteContent ?? "");
  $: if (editor) setLineStatuses(lineStatus ? [lineStatus] : [], editor);
</script>

<Editor
  bind:autoSave
  bind:editor
  onSave={(content) => {
    // Remove the canvas entity so that everything is reset to defaults next time user navigates to it
    removeCanvasStore(canvasName, instanceId);

    // Reset local persisted dashboard state for the metrics view
    if (!content?.length) {
      setLineStatuses([], editor);
    }
  }}
  {fileArtifact}
  extensions={[yaml()]}
/>
