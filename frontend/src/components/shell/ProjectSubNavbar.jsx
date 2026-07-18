import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { Menu, X } from "lucide-react";
import "@/styles/topbar.css";

const projectTabs = [
  { id: "analytics", label: "Analytics" },
  { id: "sources", label: "Sources" },
  { id: "destinations", label: "Destinations" },
  { id: "storage", label: "Storage" },
  { id: "graph", label: "Graph" },
  { id: "chat", label: "Chat" },
  { id: "settings", label: "Project Settings" },
];

export function ProjectSubNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentOrganization, currentWorkspace } = useAppStore();
  const [open, setOpen] = useState(false);

  if (!currentOrganization || !currentWorkspace) return null;

  const activeTab = (() => {
    const m = location.pathname.match(/\/app\/[^/]+\/[^/]+\/(\w+)/);
    return m?.[1] || "analytics";
  })();

  const orgSlug = currentOrganization.slug || currentOrganization.id;
  const pSlug = currentWorkspace.slug || currentWorkspace.id;

  const goTo = (tabId) => {
    setOpen(false);
    navigate(`/app/${orgSlug}/${pSlug}/${tabId}`);
  };

  return (
    <div className="subnavbar">
      <div className="subnavbar-tabs">
        {projectTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => goTo(tab.id)}
            className={cn("subnavbar-tab", activeTab === tab.id && "active")}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="subnavbar-hamburger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div className="subnavbar-mobile-menu">
          {projectTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => goTo(tab.id)}
              className={cn("subnavbar-mobile-tab", activeTab === tab.id && "active")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSubNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentOrganization } = useAppStore();

  if (!currentOrganization || location.pathname.includes("/app/" + (currentOrganization.slug || currentOrganization.id) + "/")) return null;

  return (
    <div className="subnavbar">
      <div className="subnavbar-tabs">
        <button className="subnavbar-tab active" onClick={() => navigate(`/app/${currentOrganization.slug || currentOrganization.id}`)}>
          Projects
        </button>
      </div>
    </div>
  );
}
