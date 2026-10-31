<script lang="ts">
  import ParrotLogoSquareNegative from "./icons/ParrotLogoSquareNegative.svelte";

  export let size = "64px";
  export let label = "Loading";
</script>

<div class="loader" role="status" aria-label={label}>
  <div class="mark">
    <ParrotLogoSquareNegative {size} />
  </div>
  <div class="track" aria-hidden="true">
    <div class="bar"></div>
  </div>
</div>

<style lang="postcss">
  .loader {
    @apply flex flex-col items-center gap-y-5;
  }

  .mark {
    animation: breathe 2.6s ease-in-out infinite;
  }

  .track {
    @apply h-1 w-40 overflow-hidden rounded-full bg-primary-100;
  }

  .bar {
    @apply h-full w-1/2 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500;
    animation: sweep 1.4s ease-in-out infinite;
  }

  @keyframes breathe {
    0%,
    100% {
      opacity: 0.75;
      transform: scale(0.98);
    }
    50% {
      opacity: 1;
      transform: scale(1.04);
    }
  }

  @keyframes sweep {
    0% {
      transform: translateX(-110%);
    }
    100% {
      transform: translateX(220%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mark,
    .bar {
      animation: none;
    }

    .bar {
      @apply w-full;
    }
  }
</style>
