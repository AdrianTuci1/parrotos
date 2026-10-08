import { fetchAnalyzeConnectors } from "@statsparrot/web-common/features/connectors/selectors.ts";
import { getLocalRuntimeClient } from "@statsparrot/web-local/lib/runtime-client.ts";

export async function load({ url: { searchParams } }) {
  const client = getLocalRuntimeClient();

  // Fetch connectors and wait for the data to be loaded into cache
  await fetchAnalyzeConnectors(client);

  return {
    schema: searchParams.get("schema") ?? undefined,
  };
}
