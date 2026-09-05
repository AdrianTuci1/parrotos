// React translation of `layout/workspace/WorkspaceHeader.svelte`. The runtime
// bindings (getIconComponent, ConnectorRefresh/AddModel buttons, WorkspaceBreadcrumbs,
// ExplainAndFix) are exposed as `icon` / `breadcrumbs` / `workspaceControls` /
// `cta` props; the inspector & table visibility toggles are driven by the
// framework-agnostic `workspaces` store (bridged via `useReadable`).
import { useState, type ReactNode } from "react";
import { navigationOpen } from "@rilldata/web-common/layout/react/store";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import { HideSidebarIcon } from "@rilldata/web-common/layout/react/icons";
import { workspaces } from "@rilldata/web-common/layout/workspace/workspace-stores";

export default function WorkspaceHeader({
  resourceKind,
  titleInput,
  editable = true,
  showInspectorToggle = true,
  showTableToggle = false,
  hasUnsavedChanges = false,
  filePath,
  showBreadcrumbs = true,
  onTitleChange,
  icon,
  breadcrumbs,
  workspaceControls,
  cta,
}: {
  resourceKind?: string;
  titleInput: string;
  editable?: boolean;
  showInspectorToggle?: boolean;
  showTableToggle?: boolean;
  hasUnsavedChanges?: boolean;
  filePath: string;
  showBreadcrumbs?: boolean;
  onTitleChange?: (title: string) => void;
  icon?: ReactNode;
  breadcrumbs?: ReactNode;
  workspaceControls?: ReactNode;
  cta?: ReactNode;
}) {
  const navOpen = useReadable(navigationOpen) ?? true;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(titleInput);

  const workspaceLayout = workspaces.get<string>(filePath);
  const inspectorVisible =
    useReadable(workspaceLayout.inspector.visible) ?? true;
  const tableVisible = useReadable(workspaceLayout.table.visible) ?? true;

  function handleTitleChange() {
    setEditing(false);
    if (onTitleChange) onTitleChange(value);
  }

  return (
    <header className="flex flex-col py-2 gap-y-2">
      {showBreadcrumbs ? (
        <div
          className={`slide pl-3.5 h-7 flex items-center ${navOpen ? "" : "!pl-10"}`}
        >
          {breadcrumbs ?? <span className="text-fg-muted text-xs">{filePath}</span>}
        </div>
      ) : null}

      <div className="second-level-wrapper px-4 py-2 w-full h-7 flex justify-between gap-x-2 items-center">
        <div
          className={`flex gap-x-1 items-center w-full ${editing ? "" : "truncate"}`}
        >
          <span className="flex-none">{icon}</span>
          {editing || editable === false ? (
            <input
              id="model-title-input"
              className="text-xl font-semibold bg-transparent outline-none w-full"
              value={value}
              disabled={!editable}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleTitleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleChange();
                if (e.key === "Escape") {
                  setValue(titleInput);
                  setEditing(false);
                }
              }}
              data-testid="workspace-title-input"
            />
          ) : (
            <button
              type="button"
              className="text-xl font-semibold truncate flex items-center gap-x-2"
              onClick={() => setEditing(true)}
              data-testid="workspace-title"
            >
              {titleInput}
              {hasUnsavedChanges ? (
                <span className="size-1.5 rounded-full bg-amber-500" />
              ) : null}
            </button>
          )}
        </div>

        <div className="flex items-center gap-x-2 w-fit flex-none">
          {workspaceControls}
          {cta}

          {showTableToggle ? (
            <button
              type="button"
              className="flex flex-none items-center justify-center p-0 aspect-square h-7 w-7 rounded-[2px] align-middle select-none cursor-pointer"
              aria-label="Toggle table visibility"
              aria-pressed={tableVisible}
              onClick={() => workspaceLayout.table.toggle()}
            >
              <HideBottomPaneIcon size="18px" open={tableVisible} />
            </button>
          ) : null}

          {showInspectorToggle ? (
            <button
              type="button"
              className="flex flex-none items-center justify-center p-0 aspect-square h-7 w-7 rounded-[2px]"
              aria-label="Toggle inspector visibility"
              aria-pressed={inspectorVisible}
              onClick={() => workspaceLayout.inspector.toggle()}
            >
              <HideSidebarIcon size="18px" open={inspectorVisible} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function HideBottomPaneIcon({
  size = "1em",
  open = false,
}: {
  size?: string;
  open?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="14" rx="2" />
      {open ? <path d="M3 12h18" /> : <path d="M3 14h18" />}
    </svg>
  );
}
