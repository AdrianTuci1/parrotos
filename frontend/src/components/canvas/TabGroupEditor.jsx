import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { CANVAS_TYPES } from "@/data/mockCanvas";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  kpi_grid: "KPI",
  line: "Line chart",
  bar: "Bar chart",
  area: "Area chart",
  leaderboard: "Leaderboard",
  pivot: "Pivot table",
  table: "Table",
  markdown: "Markdown",
  image: "Image",
};

/**
 * Per-tab-group inspector. Lets you rename the group, add / remove / rename tabs,
 * switch the active tab, and add a card to the active tab. Mirrors the tab management
 * Rill surfaces when a canvas tab group is selected.
 */
export function TabGroupEditor({ group, onClose, onRename, onAddTab, onRemoveTab, onRenameTab, onSetActive, onAddRow }) {
  const [name, setName] = useState(group.name);
  const [type, setType] = useState("kpi_grid");
  if (!group) return null;

  const commitName = () => {
    const next = name.trim();
    if (next && next !== group.name) onRename(group.id, next);
  };

  return (
    <aside className="canvas-inspector">
      <div className="mock-inspector-header">
        <h3>Tab group</h3>
        <span className="mock-inspector-badge">tabgroup</span>
        <button type="button" className="mock-inspector-close" onClick={onClose} aria-label="Close editor">
          <X size={16} />
        </button>
      </div>

      <div className="mock-inspector-body">
        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Group</div>
          <div className="mock-inspector-field">
            <label className="mock-inspector-label" htmlFor="tabgroup-name">Name</label>
            <input
              id="tabgroup-name"
              className="mock-inspector-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); }}
            />
          </div>
        </section>

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Tabs</div>
          <div className="tabgroup-editor-tabs">
            {group.tabs.map((tab) => {
              const active = tab.id === group.activeTab;
              return (
                <div key={tab.id} className={cn("tabgroup-editor-tab", active && "tabgroup-editor-tab--active")}>
                  <button
                    type="button"
                    className="tabgroup-editor-tab-activate"
                    onClick={() => onSetActive(group.id, tab.id)}
                    title={active ? "Active tab" : "Make active"}
                  >
                    {tab.displayName}
                  </button>
                  <input
                    className="mock-inspector-input tabgroup-editor-tab-name"
                    value={tab.displayName}
                    onChange={(e) => onRenameTab(group.id, tab.id, e.target.value)}
                    aria-label="Tab name"
                  />
                  <button
                    type="button"
                    className="tabgroup-editor-tab-remove"
                    onClick={() => onRemoveTab(group.id, tab.id)}
                    disabled={group.tabs.length <= 1}
                    aria-label="Remove tab"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" className="canvas-inspector-action" onClick={() => onAddTab(group.id)}>
            <Plus size={14} />
            <span>Add tab</span>
          </button>
        </section>

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Add card to active tab</div>
          <div className="tabgroup-editor-addrow">
            <select
              className="mock-inspector-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Card type"
            >
              {CANVAS_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
            </select>
            <button type="button" className="canvas-inspector-action" onClick={() => onAddRow(type)}>
              <Plus size={14} />
              <span>Add row</span>
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}

export default TabGroupEditor;
