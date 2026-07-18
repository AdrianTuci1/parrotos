import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import "@/styles/settings.css";

export function SettingsSidebar({ items, activeId, onChange }) {
  const { activeScope } = useAppStore();
  return (
    <div className="settings-sidebar">
      <div className="settings-sidebar-section">
        <span className="settings-sidebar-heading">
          {activeScope === "project" ? "Project" : "Workspace"}
        </span>
        <nav className="settings-sidebar-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn("settings-sidebar-item", activeId === item.id && "active")}
              onClick={() => onChange(item.id)}
            >
              <span className="settings-sidebar-icon">{item.icon}</span>
              <span className="settings-sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
