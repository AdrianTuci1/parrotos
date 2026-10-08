import { getSingleUseUrlParam } from "@statsparrot/web-admin/features/navigation/getSingleUseUrlParam";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ url }) => {
  const showUpgradeDialog = !!getSingleUseUrlParam(
    url as URL,
    "upgrade",
    "statsparrot:app:showUpgrade",
  );
  return {
    showUpgradeDialog,
  };
};
