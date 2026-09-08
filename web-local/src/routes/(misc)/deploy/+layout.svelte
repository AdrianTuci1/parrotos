<script lang="ts">
  import CTAContentContainer from "@statsparrot/web-common/components/calls-to-action/CTAContentContainer.svelte";
  import CTALayoutContainer from "@statsparrot/web-common/components/calls-to-action/CTALayoutContainer.svelte";
</script>

<div class="bg-surface-background h-full">
  <CTALayoutContainer>
    <CTAContentContainer>
      <slot />
    </CTAContentContainer>
  </CTALayoutContainer>
</div>
