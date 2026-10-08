import ApiIcon from "@statsparrot/web-common/components/icons/APIIcon.svelte";
import AlertIcon from "@statsparrot/web-common/components/icons/AlertIcon.svelte";
import CanvasIcon from "@statsparrot/web-common/components/icons/CanvasIcon.svelte";
import Chart from "@statsparrot/web-common/components/icons/Chart.svelte";
import ExploreIcon from "@statsparrot/web-common/components/icons/ExploreIcon.svelte";
import ReportIcon from "@statsparrot/web-common/components/icons/ReportIcon.svelte";
import TableIcon from "@statsparrot/web-common/components/icons/TableIcon.svelte";
import ThemeIcon from "@statsparrot/web-common/components/icons/ThemeIcon.svelte";
import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors";
import ConnectorIcon from "../../components/icons/ConnectorIcon.svelte";
import MetricsViewIcon from "../../components/icons/MetricsViewIcon.svelte";
import ModelIcon from "@statsparrot/web-common/components/icons/ModelIcon.svelte";
import File from "@statsparrot/web-common/components/icons/File.svelte";
import SettingsIcon from "@statsparrot/web-common/components/icons/SettingsIcon.svelte";
import { isEnvFile } from "@statsparrot/web-common/features/entity-management/actions/protected-files.ts";
import { extractFileExtension } from "@statsparrot/web-common/features/entity-management/file-path-utils";
import { Sheet } from "lucide-svelte";

export const resourceIconMapping = {
  [ResourceKind.Source]: TableIcon,
  [ResourceKind.Connector]: ConnectorIcon,
  [ResourceKind.Model]: ModelIcon,
  [ResourceKind.MetricsView]: MetricsViewIcon,
  [ResourceKind.Explore]: ExploreIcon,
  [ResourceKind.API]: ApiIcon,
  [ResourceKind.Component]: Chart,
  [ResourceKind.Canvas]: CanvasIcon,
  [ResourceKind.Theme]: ThemeIcon,
  [ResourceKind.Report]: ReportIcon,
  [ResourceKind.Alert]: AlertIcon,
};

export const resourceLabelMapping = {
  [ResourceKind.Source]: "Source",
  [ResourceKind.Connector]: "Connector",
  [ResourceKind.Model]: "Model",
  [ResourceKind.MetricsView]: "Metrics View",
  [ResourceKind.Explore]: "Explore",
  [ResourceKind.API]: "API",
  [ResourceKind.Component]: "Component",
  [ResourceKind.Canvas]: "Canvas",
  [ResourceKind.Theme]: "Theme",
  [ResourceKind.Report]: "Report",
  [ResourceKind.Alert]: "Alert",
};

export const resourceShorthandMapping = {
  [ResourceKind.Source]: "source",
  [ResourceKind.Connector]: "connector",
  [ResourceKind.Model]: "model",
  [ResourceKind.MetricsView]: "metrics",
  [ResourceKind.Explore]: "explore",
  [ResourceKind.API]: "API",
  [ResourceKind.Component]: "component",
  [ResourceKind.Canvas]: "canvas",
  [ResourceKind.Theme]: "theme",
  [ResourceKind.Report]: "report",
  [ResourceKind.Alert]: "alert",
};

export function getIconComponent(
  kind: ResourceKind | undefined,
  filePath: string,
) {
  if (kind) {
    return resourceIconMapping[kind];
  }
  if (isEnvFile(filePath) || filePath === "/statsparrot.yaml") {
    return SettingsIcon;
  }
  if (extractFileExtension(filePath) === ".parquet") {
    return Sheet;
  }
  return File;
}
