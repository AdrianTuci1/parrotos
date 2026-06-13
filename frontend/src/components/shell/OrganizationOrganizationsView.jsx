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
    const plans = ['Starter', 'Growth', 'Scale', 'Agency'];
    return (
      <ViewFrame
        title={selectedOrg.name}
        description="Edit organization details and settings."
        maxWidthClassName="max-w-7xl"
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
                  <button className="org-btn-secondary" onClick={() => { setEditName(selectedOrg.name); setEditPlan(selectedOrg.plan); setEditOwner(selectedOrg.owner); setDirty(false); }}>Cancel</button>
                  <button className="org-btn-primary" onClick={() => { handleEditSave(selectedOrg.id, { name: editName, plan: editPlan, owner: editOwner }); setDirty(false); }}><Check size={14} /> Save</button>
                </div>
              </div>
            )}
          </div>

          {/* Plan */}
          <div className="org-edit-section">
            <div className="org-edit-header">
              <CreditCard size={14} />
              <span>Plan</span>
            </div>
            <div className="org-edit-fields">
              <label className="org-modal-field">
                <span className="org-modal-field-label">Subscription plan</span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="org-edit-dropdown-trigger"
                  >
                    <span>{editPlan}</span>
                    <ChevronDown size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="org-edit-dropdown-content">
                    {plans.map((p) => (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => { setEditPlan(p); setDirty(true); }}
                        className="org-edit-dropdown-item"
                      >
                        {editPlan === p && <Check size={13} />}
                        <span style={editPlan === p ? { color: '#f3f4f6' } : {}}>{p}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </label>
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
                  onClick={() => { if (window.confirm(`Delete "${selectedOrg.name}"?`)) handleDelete(selectedOrg.id); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
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
        maxWidthClassName="max-w-7xl"
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
              <label className="org-modal-field">
                <span className="org-modal-field-label">Plan</span>
                <select className="org-form-select" value={createPlan} onChange={(e) => setCreatePlan(e.target.value)}>
                  <option value="Starter">Starter</option>
                  <option value="Growth">Growth</option>
                  <option value="Scale">Scale</option>
                  <option value="Agency">Agency</option>
                </select>
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
      maxWidthClassName="max-w-7xl"
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
