import {
  isAuthPage,
  isWelcomePage,
  withinOrganization,
} from "@statsparrot/web-admin/features/navigation/nav-utils.ts";
import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient.ts";
import {
  adminServiceListOrganizations,
  getAdminServiceListOrganizationsQueryKey,
} from "@statsparrot/web-admin/client";
import { isThemeSelectionNeeded } from "@statsparrot/web-common/features/themes/theme-control.ts";
import { redirect, type Page } from "@sveltejs/kit";
import { isEmbedPage } from "@statsparrot/web-common/layout/navigation/navigation-utils.ts";

/**
 * Redirect users through the welcome flow when they have no organizations.
 * Skip for org-specific routes (invite accepts), auth pages, and welcome pages themselves.
 */
export async function maybeRedirectToWelcomePage(route: Page["route"]) {
  if (
    withinOrganization({ route }) ||
    isEmbedPage({ route }) ||
    isAuthPage({ route }) ||
    isWelcomePage({ route })
  ) {
    return;
  }

  const orgListResp = await queryClient.fetchQuery({
    queryKey: getAdminServiceListOrganizationsQueryKey(),
    queryFn: () => adminServiceListOrganizations(),
    staleTime: Infinity,
  });
  // If the user has orgs, skip the welcome flow
  if (orgListResp.organizations?.length) return;

  // If the user has never changed theme then show the theme selection page.
  if (isThemeSelectionNeeded()) throw redirect(307, "/-/welcome/theme");
  // Else show the org creation page, this can be visited during reloads or a revisit to statsparrot without org creation.
  throw redirect(307, "/-/welcome/organization");
}
