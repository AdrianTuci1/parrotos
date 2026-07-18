import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { LogoIcon } from "@/components/logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, LogOut, Settings, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/topbar.css";
import { NotificationBell } from "@/components/shell/NotificationBell";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

function stringToGradient(seed = "") {
  let hash = 0;
  const s = String(seed || "default");
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 45) % 360;
  const h3 = (h1 + 90) % 360;
  return `linear-gradient(135deg, hsl(${h1} 75% 55%), hsl(${h2} 70% 45%), hsl(${h3} 75% 35%))`;
}

function ScopeCircle({ id, className }) {
  return (
    <div
      className={cn("scope-avatar", className)}
      style={{ background: stringToGradient(id) }}
    />
  );
}

export function Topbar() {
  const navigate = useNavigate();
  const {
    currentUser,
    organizations,
    currentOrganization,
    workspaces,
    currentWorkspace,
    selectOrganization,
    selectWorkspace,
    createOrganization,
    createWorkspace,
    logout,
    unreadNotifications,
  } = useAppStore();

  const orgProjects = currentOrganization
    ? workspaces.filter((w) => w.organizationId === currentOrganization.id)
    : [];

  const switchOrg = (orgId) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;
    selectOrganization(orgId);
    const orgSlug = org.slug || org.id;
    navigate(`/app/${orgSlug}`);
  };

  const switchProject = (projectId) => {
    const proj = workspaces.find((w) => w.id === projectId);
    if (!proj) return;
    const org = organizations.find((o) => o.id === proj.organizationId);
    selectWorkspace(projectId);
    const orgSlug = org?.slug || org?.id || proj.organizationId;
    const pSlug = proj.slug || proj.id;
    navigate(`/app/${orgSlug}/${pSlug}/analytics`);
  };

  const createNewOrg = () => {
    const name = prompt("Workspace name:");
    if (!name?.trim()) return;
    createOrganization(name.trim());
    const state = useAppStore.getState();
    const orgSlug = state.currentOrganization?.slug || state.currentOrganization?.id;
    navigate(`/app/${orgSlug}`);
  };

  const createNewProject = () => {
    if (!currentOrganization) return;
    const name = prompt("Project name:");
    if (!name?.trim()) return;
    createWorkspace({ name: name.trim(), organizationId: currentOrganization.id });
    const state = useAppStore.getState();
    const orgSlug = state.currentOrganization?.slug || state.currentOrganization?.id;
    const pSlug = state.currentWorkspace?.slug || state.currentWorkspace?.id;
    navigate(`/app/${orgSlug}/${pSlug}/analytics`);
  };

  const openSettings = () => navigate("/settings");
  const openBilling = () => navigate("/settings/billing");
  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo" onClick={() => navigate("/app")}>
          <LogoIcon className="h-5 w-5" />
          <span className="topbar-logo-text">Parrot</span>
        </div>

        <div className="topbar-divider" />

        <DropdownMenu>
          <DropdownMenuTrigger className="topbar-scope-trigger">
            <ScopeCircle id={currentOrganization?.id} />
            <span className="topbar-scope-name">{currentOrganization?.name || "Workspace"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="topbar-scope-menu" align="start" side="bottom">
            <DropdownMenuLabel className="topbar-menu-label">Workspaces</DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className={cn("topbar-scope-item", currentOrganization?.id === org.id && "active")}
                onClick={() => switchOrg(org.id)}
              >
                <ScopeCircle id={org.id} />
                <span>{org.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="topbar-scope-item" onClick={createNewOrg}>
              <Plus className="h-4 w-4" />
              <span>Create workspace</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="topbar-scope-item" onClick={() => navigate("/settings/workspaces")}>
              <Settings className="h-4 w-4" />
              <span>Manage workspaces</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="topbar-separator">/</span>

        <DropdownMenu>
          <DropdownMenuTrigger className={cn("topbar-scope-trigger", !currentOrganization && "disabled")} disabled={!currentOrganization}>
            <ScopeCircle id={currentWorkspace?.id} className="project-avatar" />
            <span className="topbar-scope-name">{currentWorkspace?.name || "Project"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="topbar-scope-menu" align="start" side="bottom">
            <DropdownMenuLabel className="topbar-menu-label">Projects</DropdownMenuLabel>
            {orgProjects.map((proj) => (
              <DropdownMenuItem
                key={proj.id}
                className={cn("topbar-scope-item", currentWorkspace?.id === proj.id && "active")}
                onClick={() => switchProject(proj.id)}
              >
                <ScopeCircle id={proj.id} className="project-avatar" />
                <span>{proj.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="topbar-scope-item" onClick={createNewProject}>
              <Plus className="h-4 w-4" />
              <span>Create project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="topbar-right">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="topbar-avatar-trigger">
            <div className="topbar-avatar">
              <span>{getInitials(currentUser?.username || currentUser?.email)}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="topbar-scope-menu" align="end" side="bottom">
            <div className="topbar-user-preview">
              <div className="topbar-avatar large">
                <span>{getInitials(currentUser?.username || currentUser?.email)}</span>
              </div>
              <div className="topbar-user-meta">
                <span className="topbar-user-name">{currentUser?.username || "User"}</span>
                <span className="topbar-user-email">{currentUser?.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="topbar-scope-item" onClick={openSettings}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="topbar-scope-item" onClick={openBilling}>
              <User className="h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="topbar-scope-item destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function DropdownMenuLabel({ children, className }) {
  return <div className={cn("topbar-menu-label", className)}>{children}</div>;
}
