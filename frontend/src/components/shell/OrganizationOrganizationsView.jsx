import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Plus, ExternalLink } from 'lucide-react';
import { SectionHeader } from '@/components/shell/OrganizationSettingsView';
import { CreateWorkspaceModal } from './workspaces/CreateWorkspaceModal';
import { WorkspaceRow } from './workspaces/WorkspaceRow';
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

export function OrganizationOrganizationsView() {
  const navigate = useNavigate();
  const {
    organizations,
    currentUser,
    currentOrganization,
    createOrganization,
    leaveOrganization,
    switchOrganization,
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

  const handleManageMembers = (id) => {
    if (id !== currentOrganization?.id) {
      switchOrganization(id);
    }
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
            href="https://docs.statsparrot.com/workspaces"
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
              <WorkspaceRow
                key={org.id}
                org={org}
                role={getRole(org)}
                copiedId={copiedId}
                leavingId={leavingId}
                onCopyId={handleCopyId}
                onManageMembers={handleManageMembers}
                onLeave={handleLeave}
              />
            ))}
          </tbody>
        </table>
      </div>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onCreate={handleCreate}
        isCreating={isCreating}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
      />
    </div>
  );
}
