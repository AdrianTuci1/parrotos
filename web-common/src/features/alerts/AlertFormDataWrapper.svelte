<script lang="ts">
  import { createAdminServiceGetCurrentUser } from "@statsparrot/web-admin/client";
  import { useRuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
  import {
    getAlertDashboardName,
    unwrapQueryData,
    useAlertDashboardState,
  } from "@statsparrot/web-admin/features/alerts/selectors.ts";
  import { useExploreValidSpec } from "@statsparrot/web-common/features/explores/selectors.ts";
  import { useExploreState } from "@statsparrot/web-common/features/dashboards/stores/dashboard-stores.ts";
  import { getNewAlertInitialFormValues } from "@statsparrot/web-common/features/alerts/create-alert-utils.ts";
  import { getExistingAlertInitialFormValues } from "@statsparrot/web-common/features/alerts/extract-alert-form-values.ts";
  import AlertForm, {
    type CreateAlertProps,
    type EditAlertProps,
  } from "@statsparrot/web-common/features/alerts/AlertForm.svelte";
  import { derived } from "svelte/store";

  export let onClose: () => void;
  export let onCancel: () => void;
  export let props: CreateAlertProps | EditAlertProps;

  const user = createAdminServiceGetCurrentUser();
  const runtimeClient = useRuntimeClient();

  $: exploreName =
    props.mode === "create"
      ? props.exploreName
      : getAlertDashboardName(props.alertSpec);

  $: validExploreSpec = useExploreValidSpec(runtimeClient, exploreName);
  $: exploreSpec = $validExploreSpec.data?.explore ?? {};
  $: metricsViewName = exploreSpec.metricsView ?? "";

  const exploreStateStore =
    props.mode === "create"
      ? useExploreState(props.exploreName)
      : unwrapQueryData(useAlertDashboardState(runtimeClient, props.alertSpec));

  const initialValuesStore = derived(
    [exploreStateStore, user],
    ([exploreState, userResp]) => {
      if (
        userResp.isPending ||
        !exploreState ||
        Object.keys(exploreState).length === 0
      )
        return {
          isLoading: true,
          data: undefined,
        };

      const initialValues =
        props.mode === "create"
          ? getNewAlertInitialFormValues(
              metricsViewName,
              exploreName,
              exploreState,
              $user.data?.user,
            )
          : getExistingAlertInitialFormValues(props.alertSpec, metricsViewName);

      return {
        isLoading: false,
        data: initialValues,
      };
    },
  );
  $: ({ data: initialValues, isLoading } = $initialValuesStore);
</script>

{#if !isLoading && initialValues}
  <AlertForm {props} {initialValues} {onClose} {onCancel} />
{/if}
