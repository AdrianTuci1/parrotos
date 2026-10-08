<script lang="ts">
  import InputLabel from "@statsparrot/web-common/components/forms/InputLabel.svelte";
  import MultiIconSelector from "@statsparrot/web-common/components/forms/MultiIconSelector.svelte";
  import Delta from "@statsparrot/web-common/components/icons/Delta.svelte";
  import DeltaPercentage from "@statsparrot/web-common/components/icons/DeltaPercentage.svelte";
  import { type ComponentComparisonOptions } from "@statsparrot/web-common/features/canvas/components/types";
  import type { ComponentType, SvelteComponent } from "svelte";
  import { RotateCcw } from "lucide-svelte";

  export let key: string;
  export let label: string;
  export let options: string[] | undefined;
  export let onChange: (options: string[]) => void;

  const comparisonOptions: {
    id: ComponentComparisonOptions;
    Icon: ComponentType<SvelteComponent>;
    tooltip: string;
  }[] = [
    {
      id: "delta",
      Icon: Delta,
      tooltip: "Show absolute change",
    },
    {
      id: "percent_change",
      Icon: DeltaPercentage,
      tooltip: "Show percentage change",
    },
    {
      id: "previous",
      Icon: RotateCcw,
      tooltip: "Show previous value",
    },
  ];
</script>

<div class="flex flex-col gap-y-2">
  <InputLabel small {label} id={key} faint={!options} />

  <MultiIconSelector
    small
    expand
    fields={comparisonOptions}
    selected={options || []}
    onChange={(options) => onChange(options)}
  />
</div>
