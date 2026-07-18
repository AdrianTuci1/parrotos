import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/app-shell";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { User, Building2, CreditCard, Bell, Shield, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/settings.css";

const settingsLinks = [
  { to: "/settings/profile", icon: User, label: "Profile" },
  { to: "/settings/workspaces", icon: Building2, label: "Workspaces" },
  { to: "/settings/workspace", icon: Shield, label: "Workspace" },
  { to: "/settings/billing", icon: CreditCard, label: "Billing" },
  { to: "/settings/notifications", icon: Bell, label: "Notifications" },
];

export function SettingsLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="settings-layout">
        <aside className="settings-nav">
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
              >
                <link.icon className="settings-nav-icon" size={16} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="settings-main">
          <ViewFrame title="" description="" maxWidthClassName="full-width">
            {children}
          </ViewFrame>
        </main>
      </div>
    </Layout>
  );
}
