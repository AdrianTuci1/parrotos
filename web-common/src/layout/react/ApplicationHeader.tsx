// React translation of `layout/ApplicationHeader.svelte`. The feature-coupled
// pieces (Breadcrumbs, InputWithConfirm project renamer, ExplorePreviewCTAs,
// CanvasPreviewCTAs, DisabledViewAsButton, ChatToggle, DeployProjectCTA,
// LocalAvatarButton) are exposed as `logo`, `tag`, `breadcrumbs`, `title` and
// `actions` props so the shell renders in isolation and is unit-testable; the
// features are wired in the chat / workspace port phases.
import type { ReactNode } from "react";
import Header from "./Header";
import HeaderLogo from "./HeaderLogo";

export interface ApplicationHeaderProps {
  mode: string;
  borderBottom?: boolean;
  logo?: ReactNode;
  tag?: ReactNode;
  breadcrumbs?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
}

export default function ApplicationHeader({
  mode,
  borderBottom = true,
  logo,
  tag,
  breadcrumbs,
  title,
  actions,
}: ApplicationHeaderProps) {
  return (
    <Header borderBottom={borderBottom}>
      {logo ?? (
        <HeaderLogo href={mode === "Preview" ? "/dashboards" : "/"} />
      )}

      {tag ?? (
        <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-fg-muted">
          {mode}
        </span>
      )}

      <div className="flex items-center min-w-0 flex-1">
        {breadcrumbs ?? title}
      </div>

      <div className="flex gap-x-2 items-center ml-auto">{actions}</div>
    </Header>
  );
}
