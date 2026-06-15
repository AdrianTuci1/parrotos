import {
  BarChart3,
  Briefcase,
  ChevronDown,
  CreditCard,
  GitBranch,
  House,
  LayoutDashboard,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Plug,
  Rocket,
  Settings,
  Undo2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNavigationGroups } from '@/components/app-shared';
import { useAppStore } from '@/stores/useAppStore';

const sectionIcons = {
  'bar-chart-3': BarChart3,
  briefcase: Briefcase,
  'credit-card': CreditCard,
  'git-branch': GitBranch,
  house: House,
  'layout-dashboard': LayoutDashboard,
  'message-square': MessageSquare,
  plug: Plug,
  rocket: Rocket,
  settings: Settings,
  users: Users,
};

export function Sidebar() {
  const navigate = useNavigate();
  const {
    currentOrganization,
    currentWorkspace,
    workspaces,
    activeScope,
    activeSection,
    sidebarCollapsed,
    setActiveSection,
    selectWorkspace,
    goToOrganizationHome,
    toggleSidebar,
  } = useAppStore();

  const navigationGroups = getNavigationGroups(activeScope);
  const sidebarTitle =
    activeScope === 'organization' ? currentOrganization.name : currentWorkspace.name;

  return (
    <aside
      className={`flex flex-col h-full bg-bg-secondary border-r border-border transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-72'
      }`}
    >
      <div className="h-14 border-b border-border flex items-center px-3 shrink-0">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-2 w-full">
            <div className="relative group w-full">
              <button className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors">
                <div className="min-w-0 text-left">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                    Projects
                  </div>
                  <div className="text-sm font-medium text-text-primary truncate">
                    {sidebarTitle}
                  </div>
                </div>
                <ChevronDown size={14} className="text-text-muted shrink-0" />
              </button>

              <div className="absolute top-full left-0 right-0 mt-2 bg-bg-tertiary border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-2">
                <div className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
                  Projects
                </div>
                {workspaces.map((workspace) => {
                  const isSelected = workspace.id === currentWorkspace.id;
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => selectWorkspace(workspace.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                        isSelected && activeScope === 'project'
                          ? 'text-accent bg-bg-hover'
                          : 'text-text-primary hover:bg-bg-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{workspace.name}</div>
                          <div className="truncate text-xs text-text-muted">{workspace.domain}</div>
                        </div>
                        <span className="text-xs text-text-muted">{workspace.monthlyEvents}</span>
                      </div>
                    </button>
                  );
                })}

                <div className="border-t border-border my-2" />

                <button
                  onClick={goToOrganizationHome}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    activeScope === 'organization'
                      ? 'text-accent bg-bg-hover'
                      : 'text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <Undo2 size={14} />
                  Back to organization
                </button>

                <button
                  onClick={() => navigate(`/app/${currentOrganization?.slug || currentOrganization?.id}/create-project`)}
                  className="w-full text-left px-3 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  Create new project
                </button>
              </div>
            </div>

            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-bg-hover text-text-muted transition-colors mx-auto"
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {activeScope === 'project' && !sidebarCollapsed ? (
          <button
            onClick={goToOrganizationHome}
            className="mb-4 w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <Undo2 size={16} />
            <span className="text-sm">Back to organization</span>
          </button>
        ) : null}

        {navigationGroups.map((group, groupIndex) => (
          <div key={group.id} className={groupIndex > 0 ? 'mt-6' : ''}>
            {!sidebarCollapsed ? (
              <div className="px-2 mb-2 text-xs text-text-muted font-medium uppercase tracking-wider">
                {group.label}
              </div>
            ) : null}

            {group.items.map((section) => {
              const Icon = sectionIcons[section.icon];
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                    activeSection === section.id
                      ? 'bg-bg-hover text-accent'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? section.title : ''}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed ? <span className="text-sm">{section.title}</span> : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 shrink-0">
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">
                {currentOrganization.owner}
              </div>
              <div className="text-xs text-text-muted">{currentOrganization.plan} plan</div>
            </div>
            <button className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted transition-colors">
              <Settings size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-xs font-medium text-accent">A</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
