<script lang="ts">
  import { EntityStatus } from "@statsparrot/web-common/features/entity-management/types";

  export let size: string | number = "1em";
  export let status: EntityStatus = EntityStatus.Idle;
  export let duration = 500;

  $: idle = status === EntityStatus.Idle;

  // The matrix pattern is drawn on a 45×40 unit grid, so `size` is the width
  // and the height follows the bars' 40-unit extent.
  $: side = typeof size === "number" ? `${size}px` : size;
  $: unit = `calc(${side} / 45)`;
</script>

{#if idle}
  <div
    class="status bg-gradient-to-b from-primary-500 to-secondary-500"
    style:width={side}
    style:height={side}
    aria-hidden="true"
  ></div>
{:else}
  <div
    class="loader"
    style:--unit={unit}
    style:--duration="{duration * 2}ms"
    aria-hidden="true"
  ></div>
{/if}

<style>
  .status {
    border-radius: 50%;
    border-color: currentColor;
  }

  .loader {
    --color-1: #0000;

    width: calc(45 * var(--unit));
    height: calc(40 * var(--unit));
    background:
      linear-gradient(
        var(--color-1) calc(1 * 100% / 6),
        currentColor 0 calc(3 * 100% / 6),
        var(--color-1) 0
      ),
      linear-gradient(
        var(--color-1) calc(2 * 100% / 6),
        currentColor 0 calc(4 * 100% / 6),
        var(--color-1) 0
      ),
      linear-gradient(
        var(--color-1) calc(3 * 100% / 6),
        currentColor 0 calc(5 * 100% / 6),
        var(--color-1) 0
      );
    background-size: calc(10 * var(--unit)) 400%;
    background-repeat: no-repeat;
    animation: matrix var(--duration) infinite linear;
  }

  @keyframes matrix {
    0% {
      background-position:
        0% 100%,
        50% 100%,
        100% 100%;
    }
    100% {
      background-position:
        0% 0%,
        50% 0%,
        100% 0%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loader {
      animation: none;
      background-position:
        0% 50%,
        50% 50%,
        100% 50%;
    }
  }
</style>
