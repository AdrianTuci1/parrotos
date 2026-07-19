import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AnalyticsView } from '@/components/shell/AnalyticsView';
import { NodesView } from '@/components/shell/NodesView';
import { IntegrationsView } from '@/components/shell/IntegrationsView';
import { ChatView } from '@/components/shell/ChatView';
import { SettingsView } from '@/components/shell/SettingsView';
import { GraphView } from '@/components/shell/GraphView';
import { CreateProjectView } from '@/components/shell/CreateProjectView';
import { OrganizationHomeView } from '@/components/shell/OrganizationHomeView';
import { OrganizationProjectsView } from '@/components/shell/OrganizationProjectsView';
import { OrganizationOrganizationsView } from '@/components/shell/OrganizationOrganizationsView';
import { OrganizationAccessView } from '@/components/shell/OrganizationAccessView';
import { OrganizationSettingsView } from '@/components/shell/OrganizationSettingsView';
import { OrganizationStatsView } from '@/components/shell/OrganizationStatsView';
import { useAppStore } from '@/stores/useAppStore';

const views = {
  analytics: AnalyticsView,
  graph: GraphView,
  integrations: IntegrationsView,
  settings: SettingsView,
  chat: ChatView,
  'organization-home': OrganizationHomeView,
  'organization-projects': OrganizationProjectsView,
  'organization-organizations': OrganizationOrganizationsView,
  'organization-access': OrganizationAccessView,
  'organization-settings': OrganizationSettingsView,
  'organization-stats': OrganizationStatsView,
  'create-project': CreateProjectView,
};

export function AppLayout() {
  const { activeSection } = useAppStore();
  const ActiveView = views[activeSection] || NodesView;

  return (
    <div className="flex h-screen w-screen bg-bg-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <ActiveView />
        </main>
      </div>
    </div>
  );
}
