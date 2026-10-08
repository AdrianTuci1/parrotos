<script lang="ts">
  import DeveloperChat from "@statsparrot/web-common/features/chat/DeveloperChat.svelte";
  import Navigation from "@statsparrot/web-common/layout/navigation/Navigation.svelte";
</script>

<div class="flex flex-1 overflow-hidden">
  <Navigation showFooterLinks={false} />
  <section class="flex flex-1 overflow-hidden">
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>
    <DeveloperChat />
  </section>
</div>
