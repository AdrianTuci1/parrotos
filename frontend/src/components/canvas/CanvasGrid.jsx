import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { CanvasCard } from "@/components/canvas/CanvasCard";
import { COLUMN_COUNT } from "@/data/mockCanvas";
import { cn } from "@/lib/utils";

const isTabGroup = (row) => row?.kind === "tabgroup" || Array.isArray(row?.tabs);
const activeTabOf = (row) => row.tabs.find((t) => t.id === row.activeTab) || row.tabs[0];

/**
 * The canvas builder surface: rows of cards (and tab-group blocks), each rendered as a
 * 12-column grid. Supports selecting, drag-to-reorder (via the card drag handle),
 * column-width resizing (via the dividers between cards), row-height resizing (via the
 * bottom handle), and adding a row. Tab-group blocks render a tab strip; only the active
 * tab's rows are shown, and row/scope callbacks target that tab.
 */
export function CanvasGrid({
  model,
  selectedComponentId,
  selectedTabGroupId,
  onSelectComponent,
  onSelectTabGroup,
  onSetActiveTab,
  onAddTab,
  onDelete,
  onAddRow,
  onAddToRow,
  onMoveWithinRow,
  onResizeWidth,
  onSetRowHeight,
}) {
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [resize, setResize] = useState(null); // { kind: 'width'|'row', id, scope, rowIndex, startX, startY, frPerPx, startFr, startHeight }

  const startWidthResize = (e, id, rowEl) => {
    e.preventDefault();
    e.stopPropagation();
    const total = rowEl.getBoundingClientRect().width;
    const frPerPx = COLUMN_COUNT / total;
    setResize({ kind: "width", id, startX: e.clientX, frPerPx });
  };

  const startRowResize = (e, scope, rowIndex, rowEl) => {
    e.preventDefault();
    e.stopPropagation();
    setResize({ kind: "row", scope, rowIndex, startY: e.clientY, startHeight: rowEl.getBoundingClientRect().height });
  };

  const onMove = useCallback(
    (e) => {
      if (!resize) return;
      if (resize.kind === "width") {
        const fr = Math.round((e.clientX - resize.startX) * resize.frPerPx);
        if (fr !== 0) {
          onResizeWidth(resize.id, fr);
          setResize((r) => ({ ...r, startX: e.clientX }));
        }
      } else {
        const h = resize.startHeight + (e.clientY - resize.startY);
        if (h !== resize.startHeight) {
          onSetRowHeight(resize.scope, resize.rowIndex, h);
          setResize((r) => ({ ...r, startY: e.clientY, startHeight: h }));
        }
      }
    },
    [resize, onResizeWidth, onSetRowHeight],
  );

  const onUp = useCallback(() => {
    setResize(null);
    if (dragId) setDragId(null);
    setDropTarget(null);
  }, [dragId]);

  const renderRow = (row, rowIndex, scope) => (
    <div key={row.id} className="canvas-row" style={{ height: row.height }}>
      <div
        className="canvas-row-inner"
        style={{ gridTemplateColumns: row.items.map((it) => `${it.width}fr`).join(" ") }}
      >
        {row.items.map((item, itemIndex) => (
          <div
            key={item.id}
            className={cn("canvas-cell", dropTarget === item.id && "canvas-cell--drop")}
            onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== item.id) setDropTarget(item.id); }}
            onDragLeave={() => setDropTarget((d) => (d === item.id ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) onMoveWithinRow(dragId, item.id);
              setDragId(null);
              setDropTarget(null);
            }}
          >
            <CanvasCard
              item={item}
              selected={selectedComponentId === item.id}
              onSelect={onSelectComponent}
              onDelete={onDelete}
              onDragStart={(e) => {
                setDragId(item.id);
                e.dataTransfer.effectAllowed = "move";
              }}
            />
            {itemIndex > 0 ? (
              <span
                className="canvas-width-handle"
                onMouseDown={(e) => startWidthResize(e, item.id, e.currentTarget.parentElement)}
              />
            ) : null}
          </div>
        ))}
      </div>
      <span
        className="canvas-row-height-handle"
        onMouseDown={(e) => startRowResize(e, scope, rowIndex, e.currentTarget.parentElement)}
      />
    </div>
  );

  const renderTabGroup = (group) => {
    const active = activeTabOf(group);
    const selected = selectedTabGroupId === group.id;
    return (
      <div key={group.id} className={cn("canvas-tabgroup", selected && "canvas-tabgroup--selected")}>
        <div className="canvas-tabgroup-strip">
          <button
            type="button"
            className="canvas-tabgroup-label"
            onClick={() => onSelectTabGroup(group.id)}
            title="Edit tab group"
          >
            {group.name}
          </button>
          <div className="canvas-tabgroup-tabs">
            {group.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn("canvas-tab", tab.id === active.id && "canvas-tab--active")}
                onClick={() => {
                  onSetActiveTab(group.id, tab.id);
                  onSelectTabGroup(group.id);
                }}
              >
                {tab.displayName}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="canvas-tabgroup-add-tab"
            onClick={() => onAddTab(group.id)}
            title="Add tab"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="canvas-tabgroup-body">
          {active.rows.map((row, ri) => renderRow(row, ri, { tabgroupId: group.id }))}
          {active.rows.length === 0 ? (
            <div className="canvas-tabgroup-empty">
              <span>This tab is empty.</span>
              <button
                type="button"
                className="canvas-add-row-btn"
                onClick={() => onAddRow("kpi_grid", { tabgroupId: group.id })}
              >
                <Plus size={14} />
                <span>Add a card</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div
      className="canvas-grid"
      onMouseMove={(e) => { if (resize) onMove(e); }}
      onMouseUp={onUp}
      onMouseLeave={(e) => { if (resize) onUp(); }}
    >
      {(() => {
        let plain = -1;
        return model.rows.map((container) => {
          if (isTabGroup(container)) return renderTabGroup(container);
          plain += 1;
          return renderRow(container, plain, null);
        });
      })()}
      <div className="canvas-row-add">
        <button type="button" className="canvas-add-row-btn" onClick={() => onAddRow("kpi_grid")}>
          <Plus size={14} />
          <span>Add row</span>
        </button>
      </div>
    </div>
  );
}

export default CanvasGrid;
