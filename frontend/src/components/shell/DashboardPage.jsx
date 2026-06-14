import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { AnalyticsView } from "@/components/shell/AnalyticsView";
import { IntegrationsView } from "@/components/shell/IntegrationsView";
import { DestinationsView } from "@/components/shell/DestinationsView";
import { StorageView } from "@/components/shell/StorageView";
import { GraphView } from "@/components/shell/GraphView";
import { SettingsView } from "@/components/shell/SettingsView";
import { ChatView } from "@/components/shell/ChatView";
import { CreateProjectView } from "@/components/shell/CreateProjectView";
import { OrganizationHomeView } from "@/components/shell/OrganizationHomeView";
import { OrganizationOrganizationsView } from "@/components/shell/OrganizationOrganizationsView";
import { OrganizationAccessView } from "@/components/shell/OrganizationAccessView";
import { OrganizationBillingView } from "@/components/shell/OrganizationBillingView";
import { OrganizationSettingsView } from "@/components/shell/OrganizationSettingsView";
import { OrganizationStatsView } from "@/components/shell/OrganizationStatsView";
import { useAppStore } from "@/stores/useAppStore";
import { accountSections, orgSections, projectSections } from "@/components/app-shared";

const sectionComponents = {
  home: OrganizationHomeView,
  organizations: OrganizationOrganizationsView,
  billing: OrganizationBillingView,
  stats: OrganizationStatsView,
  access: OrganizationAccessView,
  "org-settings": OrganizationSettingsView,
  "create-project": CreateProjectView,
  analytics: AnalyticsView,
  sources: IntegrationsView,
  destinations: DestinationsView,
  storage: StorageView,
  graph: GraphView,
  settings: SettingsView,
  chat: ChatView,
};

export function DashboardPage() {
  const { orgSlug, projectSlug, section } = useParams();
  const navigate = useNavigate();

  const { organizations, workspaces, currentOrganization, currentWorkspace, activeSection, setActiveSection } = useAppStore();

  useEffect(() => {
    // 1-segment: /app/:section → account items (sidebar stays in org scope)
    if (section && !orgSlug) {
      if (accountSections.includes(section)) {
        useAppStore.setState({ activeScope: "organization" });
        if (section !== activeSection) setActiveSection(section);
      } else {
        // Might be an org slug without section → redirect
        const org = organizations.find((o) => (o.slug || o.id) === section);
        if (org) {
          const s = useAppStore.getState();
          navigate(`/app/${section}/${s.activeOrganizationSection || 'stats'}`, { replace: true });
        } else {
          navigate("/app/home", { replace: true });
        }
      }
      return;
    }

    // 3 or 4 segments: /app/:orgSlug/...
    if (!section || !orgSlug) { navigate("/app/home", { replace: true }); return; }

    const org = organizations.find((o) => (o.slug || o.id) === orgSlug);
    if (!org) { navigate("/app/home", { replace: true }); return; }

    if (org.id !== currentOrganization?.id) {
      useAppStore.getState().selectOrganization(org.id);
    }

    if (projectSlug) {
      // 4-segment: project
      const proj = workspaces.find((w) => (w.slug || w.id) === projectSlug && w.organizationId === org.id);
      if (proj && proj.id !== currentWorkspace?.id) useAppStore.getState().selectWorkspace(proj.id);
      if (!projectSections.includes(section)) {
        navigate(`/app/${orgSlug}/${projectSlug}/analytics`, { replace: true });
        return;
      }
      useAppStore.setState({ activeScope: "project" });
      if (section !== activeSection) setActiveSection(section);
    } else if (orgSections.includes(section)) {
      // 3-segment: org
      useAppStore.setState({ activeScope: "organization", currentWorkspace: null });
      if (section !== activeSection) setActiveSection(section);
    } else if (accountSections.includes(section)) {
      // Account section with org slug → redirect to bare
      navigate(`/app/${section}`, { replace: true });
    } else {
      navigate(`/app/${orgSlug}/stats`, { replace: true });
    }
  }, [orgSlug, projectSlug, section, organizations.length, workspaces.length]);

  let viewKey = activeSection;
  const scope = useAppStore.getState().activeScope;
  if (activeSection === "settings") {
    viewKey = scope === "organization" ? "org-settings" : "settings";
  }

  const ActiveView = sectionComponents[viewKey] || AnalyticsView;

  return <AppShell><ActiveView /></AppShell>;
}
