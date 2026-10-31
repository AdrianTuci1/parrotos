<div class="flex size-full overflow-hidden bg-surface-subtle">
  <div class="scroll">
    <div class="wrapper column p-10 2xl:py-16">
      <slot />
    </div>
  </div>
</div>

<style lang="postcss">
  .scroll {
    @apply size-full overflow-x-hidden overflow-y-auto;
  }

  .wrapper {
    @apply w-full h-fit min-h-screen;
  }

  .column {
    @apply flex flex-col items-center gap-y-6;
  }
</style>
