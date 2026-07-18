import { ExternalLink } from "lucide-react";
import { stringToGradient } from "./utils";

export function WorkspaceSettingsHeader({ title, currentOrganization, docsHref = "https://docs.sentrydata.com", actions = null }) {
  return (
    <div className="workspace-page-header">
      <div className="workspace-page-header-left">
        <div
          className="settings-scope-avatar"
          style={{
            background: stringToGradient(currentOrganization?.id),
            width: 28,
            height: 28,
            borderRadius: 9999,
          }}
        />
        <div>
          <h1 className="workspace-page-title">
            {currentOrganization?.name || "Workspace"}{" "}
            <span className="workspace-page-title-divider">/</span> {title}
          </h1>
        </div>
      </div>
      <div className="workspace-page-header-actions">
        <a
          href={docsHref}
          target="_blank"
          rel="noreferrer"
          className="workspace-page-docs-link"
        >
          <ExternalLink size={14} />
          Docs
        </a>
        {actions}
      </div>
    </div>
  );
}
