import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { WorkspaceSettingsHeader } from "@/components/shell/workspace-settings/WorkspaceSettingsHeader";
import { MembersTab } from "@/components/shell/workspace-settings/management-tabs";

export function WorkspaceManagementView() {
  const currentOrganization = useAppStore((state) => state.currentOrganization);

  useEffect(() => {
    if (currentOrganization?.id && currentOrganization.id !== "__empty__") {
      useAppStore.getState().fetchMembers(currentOrganization.id).catch(() => {});
    }
  }, [currentOrganization?.id]);

  return (
    <div className="workspace-page">
      <WorkspaceSettingsHeader
        title="Workspace Management"
        currentOrganization={currentOrganization}
        docsHref="https://docs.sentrydata.com/workspaces"
      />
      <MembersTab />
    </div>
  );
}
