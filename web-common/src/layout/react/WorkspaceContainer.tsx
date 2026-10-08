// React translation of `layout/workspace/WorkspaceContainer.svelte`. The Svelte
// `header` / `body` / `inspector` slots become `header`, `body` (or `children`)
// and `inspectorContent` props; `inspector` toggles the inspector surface. The
// Svelte `contentRect` resize binding is passed in as `width`/`height` for
// consumers that need it.
import type { ReactNode } from "react";

export default function WorkspaceContainer({
  inspector = true,
  width = 0,
  height = 0,
  header,
  body,
  inspectorContent,
  children,
}: {
  inspector?: boolean;
  width?: number;
  height?: number;
  header?: ReactNode;
  body?: ReactNode;
  inspectorContent?: ReactNode;
  children?: ReactNode;
}) {
  void width;
  void height;
  return (
    <main className="flex flex-col size-full overflow-hidden bg-gray-100/80 dark:bg-gray-100/40">
      {header ? <header className="w-full h-fit">{header}</header> : null}
      <div className="h-full w-full flex overflow-hidden p-4 pt-0">
        <div className="w-full h-full overflow-hidden">{body ?? children}</div>
        {inspector && inspectorContent ? inspectorContent : null}
      </div>
    </main>
  );
}
