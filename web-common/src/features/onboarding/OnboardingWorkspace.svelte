<script lang="ts">
  import * as DropdownMenu from "@statsparrot/web-common/components/dropdown-menu";
  import { createRuntimeServiceUnpackExampleMutation } from "../../runtime-client";
  import { useRuntimeClient } from "../../runtime-client/v2";
  import GenerateSampleData from "@statsparrot/web-common/features/sample-data/GenerateSampleData.svelte";
  import { resourceIconMapping } from "@statsparrot/web-common/features/entity-management/resource-icon-mapping.ts";
  import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors.ts";
  import { createResourceAndNavigate } from "@statsparrot/web-common/features/entity-management/add/new-files.ts";
  import { EXAMPLES } from "@statsparrot/web-common/features/welcome/constants.ts";
  import { navigateToFile } from "@statsparrot/web-common/layout/navigation/editor-routing";
  import { behaviourEvent } from "@statsparrot/web-common/metrics/initMetrics.ts";
  import {
    BehaviourEventAction,
    BehaviourEventMedium,
  } from "@statsparrot/web-common/metrics/service/BehaviourEventTypes.ts";
  import {
    MetricsEventScreenName,
    MetricsEventSpace,
  } from "@statsparrot/web-common/metrics/service/MetricsTypes.ts";
  import {
    ArrowRightIcon,
    ChevronRightIcon,
    DatabaseIcon,
    LightbulbIcon,
    PresentationIcon,
  } from "lucide-svelte";
  import { waitUntil } from "@statsparrot/web-common/lib/waitUtils.ts";
  import { fileArtifacts } from "@statsparrot/web-common/features/entity-management/file-artifacts.ts";
  import {
    connectorIconMapping,
    connectorLabelMapping,
  } from "@statsparrot/web-common/features/connectors/connector-metadata.ts";
  import { getSupportedTopConnectors } from "@statsparrot/web-common/features/add-data/manager/selectors.ts";
  import { EntityStatus } from "@statsparrot/web-common/features/entity-management/types.ts";
  import Spinner from "@statsparrot/web-common/features/entity-management/Spinner.svelte";
  import AddDataModal from "@statsparrot/web-common/features/add-data/AddDataModal.svelte";

  const runtimeClient = useRuntimeClient();
  const topConnectorsQuery = getSupportedTopConnectors(runtimeClient);
  $: ({ data: topConnectors, isPending } = $topConnectorsQuery);

  let openAddDataDialog = false;
  let selectedAddDataSchema: string | null = null;

  function startConnectorSelection(schema: string | null) {
    selectedAddDataSchema = schema;
    openAddDataDialog = true;
  }

  const unpackExampleProject =
    createRuntimeServiceUnpackExampleMutation(runtimeClient);

  async function unpackProject(example: (typeof EXAMPLES)[number]) {
    await behaviourEvent?.fireSplashEvent(
      example
        ? BehaviourEventAction.ExampleAdd
        : BehaviourEventAction.ProjectEmpty,
      BehaviourEventMedium.Card,
      MetricsEventSpace.Workspace,
      example?.name,
    );

    try {
      await $unpackExampleProject.mutateAsync({
        name: example.name,
        force: true,
      });

      await waitUntil(() => fileArtifacts.hasFileArtifact(example.firstFile));
      await navigateToFile(example.firstFile);
    } catch (err) {
      console.error("Failed to create example project", err);
    }
  }
</script>

