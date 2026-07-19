import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { WorkspaceSettingsHeader } from "@/components/shell/workspace-settings/WorkspaceSettingsHeader";
import { MembersTab } from "@/components/shell/workspace-settings/management-tabs";

export function WorkspaceManagementView() {
  const { currentOrganization, fetchMembers } = useAppStore();

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchMembers(currentOrganization.id).catch(() => {});
    }
  }, [currentOrganization?.id, fetchMembers]);

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
