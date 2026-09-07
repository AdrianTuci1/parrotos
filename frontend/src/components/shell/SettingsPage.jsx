import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { WorkspaceSettingsView } from "@/components/shell/WorkspaceSettingsView";
import { OrganizationOrganizationsView } from "@/components/shell/OrganizationOrganizationsView";
import { ProfileSettingsView } from "@/components/shell/ProfileSettingsView";
import { NotificationSettingsView } from "@/components/shell/NotificationSettingsView";
import { ProjectSettingsView } from "@/components/shell/ProjectSettingsView";
import "@/styles/settings.css";

function ProjectSettingsRoute() {
  const { section } = useParams();
  return <ProjectSettingsView section={section} />;
}

export function SettingsPage() {
  return (
    <SettingsLayout>
      <Routes>
        <Route index element={<Navigate to="/settings/profile" replace />} />
        <Route path="profile" element={<ProfileSettingsView />} />
        <Route path="workspaces" element={<OrganizationOrganizationsView />} />
        <Route path="workspace" element={<Navigate to="/settings/workspace/management" replace />} />
        <Route path="workspace/:tab" element={<WorkspaceSettingsView />} />
        <Route path="notifications" element={<NotificationSettingsView />} />
        <Route path="project" element={<Navigate to="/settings/project/general" replace />} />
        <Route path="project/:section" element={<ProjectSettingsRoute />} />
        <Route path="*" element={<Navigate to="/settings/profile" replace />} />
      </Routes>
    </SettingsLayout>
  );
}
