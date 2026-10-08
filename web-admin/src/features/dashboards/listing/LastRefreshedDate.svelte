<script lang="ts">
  import Tooltip from "@statsparrot/web-common/components/tooltip/Tooltip.svelte";
  import TooltipContent from "@statsparrot/web-common/components/tooltip/TooltipContent.svelte";
  import { createRuntimeServiceGetExplore } from "@statsparrot/web-common/runtime-client";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { timeAgo } from "@statsparrot/web-common/lib/time/relative-time";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";

  export let dashboard: string;

  const runtimeClient = useRuntimeClient();

  $: lastRefreshedQuery = createRuntimeServiceGetExplore(
    runtimeClient,
    { name: dashboard },
    {
      query: {
        select: (data) => {
          const refreshDate =
            data?.metricsView?.metricsView?.state?.dataRefreshedOn;
          return refreshDate ? new Date(refreshDate) : null;
        },
      },
    },
  );
  $: ({ data } = $lastRefreshedQuery);
</script>

{#if data}
  <Tooltip distance={8}>
    <div class="text-[11px] text-fg-secondary">
      {m.dashboard_last_refreshed_ago({ time: timeAgo(data) })}
    </div>
    <TooltipContent slot="tooltip-content">
      {data.toLocaleString()}
    </TooltipContent>
  </Tooltip>
{/if}
