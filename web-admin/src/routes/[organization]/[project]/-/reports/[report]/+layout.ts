import { ResourceKind } from "@statsparrot/web-common/features/entity-management/resource-selectors.js";
import { connectCodeToHTTPStatus } from "@statsparrot/web-common/lib/errors";
import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient.js";
import { getRuntimeServiceGetResourceQueryOptions } from "@statsparrot/web-common/runtime-client";
import { error } from "@sveltejs/kit";
import { ConnectError } from "@connectrpc/connect";
import { getCloudRuntimeClient } from "@statsparrot/web-admin/lib/runtime-client";

export async function load({ params, parent }) {
  const { runtime } = await parent();
  const client = getCloudRuntimeClient(runtime);

  const reportData = await queryClient
    .fetchQuery(
      getRuntimeServiceGetResourceQueryOptions(client, {
        name: { kind: ResourceKind.Report, name: params.report },
      }),
    )
    .catch((e) => {
      const ce = ConnectError.from(e);
      throw error(connectCodeToHTTPStatus(ce.code), ce.rawMessage);
    });

  return {
    report: reportData.resource,
  };
}
