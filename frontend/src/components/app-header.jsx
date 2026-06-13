import { useAppStore } from "@/stores/useAppStore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findSectionById } from "@/components/app-shared";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Bell,
  LayoutGrid,
  LogOut,
  Settings,
  User,
  HelpCircle,
  CheckCheck,
  Settings2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import "@/styles/header.css";

const notifications = [
  {
    id: 'n1',
    title: 'Pixtooth sync completed',
    detail: 'All 12 connectors synced successfully.',
    time: '2 min ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'Octomus latency alert',
    detail: 'Warehouse jobs are running 34% slower than baseline.',
    time: '18 min ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'New connector available',
    detail: 'Salesforce connector is now ready to configure.',
    time: '1h ago',
    read: true,
  },
  {
    id: 'n4',
    title: 'Staticlabs billing updated',
    detail: 'Plan changed from Growth to Scale.',
    time: '3h ago',
    read: true,
  },
];

export function AppHeader() {
  const { activeSection, activeScope, currentOrganization, currentWorkspace } = useAppStore();
  const section = findSectionById(activeScope, activeSection);

  let scopeLabel;
  let scopeEyebrow;
  if (activeScope === "project") {
    scopeLabel = currentWorkspace?.name || "Project";
    scopeEyebrow = "Project";
  } else {
    scopeLabel = currentOrganization?.name || "Organization";
    scopeEyebrow = "Organization";
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="header-left-side">
          <SidebarTrigger className="header-sidebar-trigger" />
          <div className="header-divider" />
          <div className="header-section-title">
            <div className="header-section-copy">
              <span className="header-section-text">
                {scopeLabel} · {section?.title || "Dashboard"}
              </span>
            </div>
          </div>
        </div>

        <div className="header-right-side">
          <ThemeSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="header-bell-btn">
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="header-bell-badge" />}
                </button>
              }
            />
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="header-dropdown-content"
            >
              <DropdownMenuGroup className="header-dropdown-label">
                <DropdownMenuItem className="header-dropdown-label-row" onClick={(e) => e.preventDefault()}>
                  <div className="header-dropdown-label-inner">
                    <span className="header-dropdown-label-text">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="header-dropdown-count">{unreadCount}</span>
                    )}
                  </div>
                  <button
                    className="header-dropdown-mark-read"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="header-notif-item" onClick={(e) => e.preventDefault()}>
                  <div className="header-notif-left">
                    {!n.read && <span className="header-notif-dot" />}
                    <div className="header-notif-copy">
                      <span className={`header-notif-title ${!n.read ? 'unread' : ''}`}>
                        {n.title}
                      </span>
                      <span className="header-notif-detail">{n.detail}</span>
                    </div>
                  </div>
                  <span className="header-notif-time">{n.time}</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="header-dropdown-separator" />

              <DropdownMenuItem className="header-dropdown-action">
                <Settings2 size={14} />
                Notification settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="header-avatar-wrapper">
                  <div className="header-avatar-circle">A</div>
                </button>
              }
            />
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="header-dropdown-content"
            >
              <DropdownMenuGroup className="header-dropdown-label">
                <DropdownMenuItem className="header-dropdown-label-row" onClick={(e) => e.preventDefault()}>
                  <div className="header-user-label">
                    <div className="header-user-avatar-sm">A</div>
                    <div>
                      <div className="header-user-name">Alex Parker</div>
                      <div className="header-user-email">alex@nexahub.io</div>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="header-dropdown-separator" />

              <DropdownMenuItem className="header-dropdown-action" onClick={(e) => e.preventDefault()}>
                <User size={14} />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="header-dropdown-action" onClick={(e) => e.preventDefault()}>
                <Settings size={14} />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuItem className="header-dropdown-action" onClick={(e) => e.preventDefault()}>
                <HelpCircle size={14} />
                Help & support
              </DropdownMenuItem>

              <DropdownMenuSeparator className="header-dropdown-separator" />

              <DropdownMenuItem className="header-dropdown-action header-dropdown-danger" onClick={(e) => e.preventDefault()}>
                <LogOut size={14} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
