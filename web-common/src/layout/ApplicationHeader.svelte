<script lang="ts">
  import { page } from "$app/stores";
  import Breadcrumbs from "@statsparrot/web-common/components/navigation/breadcrumbs/Breadcrumbs.svelte";
  import type {
    PathOption,
    PathOptions,
  } from "@statsparrot/web-common/components/navigation/breadcrumbs/types";
  import LocalAvatarButton from "@statsparrot/web-common/features/authentication/LocalAvatarButton.svelte";
  import CanvasPreviewCTAs from "@statsparrot/web-common/features/canvas/CanvasPreviewCTAs.svelte";
  import ChatToggle from "@statsparrot/web-common/features/chat/layouts/sidebar/ChatToggle.svelte";
  import {
    developerChatActions,
    developerChatOpen,
  } from "@statsparrot/web-common/features/chat/layouts/sidebar/sidebar-store";
  import { getBreadcrumbOptions } from "@statsparrot/web-common/features/dashboards/dashboard-utils";
  import DisabledViewAsButton from "@statsparrot/web-common/features/dashboards/granular-access-policies/DisabledViewAsButton.svelte";
  import {
    useValidCanvases,
    useValidExplores,
  } from "@statsparrot/web-common/features/dashboards/selectors.js";
  import DeployProjectCTA from "@statsparrot/web-common/features/dashboards/workspace/DeployProjectCTA.svelte";
  import ExplorePreviewCTAs from "@statsparrot/web-common/features/explores/ExplorePreviewCTAs.svelte";
  import { featureFlags } from "@statsparrot/web-common/features/feature-flags.ts";
  import { useProjectTitle } from "@statsparrot/web-common/features/project/selectors";
  import Header from "@statsparrot/web-common/layout/header/Header.svelte";
  import HeaderLogo from "@statsparrot/web-common/layout/header/HeaderLogo.svelte";
  import { isDeployPage } from "@statsparrot/web-common/layout/navigation/route-utils";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { get, readable } from "svelte/store";
  import { parseDocument } from "yaml";
  import InputWithConfirm from "../components/forms/InputWithConfirm.svelte";
  import Tag from "../components/tag/Tag.svelte";
  import { fileArtifacts } from "../features/entity-management/file-artifacts";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors.ts";
  import { addLeadingSlash } from "@statsparrot/web-common/features/entity-management/entity-mappers.ts";

  const { deploy, developerChat, stickyDashboardState } = featureFlags;
  const runtimeClient = useRuntimeClient();

  export let mode: string;

  $: ({
    params: { name: dashboardName, file },
    route,
  } = $page);

  $: onVizRoute = route.id?.includes("explore") || route.id?.includes("canvas");

  $: ({ unsavedFiles } = fileArtifacts);
  $: ({ size: unsavedFileCount } = $unsavedFiles);
  $: onDeployPage = isDeployPage($page);
  $: showDeployCTA = $deploy && !onDeployPage;
  $: showDeveloperChat = $developerChat && !onDeployPage;

  $: fileArtifact = file
    ? fileArtifacts.getFileArtifact(addLeadingSlash(file))
    : undefined;
  $: kindStore = fileArtifact?.inferredResourceKind ?? readable(undefined);
  $: editingDashboard =
    $kindStore === ResourceKind.Canvas || $kindStore === ResourceKind.Explore;

  $: exploresQuery = useValidExplores(runtimeClient);
  $: canvasQuery = useValidCanvases(runtimeClient);
  $: projectTitleQuery = useProjectTitle(runtimeClient);

  $: projectTitle = $projectTitleQuery?.data ?? "Untitled Parrot Project";

  $: explores = $exploresQuery?.data ?? [];
  $: canvases = $canvasQuery?.data ?? [];

  $: defaultDashboard = explores[0] ?? canvases[0] ?? null;

  $: hasValidDashboard = Boolean(defaultDashboard);

  $: dashboardOptions = {
    options: getBreadcrumbOptions(explores, canvases),
    carryOverSearchParams: $stickyDashboardState,
  } satisfies PathOptions;

  $: projectPath = <PathOption>{
    label: projectTitle,
    section: "project",
    depth: -1,
    href: mode === "Preview" ? "/dashboards" : "/",
  };

  $: pathParts = [
    { options: new Map([[projectTitle.toLowerCase(), projectPath]]) },
    dashboardOptions,
  ];

  $: currentPath = [projectTitle, dashboardName?.toLowerCase()];

  async function submitTitleChange(editedTitle: string) {
    const artifact = fileArtifacts.getFileArtifact("/statsparrot.yaml");

    let content = get(artifact.editorContent);

    if (!content) {
      await artifact.fetchContent();
      content = get(artifact.remoteContent);
      if (!content) {
        return;
      }
    }
    const parsed = parseDocument(content);

    parsed.set("display_name", editedTitle);

    artifact.updateEditorContent(parsed.toString(), true);
    await artifact.saveLocalContent();
  }
</script>

<Header borderBottom={!onDeployPage && mode !== "Preview"}>
  {#if !onDeployPage}
    <HeaderLogo href={mode === "Preview" ? "/dashboards" : "/"} />

    <Tag text={mode} color="gray"></Tag>

    {#if mode === "Preview" || onVizRoute}
      {#if $exploresQuery?.data}
        <Breadcrumbs {pathParts} {currentPath} />
      {/if}
    {:else if mode === "Developer"}
      <InputWithConfirm
        size="md"
        bumpDown
        type="Project"
        textClass="font-medium"
        value={projectTitle}
        onConfirm={submitTitleChange}
        showIndicator={unsavedFileCount > 0}
      />
    {/if}
  {/if}

  <div class="flex gap-x-2 items-center ml-auto">
    {#if route.id?.includes("explore")}
      <ExplorePreviewCTAs exploreName={dashboardName} />
    {:else if route.id?.includes("canvas")}
      <CanvasPreviewCTAs canvasName={dashboardName} />
    {:else}
      {#if editingDashboard}
        <DisabledViewAsButton />
      {/if}
      {#if showDeveloperChat}
        <ChatToggle open={developerChatOpen} actions={developerChatActions} />
      {/if}
    {/if}
    {#if showDeployCTA}
      <DeployProjectCTA {hasValidDashboard} />
    {/if}
    <LocalAvatarButton />
  </div>
</Header>
