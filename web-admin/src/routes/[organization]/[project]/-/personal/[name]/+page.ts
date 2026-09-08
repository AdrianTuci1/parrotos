import { queryClient } from "@statsparrot/web-common/lib/svelte-query/globalQueryClient.ts";
import {
  adminServiceGetPersonalFile,
  getAdminServiceGetPersonalFileQueryKey,
} from "@statsparrot/web-admin/client";
import { addLeadingSlash } from "@statsparrot/web-common/features/entity-management/entity-mappers.ts";

export const load = async ({ params: { organization, project, name } }) => {
  const personalFile = await queryClient.fetchQuery({
    queryKey: getAdminServiceGetPersonalFileQueryKey(
      organization,
      project,
      name,
    ),
    queryFn: () => adminServiceGetPersonalFile(organization, project, name),
  });

  return {
    personalFile: {
      path: addLeadingSlash(personalFile.path ?? ""),
      yaml: personalFile.yaml ?? "",
    },
  };
};
