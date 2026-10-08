import { sessionStorageStore } from "@statsparrot/web-common/lib/store-utils/session-storage.ts";

export function getCanvasModeStore(
  organization: string,
  project: string,
  name: string,
) {
  return sessionStorageStore(
    `app:statsparrot:${organization}:${project}:${name}`,
    "view",
  );
}

export function setCanvasMode(
  organization: string,
  project: string,
  name: string,
  mode: "view" | "edit",
) {
  sessionStorage.setItem(
    `app:statsparrot:${organization}:${project}:${name}`,
    JSON.stringify(mode),
  );
}
