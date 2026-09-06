import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { CANVAS_TYPES } from "@/data/mockCanvas";

const LABELS = {
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
 * Add-component dropdown. `onPick(type)` is called with the component type when a
 * menu item is clicked; the caller decides the target row / new row.
 */
export function AddComponentMenu({ onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="add-component-menu" ref={ref}>
      <button
        type="button"
        className="add-component-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Plus size={15} />
        <span>Add</span>
      </button>
      {open ? (
        <div className="add-component-popover">
          <div className="add-component-popover-title">Add component</div>
          {CANVAS_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="add-component-item"
              onClick={() => {
                setOpen(false);
                onPick(type);
              }}
            >
              {LABELS[type] || type}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default AddComponentMenu;
