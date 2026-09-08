<!-- This page is for cases when user authorised the github app on another github account which doesn't have access to the repo  -->
<script lang="ts">
  import { redirectToGithubLogin } from "@statsparrot/web-admin/client/redirect-utils";
  import GithubRepoInline from "@statsparrot/web-admin/features/projects/github/GithubRepoInline.svelte";
  import GithubUserInline from "@statsparrot/web-admin/features/projects/github/GithubUserInline.svelte";
  import CtaButton from "@statsparrot/web-common/components/calls-to-action/CTAButton.svelte";
  import CtaContentContainer from "@statsparrot/web-common/components/calls-to-action/CTAContentContainer.svelte";
  import CtaHeader from "@statsparrot/web-common/components/calls-to-action/CTAHeader.svelte";
  import CtaLayoutContainer from "@statsparrot/web-common/components/calls-to-action/CTALayoutContainer.svelte";
  import CtaMessage from "@statsparrot/web-common/components/calls-to-action/CTAMessage.svelte";
  import GithubFail from "@statsparrot/web-common/components/icons/GithubFail.svelte";
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";

  const urlParams = new URLSearchParams(window.location.search);
  const remote = urlParams.get("remote");
  const redirect = urlParams.get("redirect");
  const githubUsername = urlParams.get("githubUsername");
</script>

<svelte:head>
  <title>{m.github_could_not_connect()}</title>
</svelte:head>

<CtaLayoutContainer>
  <CtaContentContainer>
    <GithubFail />
    <CtaHeader>{m.github_could_not_connect()}</CtaHeader>
    <CtaMessage>
      {m.github_no_access_account()}
      <GithubUserInline {githubUsername} />
      {m.github_no_access_to()}
      <GithubRepoInline gitRemote={remote} />.
    </CtaMessage>
    <CtaMessage>
      {m.github_click_to_reauthorize()}
    </CtaMessage>
    <CtaButton
      variant="primary"
      onClick={() => redirectToGithubLogin(remote, redirect, "auth")}
    >
      {m.github_connect_to_github()}
    </CtaButton>
  </CtaContentContainer>
</CtaLayoutContainer>
