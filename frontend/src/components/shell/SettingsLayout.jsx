import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { useAppStore } from "@/stores/useAppStore";
import {
  User,
  Building2,
  Bell,
  ArrowLeft,
  ChevronDown,
  Users,
  Gauge,
  Receipt,
  Plus,
  Settings as SettingsIcon,
  Menu,
  X,
  Key,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "@/styles/settings.css";
import { CreateModal } from "@/components/shell/CreateModal";
import { projectSettingsItems } from "@/components/shell/SettingsView";

const settingsLinks = [
  { to: "/settings/profile", icon: User, label: "Profile" },
  { to: "/settings/workspaces", icon: Building2, label: "Organizations" },
  { to: "/settings/notifications", icon: Bell, label: "Notifications" },
];

const organizationSettingsItems = [
  { id: "management", label: "General", icon: Users },
  { id: "limits", label: "Limits", icon: Gauge },
  { id: "api-tokens", label: "API Tokens", icon: Key },
  { id: "billing", label: "Usage & Billing", icon: Receipt },
];

const emptyOrg = { id: '__empty__', name: 'My Organization', slug: 'my-org', plan: 'Starter' };

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
      className={cn("settings-scope-avatar", className)}
      style={{ background: stringToGradient(id) }}
    />
  );
}

export function SettingsLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const {
    organizations,
    currentOrganization,
    currentWorkspace,
    selectOrganization,
    createOrganization,
    fetchOrganizations,
  } = useAppStore();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load organizations on mount if empty; also auto-select first org on workspace routes when missing
  useEffect(() => {
    const isWorkspaceRoute = location.pathname.startsWith('/settings/workspace');
    const needsOrg = !currentOrganization || currentOrganization.id === emptyOrg.id || !currentOrganization.id;
    if (isWorkspaceRoute && needsOrg) {
      fetchOrganizations().then((orgs) => {
        if (orgs?.length > 0) {
          selectOrganization(orgs[0].id);
        }
      }).catch(() => {});
    } else if (organizations.length === 0) {
      fetchOrganizations().catch(() => {});
    }
  }, [location.pathname, currentOrganization, organizations.length, fetchOrganizations, selectOrganization]);

  const switchOrg = (orgId) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;
    selectOrganization(orgId);
  };

  const createNewOrg = async (name) => {
    await createOrganization(name);
  };

  const goToWorkspaceTab = (tabId) => {
    navigate(`/settings/workspace/${tabId}`);
    if (isMobile) setMobileOpen(false);
  };

  const isWorkspaceActive = (id) =>
    location.pathname === `/settings/workspace/${id}` ||
    (id === "management" && location.pathname === "/settings/workspace");

  const canAccessWorkspaceSettings = Boolean(
    currentOrganization?.id && currentOrganization.id !== "__empty__"
  );

  const sidebarContent = (
    <>
      <button
        type="button"
        className="settings-nav-back"
        onClick={() => navigate('/app')}
      >
        <ArrowLeft size={14} />
        <span>Back</span>
      </button>
      <div className="settings-nav-header">
        <span className="settings-nav-title">Settings</span>
      </div>
      <nav className="settings-nav-list">
        {settingsLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn("settings-nav-item", isActive && "active")
            }
            onClick={() => isMobile && setMobileOpen(false)}
          >
            <link.icon className="settings-nav-icon" size={16} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="settings-workspace-section settings-org-section">
        <span className="settings-workspace-heading">Organization</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn("settings-workspace-trigger", !currentOrganization && "disabled")}
            disabled={!currentOrganization}
          >
            <ScopeCircle id={currentOrganization?.id} className="project-avatar" />
            <span className="settings-workspace-name">
              {currentOrganization?.name || "Organization"}
            </span>
            <ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="settings-workspace-menu"
            align="start"
            side="bottom"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="settings-workspace-menu-label">
                Organizations
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  className={cn(
                    "settings-workspace-menu-item",
                    currentOrganization?.id === org.id && "active"
                  )}
                  onClick={() => switchOrg(org.id)}
                >
                  <ScopeCircle id={org.id} className="project-avatar" />
                  <span>{org.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="settings-workspace-menu-item"
              onClick={() => setCreateOrgOpen(true)}
            >
              <Plus size={14} />
              <span>Create organization</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="settings-workspace-menu-item"
              onClick={() => { navigate("/settings/workspaces"); if (isMobile) setMobileOpen(false); }}
            >
              <SettingsIcon size={14} />
              <span>Manage organizations</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav className="settings-workspace-menu-list">
          {organizationSettingsItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "settings-workspace-menu-link",
                isWorkspaceActive(item.id) && "active",
                !canAccessWorkspaceSettings && "disabled"
              )}
              onClick={() => canAccessWorkspaceSettings && goToWorkspaceTab(item.id)}
              disabled={!canAccessWorkspaceSettings}
              title={canAccessWorkspaceSettings ? item.label : "Select a workspace first"}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {currentWorkspace && (
        <div className="settings-workspace-section settings-project-section">
          <span className="settings-workspace-heading">Project settings</span>
          <span className="settings-nav-project-name" title={currentWorkspace.name}>
            {currentWorkspace.name}
          </span>
          <nav className="settings-workspace-menu-list">
            {projectSettingsItems.map((item) => (
              <NavLink
                key={item.id}
                to={`/settings/project/${item.id}`}
                className={({ isActive }) =>
                  cn("settings-workspace-menu-link", isActive && "active")
                }
                onClick={() => isMobile && setMobileOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );

  return (
    <div className="settings-layout settings-fullscreen">
      {isMobile && (
        <div className="settings-mobile-topbar">
          <button
            type="button"
            className="settings-mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <span className="settings-mobile-title">Settings</span>
          <div className="settings-mobile-spacer" />
        </div>
      )}
      <aside
        className={cn(
          "settings-nav",
          isMobile && "settings-nav-mobile",
          mobileOpen && "open"
        )}
      >
        {isMobile && (
          <div className="settings-mobile-sidebar-header">
            <span className="settings-nav-title">Settings</span>
            <button
              type="button"
              className="settings-mobile-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {sidebarContent}
      </aside>
      {isMobile && mobileOpen && (
        <div
          className="settings-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className={cn("settings-main", isMobile && "settings-main-mobile")}>
        <ViewFrame title="" description="" maxWidthClassName="full-width" loading={false}>
          {children}
        </ViewFrame>
      </main>
      <CreateModal
        open={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        title="Create Organization"
        description="Create a new organization to organize your projects."
        label="Organization name"
        placeholder="Organization name"
        submitLabel="Create Organization"
        onSubmit={createNewOrg}
      />
    </div>
  );
}
