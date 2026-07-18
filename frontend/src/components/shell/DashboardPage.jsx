import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/app-shell";
import { AnalyticsView } from "@/components/shell/AnalyticsView";
import { IntegrationsView } from "@/components/shell/IntegrationsView";
import { DestinationsView } from "@/components/shell/DestinationsView";
import { StorageView } from "@/components/shell/StorageView";
import { GraphView } from "@/components/shell/GraphView";
import { SettingsView } from "@/components/shell/SettingsView";
import { ChatView } from "@/components/shell/ChatView";
import { CreateProjectView } from "@/components/shell/CreateProjectView";
import { OrganizationStatsView } from "@/components/shell/OrganizationStatsView";
import { OrganizationAccessView } from "@/components/shell/OrganizationAccessView";
import { OrganizationSettingsView } from "@/components/shell/OrganizationSettingsView";
import { useAppStore } from "@/stores/useAppStore";
import { orgSections, projectSections } from "@/components/app-shared";

const sectionComponents = {
  "create-project": CreateProjectView,
  analytics: AnalyticsView,
  sources: IntegrationsView,
  destinations: DestinationsView,
  storage: StorageView,
  graph: GraphView,
  settings: SettingsView,
  chat: ChatView,
  stats: OrganizationStatsView,
  access: OrganizationAccessView,
  "org-settings": OrganizationSettingsView,
};

export function DashboardPage() {
  const { orgSlug, projectSlug, section } = useParams();
  const navigate = useNavigate();
  const { organizations, workspaces, currentOrganization, currentWorkspace, activeSection, setActiveSection, selectOrganization, selectWorkspace, fetchProjects } = useAppStore();

  // Derive scope and view key directly from URL params, not stale state
  const scope = projectSlug ? "project" : "organization";
  const urlSection = section || (projectSlug ? "analytics" : "stats");
  const viewKey = useMemo(() => {
    if (scope === "project") {
      if (projectSections.includes(urlSection)) return urlSection;
      return "analytics";
    }
    if (orgSections.includes(urlSection)) return urlSection;
    return "stats";
  }, [scope, urlSection]);

  const ActiveView = sectionComponents[viewKey] || OrganizationStatsView;

  // Sync store with URL. Also update activeSection if needed for sidebar/state.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!orgSlug) {
        if (organizations.length === 0) return;
        const firstOrg = organizations[0];
        navigate(`/app/${firstOrg.slug || firstOrg.id}`, { replace: true });
        return;
      }

      const org = organizations.find((o) => (o.slug || o.id) === orgSlug);
      if (!org) {
        navigate("/app", { replace: true });
        return;
      }

      if (org.id !== currentOrganization?.id) {
        selectOrganization(org.id);
      }

      let projectsForOrg = workspaces.filter((w) => w.organizationId === org.id);
      if (projectsForOrg.length === 0) {
        projectsForOrg = await fetchProjects(org.id);
      }
      if (cancelled) return;

      if (projectSlug) {
        const proj = projectsForOrg.find((w) => (w.slug || w.id) === projectSlug);
        if (!proj) {
          navigate(`/app/${orgSlug}`, { replace: true });
          return;
        }
        if (proj.id !== currentWorkspace?.id) {
          selectWorkspace(proj.id);
        }
        if (!projectSections.includes(urlSection)) {
          navigate(`/app/${orgSlug}/${projectSlug}/analytics`, { replace: true });
          return;
        }
      } else {
        // Workspace landing page
        if (currentWorkspace?.id) {
          useAppStore.setState({ currentWorkspace: null });
        }
        if (!orgSections.includes(urlSection) && urlSection !== "stats") {
          navigate(`/app/${orgSlug}`, { replace: true });
          return;
        }
      }

      if (urlSection !== activeSection) {
        setActiveSection(urlSection);
      }
    })();

    return () => { cancelled = true; };
  }, [orgSlug, projectSlug, section, organizations.length, workspaces.length, currentOrganization?.id, currentWorkspace?.id, activeSection, setActiveSection, selectOrganization, selectWorkspace, fetchProjects, navigate, urlSection]);

  return (
    <Layout>
      <ActiveView />
    </Layout>
  );
}
