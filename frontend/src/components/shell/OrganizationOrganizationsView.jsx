import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { ViewFrame } from '@/components/shell/ViewFrame';
import {
  Building2,
  ArrowLeft,
  Trash2,
  Plus,
  Check,
  Mail,
  Folder,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import '@/styles/organization-views.css';

export function OrganizationOrganizationsView() {
  const navigate = useNavigate();
  const {
    organizations,
    currentOrganization,
    currentUser,
    createOrganization: storeCreateOrg,
    deleteOrganization,
    updateOrganization,
  } = useAppStore();
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [creating, setCreating] = useState(false);

  // Deletion confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');

  // Inline editing fields
  const [editName, setEditName] = useState('');
  const [dirty, setDirty] = useState(false);

  // Create form fields
  const [createName, setCreateName] = useState('');

  const handleEditSave = async (id, data) => {
    try {
      await updateOrganization(id, data);
      setSelectedOrg((prev) => prev ? { ...prev, ...data } : prev);
      setDirty(false);
    } catch (err) {
      alert('Failed to update workspace: ' + err.message);
    }
  };

  const handleMakeDefault = async () => {
    try {
      await updateOrganization(selectedOrg.id, { isDefault: true });
      const updatedOrgs = useAppStore.getState().organizations.map((o) =>
        o.id === selectedOrg.id ? { ...o, isDefault: true } : { ...o, isDefault: false }
      );
      useAppStore.setState({ organizations: updatedOrgs });
      setSelectedOrg((prev) => prev ? { ...prev, isDefault: true } : prev);
      setDirty(false);
    } catch (err) {
      alert('Failed to set default workspace: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    const org = organizations.find((o) => o.id === id);
    if (org?.isDefault) return;
    try {
      await deleteOrganization(id);
      setSelectedOrg(null);
    } catch (err) {
      alert('Failed to delete workspace: ' + err.message);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      await storeCreateOrg(createName.trim());
      setCreating(false);
      setCreateName('');
    } catch (err) {
      alert('Failed to create workspace: ' + err.message);
    }
  };

  const openDetail = (org) => {
    setSelectedOrg(org);
    setEditName(org.name);
    setDirty(false);
  };

  // Detail / inline edit view
  if (selectedOrg) {
    return (
      <ViewFrame
        title={selectedOrg.name}
        description="Edit workspace details and settings."
        maxWidthClassName="max-w-3xl"
      >
        <div className="org-detail-shell">
          <button className="org-back-btn" onClick={() => setSelectedOrg(null)}>
            <ArrowLeft size={15} />
            <span>All workspaces</span>
          </button>

          {/* General */}
          <div className="org-edit-section">
            <div className="org-edit-header">
              <Building2 size={14} />
              <span>General</span>
            </div>
            <div className="org-edit-fields">
              <label className="org-modal-field">
                <span className="org-modal-field-label">Name</span>
                <Input className="org-modal-input" value={editName} onChange={(e) => { setEditName(e.target.value); setDirty(true); }} placeholder="Workspace name" />
              </label>
            </div>
            {dirty && (
              <div className="org-detail-save-bar">
                <span className="org-save-hint">Unsaved changes</span>
                <div className="org-detail-save-actions">
                  <button className="org-btn-secondary" onClick={() => { setEditName(selectedOrg.name); setDirty(false); }}>Cancel</button>
                  <button className="org-btn-primary" onClick={() => { handleEditSave(selectedOrg.id, { name: editName }); setDirty(false); }}><Check size={14} /> Save</button>
                </div>
              </div>
            )}
          </div>

          {/* Default Workspace Setting */}
          <div className="org-edit-section">
            <div className="org-edit-header">
              <Check size={14} />
              <span>Default Workspace</span>
            </div>
            <div className="org-edit-fields">
              {selectedOrg.isDefault ? (
                <div className="overlay-connection-badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                  <Check size={14} style={{ color: '#3b82f6', marginRight: '6px' }} />
                  <span style={{ fontSize: '13px', color: '#ffffff' }}>This is your default workspace</span>
                </div>
              ) : (
                <div className="org-edit-danger-row" style={{ border: 'none', padding: 0 }}>
                  <div style={{ flex: 1 }}>
                    <div className="org-edit-danger-label" style={{ color: '#ffffff' }}>Set as default workspace</div>
                    <div className="org-edit-danger-desc">
                      This workspace will load automatically when you sign in.
                    </div>
                  </div>
                  <button
                    className="org-btn-secondary"
                    type="button"
                    style={{ flexShrink: 0 }}
                    onClick={handleMakeDefault}
                  >
                    Make default
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ownership */}
          <div className="org-edit-section">
            <div className="org-edit-header">
              <Mail size={14} />
              <span>Ownership</span>
            </div>
            <div className="org-edit-fields">
              <div className="org-edit-danger-row" style={{ border: 'none', padding: 0 }}>
                <div>
                  <div className="org-edit-danger-label" style={{ color: '#ffffff' }}>Account owner</div>
                  <div className="org-edit-danger-desc">
                    {currentUser?.email || 'Signed-in account'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="org-edit-section">
            <div className="org-edit-header">
              <Trash2 size={14} />
              <span>Danger zone</span>
            </div>
            <div className="org-edit-fields">
              <div className="org-edit-danger-row">
                <div>
                  <div className="org-edit-danger-label">Delete this workspace</div>
                  <div className="org-edit-danger-desc">
                    {selectedOrg.isDefault
                      ? "This is your default workspace and cannot be deleted."
                      : "Permanently remove this workspace and all its projects."}
                  </div>
                </div>
                <button
                  className="org-btn-danger"
                  disabled={selectedOrg.isDefault}
                  style={selectedOrg.isDefault ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                  onClick={() => {
                    setDeleteConfirmOpen(true);
                    setDeleteInputText('');
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>

          {deleteConfirmOpen && (
            <div className="overlay-backdrop" onClick={() => setDeleteConfirmOpen(false)}>
              <div className="overlay-modal" onClick={(e) => e.stopPropagation()}>
                <button className="overlay-close-btn" onClick={() => setDeleteConfirmOpen(false)}>
                  <X size={16} />
                </button>
                <div className="overlay-header">
                  <h3 className="overlay-title">Are you sure?</h3>
                  <p className="overlay-description" style={{ color: '#ef4444', fontWeight: 500 }}>
                    This action is permanent and cannot be undone. All projects and telemetry data associated with this workspace will be permanently deleted.
                  </p>
                </div>
                <div className="overlay-body">
                  <div className="overlay-form-group">
                    <label className="overlay-form-label" style={{ color: '#8e918f', marginBottom: '8px' }}>
                      Please type <strong style={{ color: '#ffffff' }}>{selectedOrg.name}</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      className="overlay-input"
                      value={deleteInputText}
                      onChange={(e) => setDeleteInputText(e.target.value)}
                      placeholder="Type workspace name"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overlay-footer">
                  <button className="overlay-cancel-btn" onClick={() => setDeleteConfirmOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="overlay-delete-btn"
                    disabled={deleteInputText !== selectedOrg.name}
                    onClick={() => {
                      handleDelete(selectedOrg.id);
                      setDeleteConfirmOpen(false);
                    }}
                  >
                    Delete Workspace
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ViewFrame>
    );
  }

  // Create inline view
  if (creating) {
    return (
      <ViewFrame
        title="New workspace"
        description="Set up a new workspace for your account."
        maxWidthClassName="max-w-3xl"
      >
        <div className="org-detail-shell">
          <button className="org-back-btn" onClick={() => { setCreating(false); setCreateName(''); }}>
            <ArrowLeft size={15} />
            <span>All workspaces</span>
          </button>

          <div className="org-edit-section">
            <div className="org-edit-fields">
              <label className="org-modal-field">
                <span className="org-modal-field-label">Name</span>
                <Input className="org-modal-input" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Workspace name" />
              </label>
            </div>
            <div className="org-edit-actions">
              <button className="org-btn-secondary" onClick={() => { setCreating(false); setCreateName(''); setCreatePlan('Starter'); }}>Cancel</button>
              <button className="org-btn-primary" onClick={handleCreate}><Plus size={14} /> Create</button>
            </div>
          </div>
        </div>
      </ViewFrame>
    );
  }

  // List view
  return (
    <ViewFrame
      title="Workspace"
      description={
        <span>
          Switch between or manage all workspaces under your account.{" "}
          <a
            href="#learn-more"
            onClick={(e) => {
              e.preventDefault();
              alert("Opening workspace guide...");
            }}
            style={{ color: "#3b82f6", textDecoration: "none" }}
            onMouseOver={(e) => e.target.style.textDecoration = "underline"}
            onMouseOut={(e) => e.target.style.textDecoration = "none"}
          >
            Learn more.
          </a>
        </span>
      }
      maxWidthClassName="max-w-3xl"
    >
      <div className="org-list-header-row">
        <span className="org-list-select-label">Select a workspace</span>
        <button className="org-list-add-btn" onClick={() => setCreating(true)}>
          New workspace
        </button>
      </div>

      <div className="org-stack">
        {organizations.map((org) => {
          const isCurrent = org.id === currentOrganization.id;
          return (
            <div
              key={org.id}
              onClick={() => openDetail(org)}
              className="org-card-item"
            >
                <div className="org-card-left">
                  <Folder size={16} className="org-card-folder-icon" />
                  <div className="org-card-names-group">
                    <span className="org-card-primary-name">{org.name}</span>
                  </div>
                </div>
              <div className="org-card-right">
                <button
                  className={`org-card-circle-action ${isCurrent ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Select this workspace
                    useAppStore.getState().selectOrganization(org.id);
                    const oSlug = org.slug || org.id;
                    navigate(`/app/${oSlug}/stats`);
                  }}
                  title={isCurrent ? "Active Workspace" : "Select Workspace"}
                >
                  {isCurrent ? <Check size={14} /> : <Plus size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </ViewFrame>
  );
}
