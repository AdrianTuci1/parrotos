<script lang="ts">
  import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@statsparrot/web-common/components/alert-dialog";
  import { Button } from "@statsparrot/web-common/components/button";
  import CloudIcon from "@statsparrot/web-common/components/icons/CloudIcon.svelte";
  import Tooltip from "@statsparrot/web-common/components/tooltip/Tooltip.svelte";
  import TooltipContent from "@statsparrot/web-common/components/tooltip/TooltipContent.svelte";

  export let isLoading: boolean;
  export let onConfirm: () => void;

  let open = false;
  function onRedeploy() {
    open = false;
    onConfirm();
  }
</script>

<AlertDialog bind:open>
  <AlertDialogTrigger>
    {#snippet child({ props })}
      <Tooltip distance={8}>
        <Button {...props} loading={isLoading} type="secondary">
          <CloudIcon size="16px" />
          Update
        </Button>
        <TooltipContent slot="tooltip-content">
          Push changes to Parrot Cloud
        </TooltipContent>
      </Tooltip>
    {/snippet}
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Push updates to Parrot Cloud?</AlertDialogTitle>
      <AlertDialogDescription>
        <div class="mt-1">
          Would you like to send local changes to the deployed version of this
          project?
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <Button
        type="tertiary"
        onClick={() => {
          open = false;
        }}
      >
        Cancel
      </Button>
      <Button type="primary" onClick={onRedeploy}>Yes, update</Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
