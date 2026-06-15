"use client";

import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarGroupAction, useSidebar,
} from "@/components/ui/sidebar";
import { LogoIcon } from "@/components/logo";
import { getNavigationGroups } from "@/components/app-shared";
import { useAppStore } from "@/stores/useAppStore";
import {
  Plus, LayoutDashboard, BarChart3, Briefcase, Plug, Settings,
  BookOpen, Rocket, GitBranch, MessageSquare, Undo2, Users, CreditCard, Power,
  Database, ArrowRightFromLine, House,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import "@/styles/sidebar.css";

const sectionIcons = {
  "bar-chart-3": BarChart3, briefcase: Briefcase, "credit-card": CreditCard,
  "git-branch": GitBranch, "layout-dashboard": LayoutDashboard,
  house: House,
  "message-square": MessageSquare, plug: Plug, rocket: Rocket,
  settings: Settings, users: Users, database: Database,
  "arrow-right-from-line": ArrowRightFromLine,
};

const accountSections = ['home', 'organizations', 'billing'];

export function AppSidebar() {
  const {
    currentOrganization, currentWorkspace, organizations, workspaces,
    activeScope, activeSection,
    selectOrganization, selectWorkspace, createOrganization,
    goToOrganizationHome,
    chatSessions, activeChatId, selectChat, createChatSession,
    demoMode, toggleDemoMode,
  } = useAppStore();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const navigationGroups = getNavigationGroups(activeScope);
  const orgProjects = workspaces.filter((w) => w.organizationId === currentOrganization?.id);

  const getGradient = (name) =>
    name?.toLowerCase() === "pixtooth"
      ? "bg-[linear-gradient(135deg,#4ade80,#3b82f6)]"
      : "bg-[linear-gradient(135deg,#60a5fa,#1d4ed8)]";

  const navTo = (sectionId) => {
    const store = useAppStore.getState();
    if (store.activeScope === "project") {
      const oSlug = store.currentOrganization?.slug || store.currentOrganization?.id;
      const pSlug = store.currentWorkspace?.slug || store.currentWorkspace?.id;
      navigate(`/app/${oSlug}/${pSlug}/${sectionId}`);
    } else if (accountSections.includes(sectionId)) {
      // Account items: no org in URL
      navigate(`/app/${sectionId}`);
    } else {
      // Org items: with org in URL
      const oSlug = store.currentOrganization?.slug || store.currentOrganization?.id;
      navigate(`/app/${oSlug}/${sectionId}`);
    }
  };

  const navToOrg = (orgId) => {
    selectOrganization(orgId);
    const org = organizations.find((o) => o.id === orgId);
    const oSlug = org?.slug || orgId;
    navigate(`/app/${oSlug}/stats`);
  };

  const navToProject = (workspaceId) => {
    selectWorkspace(workspaceId);
    const proj = workspaces.find((w) => w.id === workspaceId);
    const org = organizations.find((o) => o.id === proj?.organizationId);
    const oSlug = org?.slug || org?.id;
    const pSlug = proj?.slug || workspaceId;
    navigate(`/app/${oSlug}/${pSlug}/analytics`);
  };

  const navToOrgHome = () => {
    goToOrganizationHome();
    const oSlug = currentOrganization?.slug || currentOrganization?.id;
    navigate(`/app/${oSlug}/stats`);
  };

  const navToCreateProject = () => {
    const oSlug = currentOrganization?.slug || currentOrganization?.id;
    navigate(`/app/${oSlug}/create-project`);
  };

  const afterCreateNavigate = (target) => {
    setTimeout(() => {
      const state = useAppStore.getState();
      const oSlug = state.currentOrganization?.slug || state.currentOrganization?.id;
      if (target === "org") {
        navigate(`/app/${oSlug}/stats`);
      } else {
        const pSlug = state.currentWorkspace?.slug || state.currentWorkspace?.id;
        navigate(`/app/${oSlug}/${pSlug}/analytics`);
      }
    }, 0);
  };

  return (
    <Sidebar className={cn("app-sidebar-container", isCollapsed && "collapsed")} collapsible="icon" variant="sidebar">
      <SidebarHeader className="sidebar-header-custom">
        <SidebarMenu className="sidebar-menu-custom">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="sidebar-logo-button">
              <div className="sidebar-logo-icon-wrapper"><LogoIcon className="h-5 w-5" /></div>
              <div className="sidebar-logo-title-wrapper group-data-[collapsible=icon]:hidden">
                <span className="sidebar-logo-title-text">Parrot</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="sidebar-divider-custom" />

        {/* Project switcher (header) */}
        {activeScope === "project" && (
          <div className="sidebar-switcher-wrapper">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="sidebar-switcher-trigger" />}>
                    <div className={cn("workspace-circle-logo", getGradient(currentWorkspace?.name))} />
                    <div className="workspace-title-wrapper group-data-[collapsible=icon]:hidden">
                      <span className="workspace-title-text">{currentWorkspace?.name}</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" sideOffset={12} className="sidebar-switcher-dropdown-content">
                    <div className="dropdown-section-label">Projects</div>
                    {orgProjects.map((ws) => (
                      <DropdownMenuItem key={ws.id} onClick={() => navToProject(ws.id)}
                        className={cn("dropdown-item-custom", currentWorkspace?.id === ws.id && "selected")}>
                        <div className="dropdown-item-left">
                          <div className={cn("dropdown-workspace-circle", getGradient(ws.name))} />
                          <div className="dropdown-item-meta">
                            <span className="dropdown-workspace-name">{ws.name}</span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <div className="dropdown-section-separator" />
                    <DropdownMenuItem onClick={navToCreateProject}
                      className="dropdown-item-custom dropdown-item-create">
                      <div className="dropdown-item-left">
                        <div className="dropdown-workspace-circle dropdown-circle-plus"><Plus size={14} /></div>
                        <div className="dropdown-item-meta"><span className="dropdown-workspace-name">Create project</span></div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}

        <div className="sidebar-divider-custom" />
      </SidebarHeader>

      <SidebarContent className="sidebar-content-custom">
        {/* Back to workspace (project scope only) */}
        {activeScope === "project" && (
          <div className="sidebar-back-link-wrap group-data-[collapsible=icon]:hidden">
            <button onClick={navToOrgHome} className="sidebar-back-link-btn">
              <Undo2 size={14} /><span>Back to workspace</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        {navigationGroups.map((group, idx) => (
          <div key={group.id}>
            {group.label && (
              <SidebarGroupLabel className="sidebar-group-label-custom group-data-[collapsible=icon]:hidden">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroup className="sidebar-group-custom">
              <SidebarGroupContent>
                <SidebarMenu className="sidebar-menu-gap">
                  {group.items.map((item) => {
                    const Icon = sectionIcons[item.icon];
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={activeSection === item.id}
                          tooltip={item.title}
                          onClick={() => navTo(item.id)}
                          className={cn("sidebar-nav-button", activeSection === item.id && "active")}
                        >
                          <div className="sidebar-nav-left">
                            <div className="sidebar-nav-icon"><Icon size={18} /></div>
                            <span className="sidebar-nav-label group-data-[collapsible=icon]:hidden">{item.title}</span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Org switcher - after Account group, before Organization group */}
            {idx === 0 && activeScope !== "project" && (
              <div className="sidebar-switcher-wrapper">
                <SidebarMenu>
                  <SidebarMenuItem>
                    {(organizations.length > 0) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="sidebar-switcher-trigger" />}>
                          <div className={cn("workspace-circle-logo", getGradient(currentOrganization?.name))} />
                          <div className="workspace-title-wrapper group-data-[collapsible=icon]:hidden">
                            <span className="workspace-title-text">{currentOrganization?.name || "No workspace"}</span>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" sideOffset={12} className="sidebar-switcher-dropdown-content">
                          <div className="dropdown-section-label">Workspaces</div>
                          {organizations.map((org) => (
                            <DropdownMenuItem key={org.id} onClick={() => navToOrg(org.id)}
                              className={cn("dropdown-item-custom", currentOrganization?.id === org.id && "selected")}>
                              <div className="dropdown-item-left">
                                <div className={cn("dropdown-workspace-circle", getGradient(org.name))} />
                                <div className="dropdown-item-meta">
                                  <span className="dropdown-workspace-name">{org.name}</span>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          ))}
                          <div className="dropdown-section-separator" />
                          <DropdownMenuItem onClick={() => { const name = prompt("Workspace name:"); if (name?.trim()) { createOrganization(name.trim()); afterCreateNavigate("org"); } }}
                            className="dropdown-item-custom dropdown-item-create">
                            <div className="dropdown-item-left">
                              <div className="dropdown-workspace-circle dropdown-circle-plus"><Plus size={14} /></div>
                              <div className="dropdown-item-meta"><span className="dropdown-workspace-name">Create workspace</span></div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <SidebarMenuButton size="lg" className="sidebar-switcher-trigger"
                        onClick={() => { const name = prompt("Create your first workspace:"); if (name?.trim()) { createOrganization(name.trim()); afterCreateNavigate("org"); } }}>
                        <div className="workspace-circle-logo bg-[linear-gradient(135deg,#60a5fa,#1d4ed8)]" />
                        <div className="workspace-title-wrapper group-data-[collapsible=icon]:hidden">
                          <span className="workspace-title-text">Create workspace</span>
                        </div>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            )}
          </div>
        ))}

        {/* Projects list (org scope) */}
        {activeScope !== "project" && (
          <SidebarGroup className="sidebar-group-custom">
            <SidebarGroupLabel className="sidebar-group-label-custom group-data-[collapsible=icon]:hidden">Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="sidebar-menu-gap">
                {orgProjects.map((ws) => (
                  <SidebarMenuItem key={ws.id}>
                    <SidebarMenuButton tooltip={ws.name} onClick={() => navToProject(ws.id)} className="sidebar-nav-button">
                      <div className="sidebar-nav-left">
                        <div className={cn("sidebar-nav-org-dot", getGradient(ws.name))} />
                        <span className="sidebar-nav-label group-data-[collapsible=icon]:hidden">{ws.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Create project"
                    onClick={navToCreateProject}
                    className="sidebar-nav-button">
                    <div className="sidebar-nav-left">
                      <div className="sidebar-nav-icon"><Plus size={18} /></div>
                      <span className="sidebar-nav-label group-data-[collapsible=icon]:hidden">Create project</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Chat (project scope) */}
        {activeScope === "project" && (
          <SidebarGroup className="sidebar-group-custom relative group/chat-group">
            <SidebarGroupLabel className="sidebar-group-label-custom group-data-[collapsible=icon]:hidden">Chat History</SidebarGroupLabel>
            <SidebarGroupAction onClick={() => { createChatSession(); navTo("chat"); }}
              title="New Chat" className="chat-group-plus-btn"><Plus size={14} /></SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu className="sidebar-menu-gap">
                {chatSessions.filter((s) => s.messages?.length > 0).map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      isActive={activeSection === "chat" && activeChatId === session.id}
                      tooltip={session.title}
                      onClick={() => { selectChat(session.id); navTo("chat"); }}
                      className={cn("sidebar-nav-button", activeSection === "chat" && activeChatId === session.id && "active")}>
                      <div className="sidebar-nav-left">
                        <span className="sidebar-nav-label group-data-[collapsible=icon]:hidden">{session.title}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator className="sidebar-separator-custom" />

      <SidebarFooter className="sidebar-footer-custom">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Documentation" onClick={() => alert("Opening documentation...")} className="sidebar-nav-button">
              <div className="sidebar-nav-left">
                <div className="sidebar-nav-icon"><BookOpen size={18} /></div>
                <span className="sidebar-nav-label group-data-[collapsible=icon]:hidden">Documentation</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Demo Mode" onClick={toggleDemoMode} className={cn("sidebar-nav-button", demoMode && "active")}>
              <div className="sidebar-nav-left">
                <div className="sidebar-nav-icon"><Power size={18} /></div>
                <span className="sidebar-nav-label group-data-[collapsible=icon]:hidden">Demo mode</span>
              </div>
              <div className="sidebar-toggle-pill group-data-[collapsible=icon]:hidden">
                <span className={cn("sidebar-toggle-dot", demoMode && "active")} />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
