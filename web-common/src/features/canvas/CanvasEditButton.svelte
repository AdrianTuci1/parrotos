<script lang="ts">
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import { getFileHref } from "@statsparrot/web-common/layout/navigation/editor-routing.ts";
  import { Button } from "@statsparrot/web-common/components/button/index.ts";
  import { useCanvas } from "@statsparrot/web-common/features/canvas/selector.ts";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";

  let { canvasName }: { canvasName: string } = $props();

  const runtimeClient = useRuntimeClient();

  let canvasQuery = $derived(useCanvas(runtimeClient, canvasName));
  let canvasFilePath = $derived($canvasQuery.data?.filePath ?? "");
</script>

<Button type="secondary" href={getFileHref(canvasFilePath)}
  >{m.canvas_edit()}</Button
>
