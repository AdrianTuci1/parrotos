import { useEffect } from "react";
import { useCanvasState } from "@/components/canvas/useCanvasState";
import { CanvasGrid } from "@/components/canvas/CanvasGrid";
import { AddComponentMenu } from "@/components/canvas/AddComponentMenu";
import { ComponentEditor } from "@/components/canvas/ComponentEditor";
import { TabGroupEditor } from "@/components/canvas/TabGroupEditor";
import "@/styles/canvas-editor.css";

/**
 * Rill-style canvas editor surface. Hosts the builder toolbar, the card grid, and the
 * per-card / per-tab-group inspector. The same select / edit / add / remove / reorder /
 * resize / AI-edit interactions Rill surfaces in its Canvas workspace, persisted to
 * localStorage in mock mode.
 */
export function CanvasEditor({ canvasName }) {
  const {
    model,
    selectedComponentId,
    selectedComponent,
    selectedTabGroupId,
    selectedTabGroup,
    selectComponent,
    selectTabGroup,
    clearSelection,
    addRow,
    addToRow,
    addTabGroup,
    addTab,
    removeTab,
    renameTab,
    setActiveTab,
    renameTabGroup,
    removeComponent,
    updateComponent,
    resizeItemWidth,
    setRowHeight,
    moveComponentWithinRow,
    applyAiEdit,
  } = useCanvasState(canvasName);

  // Esc closes the inspector, unless a form field has focus.
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      clearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection]);

  const handlePick = (type) => {
    addRow(type);
  };

  const inspector = selectedComponent ? (
    <ComponentEditor
      key={selectedComponent.id}
      component={selectedComponent}
      onClose={clearSelection}
      onChange={(specPatch) => updateComponent(selectedComponent.id, specPatch)}
      onDelete={() => removeComponent(selectedComponent.id)}
      onAiEdit={applyAiEdit}
    />
  ) : selectedTabGroup ? (
    <TabGroupEditor
      key={selectedTabGroup.id}
      group={selectedTabGroup}
      onClose={clearSelection}
      onRename={renameTabGroup}
      onAddTab={addTab}
      onRemoveTab={removeTab}
      onRenameTab={renameTab}
      onSetActive={setActiveTab}
      onAddRow={(type) => addRow(type, { tabgroupId: selectedTabGroup.id })}
    />
  ) : null;

  return (
    <div className="canvas-editor">
      <div className="canvas-editor-toolbar">
        <div className="canvas-editor-toolbar-left">
          <span className="canvas-editor-name">{canvasName}</span>
          <span className="canvas-editor-hint">Editing mode</span>
        </div>
        <AddComponentMenu onPick={handlePick} onTabGroup={addTabGroup} />
      </div>

      <div className="canvas-editor-body">
        <div className="canvas-editor-canvas">
          <CanvasGrid
            model={model}
            selectedComponentId={selectedComponentId}
            selectedTabGroupId={selectedTabGroupId}
            onSelectComponent={selectComponent}
            onSelectTabGroup={selectTabGroup}
            onSetActiveTab={setActiveTab}
            onAddTab={addTab}
            onDelete={removeComponent}
            onAddRow={addRow}
            onAddToRow={addToRow}
            onMoveWithinRow={moveComponentWithinRow}
            onResizeWidth={resizeItemWidth}
            onSetRowHeight={setRowHeight}
          />
          <div className="canvas-editor-tip">
            Select a card to edit it, drag the handle to reorder, drag card edges to resize.
          </div>
        </div>

        {inspector}
      </div>
    </div>
  );
}

export default CanvasEditor;
