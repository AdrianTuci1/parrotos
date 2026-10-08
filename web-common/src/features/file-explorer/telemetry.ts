import { page } from "$app/stores";
import { fileArtifacts } from "@statsparrot/web-common/features/entity-management/file-artifacts";
import {
  MetricsEventScreenName,
  ResourceKindToScreenMap,
} from "@statsparrot/web-common/metrics/service/MetricsTypes";
import { get } from "svelte/store";

export function getScreenNameFromPage() {
  const file = get(page).params.file;
  if (!file) return MetricsEventScreenName.Unknown;
  const fileArtifact = fileArtifacts.getFileArtifact(file);
  const resName = get(fileArtifact.resourceName);
  if (!resName?.kind) return MetricsEventScreenName.Unknown;
  return (
    (ResourceKindToScreenMap[resName.kind] as MetricsEventScreenName) ??
    MetricsEventScreenName.Unknown
  );
}
