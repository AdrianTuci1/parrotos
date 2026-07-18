import { Routes, Route, Navigate } from "react-router-dom";
import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { OrganizationSettingsView } from "@/components/shell/OrganizationSettingsView";
import { OrganizationBillingView } from "@/components/shell/OrganizationBillingView";
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
        <Route path="billing" element={<OrganizationBillingView />} />
        <Route path="workspace" element={<OrganizationSettingsView />} />
        <Route path="notifications" element={<NotificationSettingsView />} />
        <Route path="*" element={<Navigate to="profile" replace />} />
      </Routes>
    </SettingsLayout>
  );
}
