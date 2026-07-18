import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import {
  Plus,
  Copy,
  ExternalLink,
  Users,
  LogOut,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/shell/OrganizationSettingsView';
import '@/styles/organization-views.css';
import { cn } from '@/lib/utils';

function stringToGradient(seed = "") {
  let hash = 0;
  const s = String(seed || "default");
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 45) % 360;
  const h3 = (h1 + 90) % 360;
  return `linear-gradient(135deg, hsl(${h1} 75% 55%), hsl(${h2} 70% 45%), hsl(${h3} 75% 35%))`;
}

function WorkspaceAvatar({ id }) {
  return (
    <div
      className="workspace-avatar"
      style={{ background: stringToGradient(id) }}
    />
  );
}

export function OrganizationOrganizationsView() {
  const navigate = useNavigate();
  const {
    organizations,
    currentUser,
    createOrganization,
    leaveOrganization,
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);

  const handleCopyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    setError('');
    setIsCreating(true);
    try {
      await createOrganization(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLeave = async (org) => {
    if (org.isDefault) return;
    setError('');
    setLeavingId(org.id);
    try {
      await leaveOrganization(org.id);
    } catch (err) {
      setError(err.message || 'Failed to leave workspace.');
    } finally {
      setLeavingId(null);
    }
  };

  const handleManageMembers = () => {
    navigate('/settings/workspace/management');
  };

  const closeModal = () => {
    if (isCreating) return;
    setIsModalOpen(false);
    setNewWorkspaceName('');
    setError('');
  };

  const getRole = (org) => {
    if (org.role) return org.role;
    if (org.owner && currentUser?.email && org.owner !== currentUser.email) return 'Member';
    return 'Owner';
  };

  return (
    <div className="settings-page workspaces-page">
      <div className="workspaces-header">
        <SectionHeader
          title="Workspaces"
          description="Manage your workspace memberships."
        />
        <div className="workspaces-header-actions">
          <a
            href="https://docs.parrot.com/workspaces"
            target="_blank"
            rel="noreferrer"
            className="workspaces-docs-link"
          >
            <ExternalLink size={14} />
            Docs
          </a>
          <button
            className="settings-btn-primary workspaces-create-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={14} />
            Create Workspace
          </button>
        </div>
      </div>

      {error && <span className="create-project-error">{error}</span>}

      <div className="settings-card workspaces-table-card">
        <table className="workspaces-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Role</th>
              <th className="workspaces-actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id}>
                <td>
                  <div className="workspace-cell">
                    <WorkspaceAvatar id={org.id} />
                    <span className="workspace-name">{org.name}</span>
                    {org.isDefault && (
                      <span className="workspace-badge">personal</span>
                    )}
                  </div>
                </td>
                <td className="workspace-role">{getRole(org)}</td>
                <td className="workspace-actions">
                  <button
                    className="workspace-action-btn"
                    onClick={() => handleCopyId(org.id)}
                  >
                    <Copy size={14} />
                    {copiedId === org.id ? 'Copied' : 'Copy ID'}
                  </button>
                  {!org.isDefault && (
                    <button
                      className="workspace-action-btn"
                      onClick={() => handleManageMembers(org.id)}
                    >
                      <Users size={14} />
                      Manage members
                    </button>
                  )}
                  <button
                    className={cn(
                      'workspace-action-btn workspace-leave-btn',
                      org.isDefault && 'disabled'
                    )}
                    disabled={org.isDefault || leavingId === org.id}
                    onClick={() => handleLeave(org)}
                    title={org.isDefault ? 'Cannot leave default workspace' : 'Leave workspace'}
                  >
                    <LogOut size={14} />
                    {leavingId === org.id ? 'Leaving...' : 'Leave'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <>
          <div className="org-modal-backdrop" onClick={closeModal} />
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
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                    autoFocus
                  />
                </div>
              </div>
              <div className="org-modal-footer">
                <button className="org-modal-secondary-btn" onClick={closeModal} disabled={isCreating}>
                  Cancel
                </button>
                <button className="org-modal-primary-btn" onClick={handleCreate} disabled={isCreating || !newWorkspaceName.trim()}>
                  {isCreating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
