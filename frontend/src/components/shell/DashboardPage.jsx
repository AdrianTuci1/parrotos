import { useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/app-shell";
import { AnalyticsView } from "@/components/shell/AnalyticsView";
import { StorageView } from "@/components/shell/StorageView";
import { GraphView } from "@/components/shell/GraphView";
import { SettingsView } from "@/components/shell/SettingsView";
import { ChatView } from "@/components/shell/ChatView";
import { MetricsExploreView } from "@/components/shell/MetricsExploreView";
import { FilesView } from "@/components/shell/FilesView";
import { DashboardView } from "@/components/shell/DashboardView";
import { CanvasView } from "@/components/shell/CanvasView";
import { AiView } from "@/components/shell/AiView";
import { CreateProjectView } from "@/components/shell/CreateProjectView";
import { OrganizationStatsView } from "@/components/shell/OrganizationStatsView";
import { OrganizationAccessView } from "@/components/shell/OrganizationAccessView";
import { OrganizationSettingsView } from "@/components/shell/OrganizationSettingsView";
import { useAppStore } from "@/stores/useAppStore";
import { orgSections, projectSections } from "@/components/app-shared";

const sectionComponents = {
  "create-project": CreateProjectView,
  explore: MetricsExploreView,
  dashboard: DashboardView,
  analytics: AnalyticsView,
  canvas: CanvasView,
  files: FilesView,
  storage: StorageView,
  graph: GraphView,
  settings: SettingsView,
  chat: ChatView,
  ai: AiView,
  stats: OrganizationStatsView,
  access: OrganizationAccessView,
  "org-settings": OrganizationSettingsView,
  metrics: OrganizationStatsView,
  invitations: OrganizationAccessView,
};

export function DashboardPage() {
  const { orgSlug, projectSlug, section, name, ["*"]: filePath } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { organizations, workspaces, currentOrganization, currentWorkspace, activeSection, setActiveSection, selectOrganization, selectWorkspace, fetchProjects } = useAppStore();

  // The Rill `/files/[...file]` route is matched as a splat (literal `files`
  // segment), so `section` is undefined there; derive it from the path.
  const isFileRoute =
    section === undefined &&
    (filePath !== undefined || location.pathname.includes("/files"));
  const effectiveSection = isFileRoute ? "files" : section;

  // Derive scope and view key directly from URL params, not stale state
  const scope = projectSlug ? "project" : "organization";
  const urlSection = effectiveSection || (projectSlug ? "analytics" : "stats");

  // Artifact name (metrics view / canvas / file path) carried by the URL.
  const artifactName = name || filePath;
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
          // Section removed from the nav (Storage/Graph/Chat were redundant with
          // Settings/Canvas+Files/AI) — redirect legacy URLs to their replacement.
          const legacyTarget = { storage: "settings", graph: "canvas", chat: "ai" }[urlSection];
          navigate(`/app/${orgSlug}/${projectSlug}/${legacyTarget || "analytics"}`, { replace: true });
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
      {projectSlug ? (
        <div className="project-view-wrapper">
          <ActiveView artifactName={artifactName} />
        </div>
      ) : (
        <ActiveView artifactName={artifactName} />
      )}
    </Layout>
  );
}
