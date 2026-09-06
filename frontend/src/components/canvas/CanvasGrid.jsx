import { useRef, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { CanvasCard } from "@/components/canvas/CanvasCard";
import { COLUMN_COUNT } from "@/data/mockCanvas";
import { cn } from "@/lib/utils";

/**
 * The canvas builder surface: rows of cards, each rendered as a 12-column grid.
 * Supports selecting, drag-to-reorder (via the card drag handle), column-width
 * resizing (via the dividers between cards), row-height resizing (via the bottom
 * handle), and adding a row.
 */
export function CanvasGrid({ model, selectedComponentId, onSelect, onDelete, onAddRow, onMoveWithinRow, onResizeWidth, onSetRowHeight }) {
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [resize, setResize] = useState(null); // { kind: 'width'|'row', id, rowIndex, startX, startY, frPerPx, startFr, startHeight }

  const startWidthResize = (e, id, rowEl) => {
    e.preventDefault();
    e.stopPropagation();
    const total = rowEl.getBoundingClientRect().width;
    const frPerPx = COLUMN_COUNT / total;
    setResize({ kind: "width", id, startX: e.clientX, frPerPx, moved: false });
  };

  const startRowResize = (e, rowIndex, rowEl) => {
    e.preventDefault();
    e.stopPropagation();
    setResize({ kind: "row", rowIndex, startY: e.clientY, startHeight: rowEl.getBoundingClientRect().height, id: null });
  };

  const onMove = useCallback(
    (e) => {
      if (!resize) return;
      if (resize.kind === "width") {
        const fr = Math.round((e.clientX - resize.startX) * resize.frPerPx);
        if (fr !== 0) {
          onResizeWidth(resize.id, fr);
          setResize((r) => ({ ...r, startX: e.clientX, moved: true }));
        }
      } else {
        const h = resize.startHeight + (e.clientY - resize.startY);
        if (h !== resize.startHeight) {
          onSetRowHeight(resize.rowIndex, h);
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

  const attachMove = (e) => {
    if (resize) {
      onMove(e);
    }
  };

  return (
    <div
      className="canvas-grid"
      onMouseMove={attachMove}
      onMouseUp={onUp}
      onMouseLeave={(e) => { if (resize) onUp(); }}
    >
      {model.rows.map((row, rowIndex) => (
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
                  onSelect={onSelect}
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
            onMouseDown={(e) => startRowResize(e, rowIndex, e.currentTarget.parentElement)}
          />
        </div>
      ))}
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
