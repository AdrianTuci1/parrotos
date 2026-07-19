import { useParams } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { WorkspaceManagementView } from "@/components/shell/WorkspaceManagementView";
import { WorkspaceLimitsView } from "@/components/shell/WorkspaceLimitsView";
import { WorkspaceApiTokensView } from "@/components/shell/WorkspaceApiTokensView";
import { WorkspaceUsageBillingView } from "@/components/shell/WorkspaceUsageBillingView";

export function WorkspaceSettingsView() {
  const { tab } = useParams();
  const { currentOrganization } = useAppStore();
  const hasOrg = Boolean(currentOrganization?.id && currentOrganization.id !== "__empty__");

  if (!hasOrg) {
    return (
      <div className="workspace-page">
        <div className="workspace-placeholder">
          Select a workspace from the sidebar to manage its settings.
        </div>
      </div>
    );
  }

  switch (tab) {
    case "management":
      return <WorkspaceManagementView />;
    case "limits":
      return <WorkspaceLimitsView />;
    case "api-tokens":
      return <WorkspaceApiTokensView />;
    case "billing":
      return <WorkspaceUsageBillingView />;
    default:
      return <WorkspaceManagementView />;
  }
}
