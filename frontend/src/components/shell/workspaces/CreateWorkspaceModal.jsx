import { Input } from "@/components/ui/input";

export function CreateWorkspaceModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  isCreating, 
  newWorkspaceName, 
  setNewWorkspaceName 
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="org-modal-backdrop" onClick={onClose} />
      <div className="org-modal-frame">
        <div className="org-modal" onClick={(e) => e.stopPropagation()}>
          <div className="org-modal-header">
            <h3 className="org-modal-title">Create Workspace</h3>
            <p className="org-modal-description">
              Create a new workspace for your organization.
            </p>
          </div>
          <div className="org-modal-body">
            <div className="org-modal-field">
              <label className="org-modal-field-label">Name</label>
              <Input
                className="org-modal-input"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name"
                onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }}
                autoFocus
              />
            </div>
          </div>
          <div className="org-modal-footer">
            <button className="org-modal-secondary-btn" onClick={onClose} disabled={isCreating}>
              Cancel
            </button>
            <button className="org-modal-primary-btn" onClick={onCreate} disabled={isCreating || !newWorkspaceName.trim()}>
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
