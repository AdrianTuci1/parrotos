import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadCanvas,
  saveCanvas,
  makeItem,
  MAX_ITEMS_PER_ROW,
  MIN_ROW_HEIGHT,
  applyAiToSpec,
} from "@/data/mockCanvas";

/**
 * Canvas editor state hook.
 *
 * Holds the canvas `model` (rows -> items -> spec) plus the selected component id,
 * and exposes the editing mutations the builder needs. Every mutation persists the
 * model to localStorage so a reload keeps the layout (mock stand-in for Rill's
 * runtime reconciled YAML). Swap the persistence calls for the real file layer when
 * a Rill runtime is available.
 */
export function useCanvasState(canvasName) {
  const [model, setModel] = useState(() => loadCanvas(canvasName));
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  useEffect(() => {
    saveCanvas(canvasName, model);
  }, [canvasName, model]);

  // Iterate rows/items immutably; a null rowIndex means "the row containing id".
  const findComponent = (rows, id) => {
    for (let ri = 0; ri < rows.length; ri += 1) {
      const idx = rows[ri].items.findIndex((it) => it.id === id);
      if (idx >= 0) return { ri, idx, item: rows[ri].items[idx] };
    }
    return null;
  };

  const select = useCallback((id) => setSelectedComponentId(id), []);

  /** Add a new plain row at the end containing a single item of `type`. */
  const addRow = useCallback((type) => {
    setModel((prev) => {
      const row = { id: `r_${Date.now().toString(36)}`, height: 300, items: [makeItem(type, 12)] };
      const next = { ...prev, rows: [...prev.rows, row] };
      return next;
    });
  }, []);

  /** Add an item to an existing row (respecting the max-per-row cap). */
  const addToRow = useCallback((rowIndex, type) => {
    setModel((prev) => {
      const row = prev.rows[rowIndex];
      if (!row || row.items.length >= MAX_ITEMS_PER_ROW) return prev;
      const width = Math.max(3, Math.floor(12 / (row.items.length + 1)));
      const nextRow = {
        ...row,
        items: [
          ...row.items.map((it) => ({ ...it, width })),
          makeItem(type, width),
        ],
      };
      const rows = prev.rows.map((r, i) => (i === rowIndex ? nextRow : r));
      return { ...prev, rows };
    });
  }, []);

  const removeComponent = useCallback((id) => {
    setModel((prev) => {
      const rows = prev.rows
        .map((row) => {
          const items = row.items.filter((it) => it.id !== id);
          return items.length === row.items.length ? row : { ...row, items };
        })
        .filter((row) => row.items.length > 0);
      // rebalance widths across each touched row
      const rebalanced = rows.map((row) => {
        if (row.items.length === 0) return row;
        const each = Math.floor(12 / row.items.length);
        return {
          ...row,
          items: row.items.map((it, i) => ({ ...it, width: i === row.items.length - 1 ? 12 - each * (row.items.length - 1) : each })),
        };
      });
      return { ...prev, rows: rebalanced };
    });
    setSelectedComponentId((cur) => (cur === id ? null : cur));
  }, []);

  /** Merge a patch into a component's spec (the ParamMapper write-back path). */
  const updateComponent = useCallback((id, specPatch, metaPatch = {}) => {
    setModel((prev) => {
      const rows = prev.rows.map((row) => {
        if (!row.items.some((it) => it.id === id)) return row;
        return {
          ...row,
          items: row.items.map((it) =>
            it.id === id ? { ...it, ...metaPatch, spec: { ...it.spec, ...specPatch } } : it,
          ),
        };
      });
      return { ...prev, rows };
    });
  }, []);

  /** Resize a component's column width by `delta` (fr units), clamped 3..12. */
  const resizeItemWidth = useCallback((id, delta) => {
    setModel((prev) => {
      const rows = prev.rows.map((row) => {
        const idx = row.items.findIndex((it) => it.id === id);
        if (idx < 0) return row;
        const current = row.items[idx].width;
        const next = Math.min(12, Math.max(3, current + delta));
        if (next === current) return row;
        // Take from / give to the sibling so the row still sums to 12.
        const items = row.items.map((it, i) => {
          if (i === idx) return { ...it, width: next };
          if (row.items.length > 1) {
            const diff = current - next; // positive when shrinking
            return { ...it, width: Math.min(12, Math.max(3, it.width + (i === (idx + 1) % row.items.length ? diff : 0))) };
          }
          return it;
        });
        return { ...row, items };
      });
      return { ...prev, rows };
    });
  }, []);

  const setRowHeight = useCallback((rowIndex, height) => {
    setModel((prev) => {
      if (!prev.rows[rowIndex]) return prev;
      const h = Math.max(MIN_ROW_HEIGHT, height);
      const rows = prev.rows.map((r, i) => (i === rowIndex ? { ...r, height: h } : r));
      return { ...prev, rows };
    });
  }, []);

  /** Reorder `dragId` to sit at the index of `overId` within the same row. */
  const moveComponentWithinRow = useCallback((dragId, overId) => {
    setModel((prev) => {
      const rows = prev.rows.map((row) => {
        const a = row.items.findIndex((it) => it.id === dragId);
        const b = row.items.findIndex((it) => it.id === overId);
        if (a < 0 || b < 0 || a === b) return row;
        const items = [...row.items];
        const [moved] = items.splice(a, 1);
        items.splice(b, 0, moved);
        return { ...row, items };
      });
      return { ...prev, rows };
    });
  }, []);

  /** Move `dragId` into `rowIndex` (appended), removing it from its current row. */
  const moveComponentToRow = useCallback((dragId, rowIndex) => {
    setModel((prev) => {
      const target = prev.rows[rowIndex];
      const { item } = findComponent(prev.rows, dragId) || {};
      if (!target || !item || target.items.length >= MAX_ITEMS_PER_ROW) return prev;
      const sourceRows = prev.rows.map((row) => ({
        ...row,
        items: row.items.filter((it) => it.id !== dragId),
      }));
      const rows = sourceRows.map((row, i) => {
        if (i === rowIndex) {
          const each = Math.floor(12 / (row.items.length + 1));
          return {
            ...row,
            items: [...row.items.map((it) => ({ ...it, width: each })), { ...item, width: 12 - each * row.items.length }],
          };
        }
        return row;
      }).filter((row) => row.items.length > 0);
      return { ...prev, rows };
    });
  }, []);

  /** Run the mock "Edit with AI" intent interpreter against the selected card. */
  const applyAiEdit = useCallback(
    async (prompt) => {
      const loc = findComponent(model.rows, selectedComponentId);
      if (!loc) return "Nothing to edit.";
      const { patch, message } = applyAiToSpec(prompt, loc.item.spec || {});
      // The mock agent may set displayName; map to title for the canvas card.
      const { displayName: _d, ...specPatch } = patch;
      updateComponent(selectedComponentId, {
        ...specPatch,
        ...(patch.displayName ? { title: patch.displayName } : {}),
      });
      return message;
    },
    [model.rows, selectedComponentId, updateComponent],
  );

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null;
    const loc = findComponent(model.rows, selectedComponentId);
    return loc ? loc.item : null;
  }, [model.rows, selectedComponentId]);

  return {
    model,
    selectedComponentId,
    selectedComponent,
    select,
    addRow,
    addToRow,
    removeComponent,
    updateComponent,
    resizeItemWidth,
    setRowHeight,
    moveComponentWithinRow,
    moveComponentToRow,
    applyAiEdit,
  };
}

export default useCanvasState;
