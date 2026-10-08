import { openQuery } from "@statsparrot/web-common/features/explore-mappers/open-query";
import { getLocalRuntimeClient } from "../../../../lib/runtime-client";
import { getQueryFromUrl } from "@statsparrot/web-common/features/chat/core/citation-url-utils.ts";

export async function load({ url }) {
  const query = getQueryFromUrl(url);

  await openQuery({
    mapArgs: { query },
    client: getLocalRuntimeClient(),
  });
}
