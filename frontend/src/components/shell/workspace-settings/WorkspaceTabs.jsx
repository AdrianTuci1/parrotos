import { cn } from "@/lib/utils";

export function WorkspaceTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="workspace-tabs-header">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={cn("workspace-tab-btn", activeTab === tab.id && "active")}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