<div class="page">
  <div class="shell">
    <header class="intro">
      <div class="eyebrow">New workspace</div>
      <h1>Turn your data into answers</h1>
      <p>Connect a source, explore a demo, or start from a blank model.</p>
    </header>

    <div class="panels">
      <section class="card">
        <div class="card-head">
          <div class="card-title">
            <span class="title-icon"><DatabaseIcon size="16px" /></span>
            <span>Connect your data</span>
          </div>
          <button
            class="see-more"
            onclick={() => startConnectorSelection(null)}
          >
            See more connectors
            <ArrowRightIcon size="14px" />
          </button>
        </div>
        <p class="card-sub">
          Choose a warehouse, bucket, or database to get started.
        </p>

        {#if isPending}
          <div class="connectors-loading">
            <Spinner
              status={EntityStatus.Running}
              size="1.75rem"
              duration={725}
            />
          </div>
        {:else if topConnectors}
          <div class="connectors" role="group" aria-label="Top connectors">
            {#each topConnectors as connector (connector)}
              {@const icon = connectorIconMapping[connector]}
              {@const label = connectorLabelMapping[connector] ?? connector}
              <button
                class="connector"
                onclick={() => startConnectorSelection(connector)}
                aria-label={`Connect to ${connector}`}
              >
                <span class="connector-icon">
                  <svelte:component this={icon} />
                </span>
                <span class="connector-label">{label}</span>
                <span class="connector-chevron">
                  <ChevronRightIcon size="15px" />
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </section>

      <section class="card">
        <div class="card-head">
          <div class="card-title">
            <span class="title-icon"><PresentationIcon size="16px" /></span>
            <span>Start from a template</span>
          </div>
        </div>
        <p class="card-sub">Skip the setup and open a working project.</p>

        <div class="template-actions">
          <GenerateSampleData type="home" />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <button class="action-row" {...props}>
                  <span class="action-icon">
                    <PresentationIcon size="16px" />
                  </span>
                  <span class="action-copy">
                    <span class="action-title">Try demo projects</span>
                    <span class="action-desc">
                      Cost monitoring and GitHub analytics
                    </span>
                  </span>
                  <span class="action-chevron">
                    <ChevronRightIcon size="16px" />
                  </span>
                </button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side="bottom" align="start">
              {#each EXAMPLES as example (example.name)}
                <DropdownMenu.Item onclick={() => unpackProject(example)}>
                  {example.title}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <div class="divider">
          <span class="divider-line"></span>
          <span>or create from scratch</span>
          <span class="divider-line"></span>
        </div>

        <div class="scratch">
          <button
            class="scratch-btn"
            onclick={() =>
              createResourceAndNavigate(runtimeClient, ResourceKind.Model)}
          >
            <svelte:component
              this={resourceIconMapping[ResourceKind.Model]}
              size="14px"
            />
            Create blank model
          </button>
          <button
            class="scratch-btn"
            onclick={() =>
              createResourceAndNavigate(
                runtimeClient,
                ResourceKind.MetricsView,
              )}
          >
            <svelte:component
              this={resourceIconMapping[ResourceKind.MetricsView]}
              size="14px"
            />
            Create a metrics view
          </button>
        </div>
      </section>
    </div>

    <div class="flex flex-row gap-x-8 items-center w-full">
      <div class="h-px grow border"></div>
      <LightbulbIcon class="text-border" size="16px" strokeWidth={3} />
      <div class="h-px grow border"></div>
    </div>

    <div class="flex flex-col mx-auto w-fit gap-y-2 text-xs text-slate-500">
      <div class="font-semibold text-center">
        Tips for data workflow in statsparrot
      </div>
      <ul class="list-decimal">
        <li>Import data – Add or drag files (Parquet, NDJSON, CSV).</li>
        <li>Model sources – Combine and shape data with SQL.</li>
        <li>Define metrics – Create metrics and dimensions.</li>
        <li>Explore insights – Visualize data in interactive dashboards.</li>
      </ul>
    </div>
  </div>
</div>

<AddDataModal
  config={{
    medium: BehaviourEventMedium.Card,
    space: MetricsEventSpace.Workspace,
    screen: MetricsEventScreenName.Home,
  }}
  bind:open={openAddDataDialog}
  schema={selectedAddDataSchema ?? undefined}
/>

<style lang="postcss">
  .page {
    @apply flex size-full justify-center overflow-y-auto px-6 py-10;
    @apply bg-surface-subtle;
  }

  .shell {
    @apply flex w-full max-w-5xl flex-col gap-8;
  }

  .intro {
    @apply flex max-w-2xl flex-col gap-2;
  }

  .eyebrow {
    @apply text-[11px] font-medium uppercase tracking-[0.16em] text-fg-tertiary;
  }

  .intro h1 {
    @apply text-3xl font-semibold tracking-tight text-fg-primary;
  }

  .intro p {
    @apply text-sm text-fg-secondary;
  }

  .panels {
    @apply grid gap-4 xl:grid-cols-2;
  }

  .card {
    @apply flex flex-col rounded-xl border bg-surface-card p-5;
  }

  .card-head {
    @apply flex items-start justify-between gap-3;
  }

  .card-title {
    @apply flex items-center gap-2 text-sm font-semibold text-fg-primary;
  }

  .title-icon {
    @apply flex size-7 items-center justify-center rounded-md;
    @apply bg-accent-primary/10 text-icon-accent;
  }

  .card-sub {
    @apply mt-1 text-xs text-fg-tertiary;
  }

  .see-more {
    @apply flex shrink-0 items-center gap-1 text-xs font-medium text-fg-tertiary;
    @apply transition-colors hover:text-icon-accent;
  }

  .connectors {
    @apply mt-5 grid grid-cols-2 gap-2;
  }

  .connectors-loading {
    @apply flex min-h-36 items-center justify-center;
  }

  .connector {
    @apply flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left;
    @apply bg-surface-overlay text-sm font-medium text-fg-primary;
    @apply transition-colors hover:border-accent-primary/50 hover:bg-surface-hover;
  }

  .connector-icon {
    @apply flex size-8 shrink-0 items-center justify-center rounded-md;
    @apply bg-surface-muted;
  }

  :global(.dark) .connector-icon {
    background-color: #eef0f3;
  }

  .connector-icon :global(svg) {
    @apply size-5;
  }

  .connector-label {
    @apply truncate;
  }

  .connector-chevron {
    @apply ml-auto shrink-0 text-fg-muted transition-transform;
  }

  .connector:hover .connector-chevron {
    @apply translate-x-0.5 text-icon-accent;
  }

  .template-actions {
    @apply mt-5 flex flex-col gap-2;
  }

  .template-actions :global(.button-home) {
    @apply flex min-h-[58px] w-full items-center justify-start gap-3 rounded-lg border px-3 py-2.5;
    @apply bg-surface-overlay text-left text-sm font-medium text-fg-primary;
    @apply transition-colors hover:border-accent-primary/50 hover:bg-surface-hover;
  }

  .template-actions :global(.button-home > svg) {
    @apply size-8 shrink-0 rounded-md bg-accent-primary/10 p-2;
  }

  .action-row {
    @apply flex min-h-[58px] w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left;
    @apply bg-surface-overlay transition-colors hover:border-accent-primary/50 hover:bg-surface-hover;
  }

  .action-icon {
    @apply flex size-8 shrink-0 items-center justify-center rounded-md;
    @apply bg-accent-primary/10 text-icon-accent;
  }

  .action-copy {
    @apply flex min-w-0 flex-col;
  }

  .action-title {
    @apply text-sm font-medium text-fg-primary;
  }

  .action-desc {
    @apply truncate text-xs text-fg-tertiary;
  }

  .action-chevron {
    @apply ml-auto shrink-0 text-fg-muted transition-transform;
  }

  .action-row:hover .action-chevron {
    @apply translate-x-0.5 text-icon-accent;
  }

  .divider {
    @apply my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-fg-muted;
  }

  .divider-line {
    @apply h-px flex-1 bg-border;
  }

  .scratch {
    @apply grid grid-cols-2 gap-2;
  }

  .scratch-btn {
    @apply flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2;
    @apply bg-surface-overlay text-xs font-medium text-fg-secondary;
    @apply transition-colors hover:border-accent-primary/50 hover:bg-surface-hover hover:text-fg-primary;
  }

</style>
