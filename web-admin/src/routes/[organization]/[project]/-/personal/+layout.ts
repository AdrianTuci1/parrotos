import { VirtualFileIo } from "@statsparrot/web-admin/features/personal-files/virtual-file-io.ts";

export const load = async ({ params: { organization, project } }) => {
  const fileIo = new VirtualFileIo(organization, project);

  return { fileIo };
};
