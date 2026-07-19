import { Routes, Route, Navigate } from "react-router-dom";
import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { WorkspaceSettingsView } from "@/components/shell/WorkspaceSettingsView";
import { OrganizationOrganizationsView } from "@/components/shell/OrganizationOrganizationsView";
import { ProfileSettingsView } from "@/components/shell/ProfileSettingsView";
import { NotificationSettingsView } from "@/components/shell/NotificationSettingsView";
import "@/styles/settings.css";

export function SettingsPage() {
  return (
    <SettingsLayout>
      <Routes>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<ProfileSettingsView />} />
        <Route path="workspaces" element={<OrganizationOrganizationsView />} />
        <Route path="workspace" element={<Navigate to="workspace/management" replace />} />
        <Route path="workspace/:tab" element={<WorkspaceSettingsView />} />
        <Route path="notifications" element={<NotificationSettingsView />} />
        <Route path="*" element={<Navigate to="profile" replace />} />
      </Routes>
    </SettingsLayout>
  );
}
