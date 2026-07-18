import { useParams } from "react-router-dom";
import { WorkspaceManagementView } from "@/components/shell/WorkspaceManagementView";
import { WorkspaceLimitsView } from "@/components/shell/WorkspaceLimitsView";
import { WorkspaceApiTokensView } from "@/components/shell/WorkspaceApiTokensView";
import { WorkspaceUsageBillingView } from "@/components/shell/WorkspaceUsageBillingView";

export function WorkspaceSettingsView() {
  const { tab } = useParams();

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
