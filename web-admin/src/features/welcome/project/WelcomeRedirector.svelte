<script lang="ts">
  import { page } from "$app/state";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import { createRuntimeServiceListFiles } from "@statsparrot/web-common/runtime-client";
  import {
    extractBranchFromPath,
    injectBranchIntoPath,
  } from "@statsparrot/web-admin/features/branches/branch-utils.ts";
  import { goto } from "$app/navigation";
  import { projectWelcomeStatus } from "@statsparrot/web-admin/features/welcome/project/welcome-status.ts";

  const runtimeClient = useRuntimeClient();

  let branch = $derived(extractBranchFromPath(page.url.pathname));
  let { organization, project } = $derived(page.params);

  const filesQuery = createRuntimeServiceListFiles(runtimeClient, {});

  // On cloud, we do not have loader functions for edit sessions so that data is loaded async.
  // So we need this to add a redirect to welcome page.
  $effect(() => {
    if (!$filesQuery.isSuccess) return;
    const hasParrotYaml = $filesQuery.data?.files?.some(
      (file) => file.path === "/statsparrot.yaml",
    );
    if (!hasParrotYaml) {
      projectWelcomeStatus.setProjectWelcomeStep(project, true);
      void goto(
        injectBranchIntoPath(
          `/${organization}/${project}/-/edit/welcome`,
          branch,
        ),
      );
    }
  });
</script>
