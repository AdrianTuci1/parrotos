import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { ViewFrame } from '@/components/shell/ViewFrame';
import {
  Building2,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Plus,
  Check,
  ChevronDown,
  UserPlus,
  Mail,
  CreditCard,
  Folder,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import '@/styles/organization-views.css';

export function OrganizationOrganizationsView() {
  const navigate = useNavigate();
  const {
    organizations,
    currentOrganization,
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
  const [editPlan, setEditPlan] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [dirty, setDirty] = useState(false);

  // Create form fields
  const [createName, setCreateName] = useState('');
  const [createPlan, setCreatePlan] = useState('Starter');

  const handleEditSave = async (id, data) => {
    try {
      await updateOrganization(id, data);
      setSelectedOrg((prev) => prev ? { ...prev, ...data } : prev);
      setDirty(false);
    } catch (err) {
      alert('Failed to update organization: ' + err.message);
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
      alert('Failed to set default organization: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    const org = organizations.find((o) => o.id === id);
    if (org?.isDefault) return;
    try {
      await deleteOrganization(id);
      setSelectedOrg(null);
    } catch (err) {
      alert('Failed to delete organization: ' + err.message);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      await storeCreateOrg(createName.trim());
      setCreating(false);
      setCreateName('');
      setCreatePlan('Starter');
    } catch (err) {
      alert('Failed to create organization: ' + err.message);
    }
  };

  const openDetail = (org) => {
    setSelectedOrg(org);
    setEditName(org.name);
    setEditPlan(org.plan);
    setEditOwner(org.owner);
    setDirty(false);
  };

  // Detail / inline edit view
  if (selectedOrg) {
    return (
      <ViewFrame
        title={selectedOrg.name}
        description="Edit organization details and settings."
        maxWidthClassName="max-w-3xl"
      >
        <div className="org-detail-shell">
          <button className="org-back-btn" onClick={() => setSelectedOrg(null)}>
            <ArrowLeft size={15} />
            <span>All organizations</span>
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
                <Input className="org-modal-input" value={editName} onChange={(e) => { setEditName(e.target.value); setDirty(true); }} placeholder="Organization name" />
              </label>
            </div>
            {dirty && (
              <div className="org-detail-save-bar">
                <span className="org-save-hint">Unsaved changes</span>
                <div className="org-detail-save-actions">
                  <button className="org-btn-secondary" onClick={() => { setEditName(selectedOrg.name); setEditOwner(selectedOrg.owner); setDirty(false); }}>Cancel</button>
                  <button className="org-btn-primary" onClick={() => { handleEditSave(selectedOrg.id, { name: editName, owner: editOwner }); setDirty(false); }}><Check size={14} /> Save</button>
                </div>
              </div>
            )}
          </div>

          {/* Default Organization Setting */}
          <div className="org-edit-section">
            <div className="org-edit-header">
              <Check size={14} />
              <span>Default Organization</span>
            </div>
            <div className="org-edit-fields">
              {selectedOrg.isDefault ? (
                <div className="overlay-connection-badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                  <Check size={14} style={{ color: '#3b82f6', marginRight: '6px' }} />
                  <span style={{ fontSize: '13px', color: '#ffffff' }}>This is your default organization</span>
                </div>
              ) : (
                <div className="org-edit-danger-row" style={{ border: 'none', padding: 0 }}>
                  <div style={{ flex: 1 }}>
                    <div className="org-edit-danger-label" style={{ color: '#ffffff' }}>Set as default organization</div>
                    <div className="org-edit-danger-desc">
                      This organization will load automatically when you sign in.
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
              <label className="org-modal-field">
                <span className="org-modal-field-label">Owner email</span>
                <div className="org-edit-owner-row">
                  <Input className="org-modal-input" value={editOwner} onChange={(e) => { setEditOwner(e.target.value); setDirty(true); }} placeholder="owner@example.com" />
                  <button className="org-btn-secondary" style={{ flexShrink: 0 }} onClick={() => setDirty(true)}>
                    <UserPlus size={13} />
                    Transfer
                  </button>
                </div>
              </label>
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
                  <div className="org-edit-danger-label">Delete this organization</div>
                  <div className="org-edit-danger-desc">
                    {selectedOrg.isDefault
                      ? "This is your default organization and cannot be deleted."
                      : "Permanently remove this organization and all its projects."}
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
                    This action is permanent and cannot be undone. All projects and telemetry data associated with this organization will be permanently deleted.
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
                      placeholder="Type organization name"
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
                    Delete Organization
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
        title="New organization"
        description="Set up a new organization for your account."
        maxWidthClassName="max-w-3xl"
      >
        <div className="org-detail-shell">
          <button className="org-back-btn" onClick={() => { setCreating(false); setCreateName(''); setCreatePlan('Starter'); }}>
            <ArrowLeft size={15} />
            <span>All organizations</span>
          </button>

          <div className="org-edit-section">
            <div className="org-edit-fields">
              <label className="org-modal-field">
                <span className="org-modal-field-label">Name</span>
                <Input className="org-modal-input" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Organization name" />
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
      title="Organizations"
      description={
        <span>
          Switch between or manage all organizations under your account.{" "}
          <a
            href="#learn-more"
            onClick={(e) => {
              e.preventDefault();
              alert("Opening organizations guide...");
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
        <span className="org-list-select-label">Select an organization</span>
        <button className="org-list-add-btn" onClick={() => setCreating(true)}>
          New organization
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
                  <span className="org-card-secondary-name">
                    {org.owner ? org.owner.split('@')[0] : 'owner'}
                  </span>
                </div>
              </div>
              <div className="org-card-right">
                <button
                  className={`org-card-circle-action ${isCurrent ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Select this organization
                    useAppStore.getState().selectOrganization(org.id);
                    const oSlug = org.slug || org.id;
                    navigate(`/app/${oSlug}/stats`);
                  }}
                  title={isCurrent ? "Active Organization" : "Select Organization"}
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
