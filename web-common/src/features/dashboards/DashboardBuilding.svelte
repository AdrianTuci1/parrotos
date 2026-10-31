<script lang="ts">
  import CtaContentContainer from "@statsparrot/web-common/components/calls-to-action/CTAContentContainer.svelte";
  import CtaHeader from "@statsparrot/web-common/components/calls-to-action/CTAHeader.svelte";
  import CtaLayoutContainer from "@statsparrot/web-common/components/calls-to-action/CTALayoutContainer.svelte";
  import CtaNeedHelp from "@statsparrot/web-common/components/calls-to-action/CTANeedHelp.svelte";
  import BrandedLoader from "@statsparrot/web-common/components/BrandedLoader.svelte";

  export let multipleDashboards: boolean = false;
</script>

<CtaLayoutContainer>
  <CtaContentContainer>
    <div class="flex h-36 items-center">
      <BrandedLoader
        size="72px"
        label={multipleDashboards
          ? "Building your dashboards"
          : "Building your dashboard"}
      />
    </div>
    <CtaHeader variant="bold">
      Hang tight! We're building your dashboard{multipleDashboards
        ? "s"
        : ""}...
    </CtaHeader>
    <CtaNeedHelp />
  </CtaContentContainer>
</CtaLayoutContainer>
