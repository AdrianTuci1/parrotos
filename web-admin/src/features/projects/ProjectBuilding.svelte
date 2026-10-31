<script lang="ts">
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import { page } from "$app/stores";
  import CtaContentContainer from "@statsparrot/web-common/components/calls-to-action/CTAContentContainer.svelte";
  import CtaHeader from "@statsparrot/web-common/components/calls-to-action/CTAHeader.svelte";
  import CtaLayoutContainer from "@statsparrot/web-common/components/calls-to-action/CTALayoutContainer.svelte";
  import CtaNeedHelp from "@statsparrot/web-common/components/calls-to-action/CTANeedHelp.svelte";
  import BrandedLoader from "@statsparrot/web-common/components/BrandedLoader.svelte";
  import { isEmbedPage } from "@statsparrot/web-common/layout/navigation/navigation-utils.ts";

  export let branch: string | undefined = undefined;

  const onEmbedPage = isEmbedPage($page);
</script>

<CtaLayoutContainer>
  <CtaContentContainer>
    <div class="flex h-36 items-center">
      <BrandedLoader size="72px" label={m.project_deploying()} />
    </div>
    <CtaHeader variant="bold">
      {#if branch}
        {m.project_starting_branch_deployment()}
      {:else}
        {m.project_deploying()}
      {/if}
    </CtaHeader>
    {#if !onEmbedPage}
      <CtaNeedHelp />
    {/if}
  </CtaContentContainer>
</CtaLayoutContainer>
