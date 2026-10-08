import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors";
import {
  openFileUploadDialog,
  uploadFile,
} from "@statsparrot/web-common/features/sources/modal/file-upload";
import { compileLocalFileSourceYAML } from "@statsparrot/web-common/features/sources/sourceUtils";
import type { RuntimeClient } from "@statsparrot/web-common/runtime-client/v2";
import {
  getRuntimeServiceGetInstanceQueryKey,
  runtimeServiceCreateTrigger,
  runtimeServiceGetInstance,
  runtimeServicePutFile,
} from "@statsparrot/web-common/runtime-client";
import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient";

export async function refreshSource(
  connector: string,
  filePath: string,
  sourceName: string,
  client: RuntimeClient,
) {
  if (connector !== "local_file") {
    return runtimeServiceCreateTrigger(client, {
      resources: [{ kind: ResourceKind.Source, name: sourceName }],
    });
  }

  // different logic for the file connector
  return replaceSourceWithUploadedFile(client, filePath);
}

export async function replaceSourceWithUploadedFile(
  client: RuntimeClient,
  filePath: string,
) {
  const files = await openFileUploadDialog(false);
  if (!files.length) return Promise.reject();

  const dataFilePath = await uploadFile(client, files[0]);
  if (dataFilePath === null || dataFilePath === undefined) {
    return Promise.reject();
  }

  // Get the default OLAP connector for the output block
  const runtimeInstance = await queryClient.fetchQuery({
    queryKey: getRuntimeServiceGetInstanceQueryKey(client.instanceId, {}),
    queryFn: () => runtimeServiceGetInstance(client, { sensitive: false }),
  });
  const defaultOLAP = runtimeInstance?.instance?.olapConnector || "duckdb";

  const yaml = compileLocalFileSourceYAML(dataFilePath, defaultOLAP);

  // Create source
  return runtimeServicePutFile(client, {
    path: filePath,
    blob: yaml,
  });
}
