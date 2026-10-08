<script>
  import ParrotLogoSquareNegative from "@statsparrot/web-common/components/icons/ParrotLogoSquareNegative.svelte";
  import CtaContentContainer from "@statsparrot/web-common/components/calls-to-action/CTAContentContainer.svelte";
  import CtaHeader from "@statsparrot/web-common/components/calls-to-action/CTAHeader.svelte";
  import CtaLayoutContainer from "@statsparrot/web-common/components/calls-to-action/CTALayoutContainer.svelte";
  import CtaMessage from "@statsparrot/web-common/components/calls-to-action/CTAMessage.svelte";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
</script>

<svelte:head>
  <title>{m.auth_cli_success_title()}</title>
</svelte:head>

<CtaLayoutContainer>
  <CtaContentContainer>
    <ParrotLogoSquareNegative size="84px" />
    <CtaHeader>{m.auth_cli_success_title()}</CtaHeader>
    <CtaMessage>{m.auth_cli_success_message()}</CtaMessage>
  </CtaContentContainer>
</CtaLayoutContainer>
