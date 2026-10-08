import { useAppStore } from "@/stores/useAppStore";
import {
  SectionHeader,
  GeneralSection,
  PublicLinkRow,
  PlaceholderSection,
  DangerSection,
  IntegrationsSection,
  projectSettingsItems,
} from "@/components/shell/SettingsView";
import {
  ProjectGithubSection,
  ProjectEnvironmentVariablesSection,
  ProjectPublicURLsSection,
  ProjectVisibilitySection,
  ProjectHibernateSection,
} from "@/components/shell/ProjectSettingsSections";
import "@/styles/settings.css";

/**
 * Renders a project settings section inside the unified `/settings` page (opened
 * from the topbar). Reuses the section components already built for the project
 * settings surface, so the features reachable from the sidebar are also reachable
 * here. Requires a selected project; otherwise prompts to open one.
 */
export function ProjectSettingsView({ section }) {
  const { currentWorkspace } = useAppStore();
  if (!currentWorkspace) {
    return (
      <div className="settings-page">
        <SectionHeader title="Project settings" description="Configure a project." />
        <div className="settings-card">
          <p className="settings-placeholder">
            No project selected. Open a project from the sidebar, then return here to configure it.
          </p>
        </div>
      </div>
    );
  }

  switch (section) {
    case "general":
      return (
        <>
          <SectionHeader title="Settings" description="Manage project configuration, team access, and webhooks." />
          <GeneralSection />
          <PublicLinkRow />
        </>
      );
    case "github":
      return <ProjectGithubSection />;
    case "environment-variables":
      return <ProjectEnvironmentVariablesSection />;
    case "public-urls":
      return <ProjectPublicURLsSection />;
    case "team":
      return <PlaceholderSection title="Team" description="Invite and manage project members." />;
    case "notifications":
      return <PlaceholderSection title="Notifications" description="Configure alerts and routing." />;
    case "integrations":
      return <IntegrationsSection />;
    case "danger":
      return (
        <>
          <SectionHeader title="Danger Zone" description="Irreversible actions for this project." />
          <ProjectVisibilitySection />
          <ProjectHibernateSection />
          <DangerSection />
        </>
      );
    default:
      return <GeneralSection />;
  }
}

export { projectSettingsItems };
export default ProjectSettingsView;
