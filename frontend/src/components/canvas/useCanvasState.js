import { useCallback, useEffect, useMemo, useState } from "react";
import { useOptionalRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import {
  loadCanvas as loadCanvasLocal,
  makeItem,
  makeRow,
  makeTab,
  makeTabGroup,
  MAX_ITEMS_PER_ROW,
  MIN_ROW_HEIGHT,
  applyAiToSpec,
} from "@/data/mockCanvas";
import {
  setCanvasTransport,
  resetCanvasTransport,
  buildRuntimeTransport,
  saveCanvas,
} from "@/data/canvasStorage";

/**
 * Canvas editor state hook.
 *
 * Holds the canvas `model` (rows -> items -> spec) plus the current selection and
 * exposes the editing mutations the builder needs. A row is either a plain row
 * (`kind:'row'`) or a tab group (`kind:'tabgroup'`); editing a tab group targets its
 * active tab's rows, matching Rill. Every mutation persists the model to localStorage
 * so a reload keeps the layout (mock stand-in for Rill's runtime reconciled YAML).
 */
const isTabGroup = (row) => row?.kind === "tabgroup" || Array.isArray(row?.tabs);
const activeTabOf = (row) => row.tabs.find((t) => t.id === row.activeTab) || row.tabs[0];

/** Re-distribute item widths so a row sums to the 12-column grid. */
function rebalance(row) {
  if (!row.items.length) return row;
  const each = Math.floor(12 / row.items.length);
  return {
    ...row,
    items: row.items.map((it, i) => ({
      ...it,
      width: i === row.items.length - 1 ? 12 - each * (row.items.length - 1) : each,
    })),
  };
}

/** Apply a transformation to a single plain row wherever it lives (root or a tab). */
function updateItemInModel(rows, id, updater) {
  return rows.map((row) => {
    if (isTabGroup(row)) {
      const active = activeTabOf(row);
      return {
        ...row,
        tabs: row.tabs.map((t) => {
          if (t.id !== active.id) return t;
          return {
            ...t,
            rows: t.rows.map((r) => {
              const idx = r.items.findIndex((it) => it.id === id);
              if (idx < 0) return r;
              return { ...r, items: r.items.map((it) => (it.id === id ? updater(it) : it)) };
            }),
          };
        }),
      };
    }
    const idx = row.items.findIndex((it) => it.id === id);
    if (idx < 0) return row;
    return { ...row, items: row.items.map((it) => (it.id === id ? updater(it) : it)) };
  });
}

/** Apply a row-level transformation to the row containing `id`. */
function updateRowInModel(rows, id, rowFn) {
  return rows.map((row) => {
    if (isTabGroup(row)) {
      const active = activeTabOf(row);
      return {
        ...row,
        tabs: row.tabs.map((t) => {
          if (t.id !== active.id) return t;
          return {
            ...t,
            rows: t.rows.map((r) => (r.items.some((it) => it.id === id) ? rowFn(r) : r)),
          };
        }),
      };
    }
    return row.items.some((it) => it.id === id) ? rowFn(row) : row;
  });
}

export function useCanvasState(canvasName) {
  const runtimeClient = useOptionalRuntimeClient();
  // Seed from localStorage so the surface renders instantly; reconcile from the
  // runtime file layer below when the runtime actually responds.
  const [model, setModel] = useState(() => loadCanvasLocal(canvasName));
  const [selection, setSelection] = useState(null); // { type:'component'|'tabgroup', id } | null

  // Probe the runtime by reading the canvas YAML. Success => runtime reachable =>
  // adopt the runtime transport (dashboards/<name>.yaml) and the file's model.
  // Failure (e.g. no `rill start` runtime in mock/dev) => fall back to localStorage.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!runtimeClient) {
        resetCanvasTransport();
        return;
      }
      const runtimeTransport = buildRuntimeTransport(runtimeClient);
      try {
        const next = await runtimeTransport.read(canvasName);
        if (!active) return;
        setCanvasTransport(runtimeTransport);
        setModel(next);
      } catch {
        if (!active) return;
        resetCanvasTransport();
        // Keep the localStorage seed already in state.
      }
    })();
    return () => {
      active = false;
    };
  }, [runtimeClient, canvasName]);

  // Persist every change through the active transport.
  useEffect(() => {
    saveCanvas(canvasName, model);
  }, [canvasName, model]);

  // Find a component anywhere in the tree (root rows + every tab, active or not).
  const locateComponent = (rows, id) => {
    for (let ri = 0; ri < rows.length; ri += 1) {
      const row = rows[ri];
      if (isTabGroup(row)) {
        for (const tab of row.tabs) {
          for (let tri = 0; tri < tab.rows.length; tri += 1) {
            const idx = tab.rows[tri].items.findIndex((it) => it.id === id);
            if (idx >= 0) return { item: tab.rows[tri].items[idx] };
          }
        }
      } else {
        const idx = row.items.findIndex((it) => it.id === id);
        if (idx >= 0) return { item: row.items[idx] };
      }
    }
    return null;
  };

  const selectComponent = useCallback((id) => setSelection({ type: "component", id }), []);
  const selectTabGroup = useCallback((id) => setSelection({ type: "tabgroup", id }), []);
  const clearSelection = useCallback(() => setSelection(null), []);

  /** Add a new row containing a single item. `scope` null = canvas root, or { tabgroupId }. */
  const addRow = useCallback((type, scope) => {
    const row = makeRow(type);
    setModel((prev) => {
      if (scope) {
        return {
          ...prev,
          rows: prev.rows.map((r) => {
            if (!isTabGroup(r) || r.id !== scope.tabgroupId) return r;
            const active = activeTabOf(r);
            return {
              ...r,
              tabs: r.tabs.map((t) =>
                t.id === active.id ? { ...t, rows: [...t.rows, row] } : t,
              ),
            };
          }),
        };
      }
      return { ...prev, rows: [...prev.rows, row] };
    });
  }, []);

  /** Add a component to an existing (plain) row, rebalancing widths. */
  const addToRow = useCallback((scope, rowIndex, type) => {
    setModel((prev) => {
      const updateList = (list) => {
        const row = list[rowIndex];
        if (!row || row.items.length >= MAX_ITEMS_PER_ROW) return list;
        const width = Math.max(3, Math.floor(12 / (row.items.length + 1)));
        const nextRow = {
          ...row,
          items: [
            ...row.items.map((it) => ({ ...it, width })),
            makeItem(type, width),
          ],
        };
        return list.map((r, i) => (i === rowIndex ? nextRow : r));
      };
      if (scope) {
        return {
          ...prev,
          rows: prev.rows.map((r) => {
            if (!isTabGroup(r) || r.id !== scope.tabgroupId) return r;
            const active = activeTabOf(r);
            return {
              ...r,
              tabs: r.tabs.map((t) => (t.id === active.id ? { ...t, rows: updateList(t.rows) } : t)),
            };
          }),
        };
      }
      return { ...prev, rows: updateList(prev.rows) };
    });
  }, []);

  const removeComponent = useCallback((id) => {
    setModel((prev) => {
      const dropFrom = (row) => rebalance({ ...row, items: row.items.filter((it) => it.id !== id) });
      const rows = [];
      for (const row of prev.rows) {
        if (isTabGroup(row)) {
          const active = activeTabOf(row);
          rows.push({
            ...row,
            tabs: row.tabs.map((t) => {
              if (t.id !== active.id) return t;
              const kept = t.rows
                .map((r) => ({ ...r, items: r.items.filter((it) => it.id !== id) }))
                .filter((r) => r.items.length > 0)
                .map(rebalance);
              return { ...t, rows: kept };
            }),
          });
        } else {
          const kept = row.items.filter((it) => it.id !== id);
          if (kept.length > 0) rows.push(rebalance({ ...row, items: kept }));
        }
      }
      return { ...prev, rows };
    });
    setSelection((cur) => (cur && cur.type === "component" && cur.id === id ? null : cur));
  }, []);

  /** Merge a patch into a component's spec (the ParamMapper write-back path). */
  const updateComponent = useCallback((id, specPatch, metaPatch = {}) => {
    setModel((prev) => ({
      ...prev,
      rows: updateItemInModel(prev.rows, id, (it) => ({
        ...it,
        ...metaPatch,
        spec: { ...it.spec, ...specPatch },
      })),
    }));
  }, []);

  /** Resize a component's column width by `delta` (fr units), clamped 3..12. */
  const resizeItemWidth = useCallback((id, delta) => {
    setModel((prev) => ({
      ...prev,
      rows: updateRowInModel(prev.rows, id, (row) => {
        const idx = row.items.findIndex((it) => it.id === id);
        if (idx < 0) return row;
        const current = row.items[idx].width;
        const next = Math.min(12, Math.max(3, current + delta));
        if (next === current) return row;
        const items = row.items.map((it, i) => {
          if (i === idx) return { ...it, width: next };
          if (row.items.length > 1) {
            const diff = current - next; // positive when shrinking
            return {
              ...it,
              width: Math.min(12, Math.max(3, it.width + (i === (idx + 1) % row.items.length ? diff : 0))),
            };
          }
          return it;
        });
        return { ...row, items };
      }),
    }));
  }, []);

  /** Set the height of a row. `scope` null = canvas root, or { tabgroupId }. */
  const setRowHeight = useCallback((scope, rowIndex, height) => {
    const h = Math.max(MIN_ROW_HEIGHT, height);
    setModel((prev) => {
      if (scope) {
        return {
          ...prev,
          rows: prev.rows.map((r) => {
            if (!isTabGroup(r) || r.id !== scope.tabgroupId) return r;
            const active = activeTabOf(r);
            return {
              ...r,
              tabs: r.tabs.map((t) => {
                if (t.id !== active.id) return t;
                return { ...t, rows: t.rows.map((row, i) => (i === rowIndex ? { ...row, height: h } : row)) };
              }),
            };
          }),
        };
      }
      let plain = -1;
      return {
        ...prev,
        rows: prev.rows.map((r) => {
          if (isTabGroup(r)) return r;
          plain += 1;
          return plain === rowIndex ? { ...r, height: h } : r;
        }),
      };
    });
  }, []);

  /** Reorder `dragId` to sit at the index of `overId` within the same row. */
  const moveComponentWithinRow = useCallback((dragId, overId) => {
    const reorder = (row) => {
      const a = row.items.findIndex((it) => it.id === dragId);
      const b = row.items.findIndex((it) => it.id === overId);
      if (a < 0 || b < 0 || a === b) return row;
      const items = [...row.items];
      const [moved] = items.splice(a, 1);
      items.splice(b, 0, moved);
      return { ...row, items };
    };
    setModel((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => {
        if (isTabGroup(row)) {
          const active = activeTabOf(row);
          return {
            ...row,
            tabs: row.tabs.map((t) =>
              t.id === active.id ? { ...t, rows: t.rows.map(reorder) } : t,
            ),
          };
        }
        return reorder(row);
      }),
    }));
  }, []);

  /** Move `dragId` into `rows[rowIndex]` (for the referenced list), removing it elsewhere. */
  const moveComponentToRow = useCallback((dragId, rowIndex) => {
    const move = (list) => {
      const target = list[rowIndex];
      const loc = locateComponent(list, dragId);
      const item = loc && loc.item;
      if (!target || !item || target.items.length >= MAX_ITEMS_PER_ROW) return list;
      const source = list.map((row) => ({
        ...row,
        items: row.items.filter((it) => it.id !== dragId),
      }));
      return source.map((row, i) => {
        if (i === rowIndex) {
          const each = Math.floor(12 / (row.items.length + 1));
          return {
            ...row,
            items: [...row.items.map((it) => ({ ...it, width: each })), { ...item, width: 12 - each * row.items.length }],
          };
        }
        return row;
      });
    };
    setModel((prev) => ({ ...prev, rows: move(prev.rows) }));
  }, []);

  // ─── Tab group operations ──────────────────────────────────────────────────

  const addTabGroup = useCallback(() => {
    setModel((prev) => ({
      ...prev,
      rows: [...prev.rows, makeTabGroup(prev.rows.filter(isTabGroup).length + 1)],
    }));
  }, []);

  const addTab = useCallback((tabgroupId) => {
    setModel((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (!isTabGroup(r) || r.id !== tabgroupId) return r;
        const tab = makeTab(r.tabs.length);
        return { ...r, tabs: [...r.tabs, tab] };
      }),
    }));
  }, []);

  const removeTab = useCallback((tabgroupId, tabId) => {
    setModel((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (!isTabGroup(r) || r.id !== tabgroupId) return r;
        if (r.tabs.length <= 1) return r; // a tab group always keeps at least one tab
        const tabs = r.tabs.filter((t) => t.id !== tabId);
        let activeTab = r.activeTab;
        if (!tabs.some((t) => t.id === activeTab)) activeTab = tabs[0].id;
        return { ...r, tabs, activeTab };
      }),
    }));
  }, []);

  const renameTab = useCallback((tabgroupId, tabId, name) => {
    setModel((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (!isTabGroup(r) || r.id !== tabgroupId) return r;
        return {
          ...r,
          tabs: r.tabs.map((t) => (t.id === tabId ? { ...t, name, displayName: name } : t)),
        };
      }),
    }));
  }, []);

  const setActiveTab = useCallback((tabgroupId, tabId) => {
    setModel((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        isTabGroup(r) && r.id === tabgroupId ? { ...r, activeTab: tabId } : r,
      ),
    }));
  }, []);

  const renameTabGroup = useCallback((tabgroupId, name) => {
    setModel((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (isTabGroup(r) && r.id === tabgroupId ? { ...r, name } : r)),
    }));
  }, []);

  /** Run the mock "Edit with AI" intent interpreter against the selected card. */
  const applyAiEdit = useCallback(
    async (prompt) => {
      const selId = selection?.type === "component" ? selection.id : null;
      const loc = selId ? locateComponent(model.rows, selId) : null;
      if (!loc) return "Nothing to edit.";
      const { patch, message } = applyAiToSpec(prompt, loc.item.spec || {});
      const { displayName: _d, ...specPatch } = patch;
      updateComponent(selId, {
        ...specPatch,
        ...(patch.displayName ? { title: patch.displayName } : {}),
      });
      return message;
    },
    [model.rows, selection, updateComponent],
  );

  const selectedComponentId = selection?.type === "component" ? selection.id : null;
  const selectedTabGroupId = selection?.type === "tabgroup" ? selection.id : null;

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null;
    const loc = locateComponent(model.rows, selectedComponentId);
    return loc ? loc.item : null;
  }, [model.rows, selectedComponentId]);

  const selectedTabGroup = useMemo(() => {
    if (!selectedTabGroupId) return null;
    return model.rows.find((r) => isTabGroup(r) && r.id === selectedTabGroupId) || null;
  }, [model.rows, selectedTabGroupId]);

  return {
    model,
    selection,
    selectedComponentId,
    selectedComponent,
    selectedTabGroupId,
    selectedTabGroup,
    selectComponent,
    selectTabGroup,
    clearSelection,
    addRow,
    addToRow,
    removeComponent,
    updateComponent,
    resizeItemWidth,
    setRowHeight,
    moveComponentWithinRow,
    moveComponentToRow,
    addTabGroup,
    addTab,
    removeTab,
    renameTab,
    setActiveTab,
    renameTabGroup,
    applyAiEdit,
  };
}

export default useCanvasState;
