// React translation of `layout/workspace/WorkspaceEditorContainer.svelte`. The
// runtime error derivation (`createRootCauseErrorQuery`, `V1Resource`) and the
// ExplainAndFix error button are deferred to the runtime-bound phase; the
// component reproduces the bordered editor surface plus the error banner.
import type { ReactNode } from "react";
import { AlertIcon } from "@rilldata/web-common/features/file-explorer/react/icons";

export default function WorkspaceEditorContainer({
  error,
  showError = true,
  remoteContent,
  filePath,
  children,
}: {
  error?: string | undefined;
  showError?: boolean;
  remoteContent?: string | null | undefined;
  filePath?: string | undefined;
  children?: ReactNode;
}) {
  const effectiveShowError =
    showError && (remoteContent === undefined || !!remoteContent);

  return (
    <div className="flex flex-col size-full gap-y-1 bg-surface-subtle rounded-[2px] border overflow-hidden">
      <div className="size-full relative overflow-hidden flex flex-col items-center justify-center">
        {children}
      </div>

      {error && effectiveShowError ? (
        <div
          role="status"
          className="border border-destructive bg-destructive/15 text-fg-primary border-l-4 px-2 py-5 max-h-72 overflow-auto"
        >
          <div className="flex gap-x-2">
            <AlertIcon
              className="text-destructive flex-shrink-0 mt-0.5"
              size="16px"
            />
            <div className="flex flex-col gap-2 min-w-0">
              <span className="break-words">{error}</span>
              {filePath ? (
                <span className="text-xs text-fg-muted">
                  Fix the error and re-run reconciliation.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
