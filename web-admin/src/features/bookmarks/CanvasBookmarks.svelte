<script lang="ts">
  import Bookmarks from "@statsparrot/web-admin/features/bookmarks/Bookmarks.svelte";
  import { getCanvasCategorisedBookmarks } from "@statsparrot/web-admin/features/bookmarks/selectors.ts";
  import { useCanvas } from "@statsparrot/web-common/features/canvas/selector";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors.ts";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { writable } from "svelte/store";

  export let organization: string;
  export let project: string;
  export let canvasName: string;

  const runtimeClient = useRuntimeClient();

  const orgAndProjectNameStore = writable({ organization, project });
  $: orgAndProjectNameStore.set({ organization, project });

  const canvasNameStore = writable(canvasName);
  $: canvasNameStore.set(canvasName);

  const categorizedBookmarksStore = getCanvasCategorisedBookmarks(
    orgAndProjectNameStore,
    canvasNameStore,
  );

  $: canvasResponse = useCanvas(runtimeClient, canvasName);

  $: metricsViews = $canvasResponse.data?.metricsViews || {};

  $: metricsViewNames = Object.keys(metricsViews);
  $: ({
    data: { bookmarks, categorizedBookmarks },
  } = $categorizedBookmarksStore);
</script>

<Bookmarks
  {organization}
  {project}
  resource={{ name: canvasName, kind: ResourceKind.Canvas }}
  bookmarkData={{
    bookmarks,
    categorizedBookmarks,
    showFiltersOnly: false,
    defaultHomeBookmarkUrl: "?default=true",
  }}
  {metricsViewNames}
/>
