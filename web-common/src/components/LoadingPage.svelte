<script lang="ts">
  import BrandedLoader from "./BrandedLoader.svelte";
  import CtaContentContainer from "./calls-to-action/CTAContentContainer.svelte";
  import CtaLayoutContainer from "./calls-to-action/CTALayoutContainer.svelte";
</script>

<CtaLayoutContainer>
  <CtaContentContainer>
    <div class="mt-10">
      <BrandedLoader />
    </div>
  </CtaContentContainer>
</CtaLayoutContainer>
