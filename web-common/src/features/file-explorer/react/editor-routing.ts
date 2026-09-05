// React-port of `layout/navigation/editor-routing.ts`. The Svelte original uses
// SvelteKit's `goto`/`$app/navigation`; the React port keeps the pure path
// builders so the file-explorer tree can navigate without a SvelteKit router.
// `editorRoutePrefix` is empty in the web-local (Rill Developer) context, which
// is the configuration the sentry-data React app uses.

export const editorRoutePrefix = "";

export function withEditorPrefix(path: string): string {
  return `${editorRoutePrefix}${path}`;
}

export function getFileHref(filePath: string, view?: string): string {
  return withEditorPrefix(`/files${filePath}${view ? `?view=${view}` : ""}`);
}

export function getHomeHref(): string {
  return withEditorPrefix("/");
}

export function navigateToFileHref(filePath: string): string {
  return getFileHref(filePath);
}

export function navigateToExploreHref(name: string): string {
  return withEditorPrefix(`/explore/${name}`);
}

export function navigateToCanvasHref(name: string): string {
  return withEditorPrefix(`/canvas/${name}`);
}
