import { useState, useEffect } from 'react';
import { ViewFrame } from '@/components/shell/ViewFrame';
import {
  Check,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  FolderPlus,
  FolderEdit,
  UserCog,
  RefreshCw,
  Copy
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import '@/styles/organization-views.css';

const DEFAULT_SERVICE_ACCOUNTS = [
  { id: '1', name: 'alex_parker', saId: 'sa_alex_parker_8a92', status: 'Active', password: 'password123', isProjectScoped: false, permissions: { createProject: true, editProject: true, manageUsers: true }, projectAccess: {}, clientSecret: 'sec_live_alex4a921b7c8d9e2f5a6b3c' },
  { id: '2', name: 'maria_popescu', saId: 'sa_maria_popescu_1b29', status: 'Active', password: 'securePassword!', isProjectScoped: true, permissions: { createProject: false, editProject: true, manageUsers: false }, projectAccess: { 'pixtooth': 'Read & Write' }, clientSecret: 'sec_live_maria1b293c8d4e9f7a5b6c3d' },
  { id: '3', name: 'andrei_ionescu', saId: 'sa_andrei_ionescu_5c93', status: 'Active', password: 'telemetryPassWord', isProjectScoped: true, permissions: { createProject: false, editProject: false, manageUsers: false }, projectAccess: { 'staticlabs': 'Read Only' }, clientSecret: 'sec_live_andrei5c934d9f8e7b6c5d4a3b' },
  { id: '4', name: 'elena_dumitrescu', saId: 'sa_elena_dumitrescu_3f22', status: 'Active', password: 'botPassword789', isProjectScoped: false, permissions: { createProject: false, editProject: false, manageUsers: false }, projectAccess: {}, clientSecret: 'sec_live_elena3f225d9f7e8b6c5d4a3b' },
];

// Separate page view component for editing/creating service accounts
function ServiceAccountEditPage({ member, workspaces, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(member?.name || '');
  const [password, setPassword] = useState(member?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isProjectScoped, setIsProjectScoped] = useState(member?.isProjectScoped ?? false);
  const [permissions, setPermissions] = useState(
    member?.permissions || { createProject: false, editProject: false, manageUsers: false }
  );
  const [projectAccess, setProjectAccess] = useState(member?.projectAccess || {});
  
  // API Token state
  const [clientSecret, setClientSecret] = useState(member?.clientSecret || `sec_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const toggleProject = (projectId) => {
    setProjectAccess(prev => {
      const updated = { ...prev };
      if (updated[projectId]) {
        delete updated[projectId];
      } else {
        updated[projectId] = 'Read & Write';
      }
      return updated;
    });
  };

  const handleAccessTypeChange = (projectId, type) => {
    setProjectAccess(prev => ({
      ...prev,
      [projectId]: type
    }));
  };

  const handleNameChange = (val) => {
    const formatted = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    setName(formatted);
  };

  const regenerateSecret = () => {
    const newSecret = `sec_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`;
    setClientSecret(newSecret);
    alert("API Token regenerated successfully. Please update your client integrations with the new secret.");
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(clientSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: member?.id || `sa_${Date.now()}`,
      name: name.trim(),
      saId: member?.saId || `sa_${Math.random().toString(36).substring(2, 10)}`,
      password,
      isProjectScoped,
      permissions,
      projectAccess: isProjectScoped ? projectAccess : {},
      clientSecret,
      status: member?.status || 'Active'
    });
  };

  return (
    <div className="sa-edit-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px 0' }}>
      {/* Top action row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <button onClick={onCancel} className="settings-btn-secondary" style={{ padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          ← Back to Service Accounts
        </button>
        {member && (
          <button
            type="button"
            onClick={() => onDelete(member.id)}
            className="settings-btn-danger"
            style={{ padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)' }}
          >
            <Trash2 size={14} />
            Delete Account
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>
            {member ? 'Service Account Details' : 'Create Service Account'}
          </h3>
          <p style={{ fontSize: '12.5px', color: '#8e918f' }}>
            Manage credentials, credentials rotation, administrative rights, and project scopes.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Credentials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '500px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px', marginBottom: '4px' }}>
              1. Credentials & Identity
            </h4>
            
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#8e918f', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Name (lowercase, no spaces)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. github_action"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#8e918f', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Account Password
              </label>
              <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set account password"
                  style={{ width: '100%', padding: '10px 14px', paddingRight: '40px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#8e918f', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#8e918f', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                API Token (Credential Secret)
              </label>
              <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  readOnly
                  value={clientSecret}
                  style={{ width: '100%', padding: '10px 14px', paddingRight: '70px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)', background: 'rgba(255,255,255,0.02)', color: '#ffffff', fontSize: '12px', fontFamily: 'monospace' }}
                />
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    style={{ background: 'transparent', border: 'none', color: '#8e918f', cursor: 'pointer' }}
                    title={showSecret ? "Hide secret" : "Show secret"}
                  >
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    style={{ background: 'transparent', border: 'none', color: '#8e918f', cursor: 'pointer' }}
                    title="Copy API Token"
                  >
                    {copiedSecret ? <Check size={15} style={{ color: '#10b981' }} /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={regenerateSecret}
                className="settings-btn-secondary"
                style={{ marginTop: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={11} />
                Regenerate / Rotate API Token
              </button>
            </div>
          </div>

          {/* Section 2: Administrative Permissions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px', marginBottom: '4px' }}>
              2. Administrative Rights
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '550px' }}>
              {/* Create Projects */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', background: permissions.createProject ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <input
                  type="checkbox"
                  id="perm-create"
                  checked={permissions.createProject}
                  onChange={(e) => setPermissions({ ...permissions, createProject: e.target.checked })}
                  style={{ marginTop: '3px', width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
                />
                <label htmlFor="perm-create" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block' }}>Create Project workspaces</span>
                  <span style={{ fontSize: '11.5px', color: '#8e918f' }}>Allows this service account to initialize and connect new projects.</span>
                </label>
              </div>

              {/* Edit Projects */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', background: permissions.editProject ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <input
                  type="checkbox"
                  id="perm-edit"
                  checked={permissions.editProject}
                  onChange={(e) => setPermissions({ ...permissions, editProject: e.target.checked })}
                  style={{ marginTop: '3px', width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
                />
                <label htmlFor="perm-edit" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block' }}>Edit Project workspaces</span>
                  <span style={{ fontSize: '11.5px', color: '#8e918f' }}>Allows this service account to configure connection settings and telemetry parameters.</span>
                </label>
              </div>

              {/* Manage Users */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', background: permissions.manageUsers ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <input
                  type="checkbox"
                  id="perm-users"
                  checked={permissions.manageUsers}
                  onChange={(e) => setPermissions({ ...permissions, manageUsers: e.target.checked })}
                  style={{ marginTop: '3px', width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
                />
                <label htmlFor="perm-users" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', display: 'block' }}>Manage Organization Access & Users</span>
                  <span style={{ fontSize: '11.5px', color: '#8e918f' }}>Allows this service account to create, edit, or delete other API tokens and service accounts.</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Project Access */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px', marginBottom: '4px' }}>
              3. Project Access Scopes
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <input
                type="checkbox"
                id="project-scoped-toggle"
                checked={isProjectScoped}
                onChange={(e) => setIsProjectScoped(e.target.checked)}
                style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <label htmlFor="project-scoped-toggle" style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', cursor: 'pointer' }}>
                Limit Access to Specific Projects (Project Scoped)
              </label>
            </div>

            {isProjectScoped ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', animation: 'fadeIn 0.2s ease' }}>
                {workspaces.map((project) => {
                  const isChecked = !!projectAccess[project.id];
                  const accessType = projectAccess[project.id] || 'Read & Write';

                  return (
                    <div
                      key={project.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isChecked ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                        border: isChecked ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProject(project.id)}
                          style={{ width: '15px', height: '15px', borderRadius: '3px', cursor: 'pointer' }}
                        />
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: isChecked ? '#ffffff' : '#8e918f' }}>
                            {project.name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#8e918f', marginLeft: '6px' }}>
                            ({project.domain})
                          </span>
                        </div>
                      </div>

                      {isChecked && (
                        <select
                          value={accessType}
                          onChange={(e) => handleAccessTypeChange(project.id, e.target.value)}
                          style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#111214', color: '#ffffff', fontSize: '11px' }}
                        >
                          <option value="Read & Write">Read & Write</option>
                          <option value="Read Only">Read Only</option>
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#8e918f', margin: 0 }}>
                This user has global access permissions to read and write to all project workspaces.
              </p>
            )}
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
            <button
              type="button"
              onClick={onCancel}
              className="settings-btn-secondary"
              style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="stripe-portal-btn"
              style={{ padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Check size={14} />
              Save Service Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrganizationAccessView() {
  const { workspaces, currentOrganization, serviceAccounts, fetchServiceAccounts, createServiceAccount, updateServiceAccount, deleteServiceAccount, devMode, demoMode } = useAppStore();
  
  // Filter workspaces belonging to the active organization (or default to all if none match)
  const orgWorkspaces = workspaces.filter(w => w.organizationId === currentOrganization?.id) || workspaces;

  // Use mock data in dev/demo mode when store has no service accounts
  const effectiveServiceAccounts = (devMode || demoMode) && (!serviceAccounts || serviceAccounts.length === 0)
    ? DEFAULT_SERVICE_ACCOUNTS
    : (serviceAccounts || []);

  const [members, setMembers] = useState(effectiveServiceAccounts);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    if (currentOrganization?.id && !devMode && !demoMode) {
      fetchServiceAccounts(currentOrganization.id);
    }
  }, [currentOrganization?.id, devMode, demoMode]);

  useEffect(() => {
    setMembers(effectiveServiceAccounts);
  }, [serviceAccounts, devMode, demoMode]);

  const handleSaveMember = async (member) => {
    if (editingMember) {
      await updateServiceAccount(currentOrganization?.id, member.id, member);
    } else {
      await createServiceAccount(currentOrganization?.id, member);
    }
    setEditingMember(null);
    setIsEditingMode(false);
  };

  const handleDeleteMember = async (memberId) => {
    if (confirm("Are you sure you want to delete this service account? Access keys will be invalidated immediately.")) {
      await deleteServiceAccount(currentOrganization?.id, memberId);
      setEditingMember(null);
      setIsEditingMode(false);
    }
  };

  const openAddMember = () => {
    setEditingMember(null);
    setIsEditingMode(true);
  };

  const openEditMember = (member) => {
    setEditingMember(member);
    setIsEditingMode(true);
  };

  return (
    <ViewFrame
      title="Access Management"
      description="Manage organization API service accounts, telemetry keys, and project access credentials."
      maxWidthClassName="max-w-3xl"
    >
      {isEditingMode ? (
        <ServiceAccountEditPage
          member={editingMember}
          workspaces={orgWorkspaces}
          onSave={handleSaveMember}
          onDelete={handleDeleteMember}
          onCancel={() => {
            setEditingMember(null);
            setIsEditingMode(false);
          }}
        />
      ) : (
        <>
          <div className="org-metrics-row">
            <div className="org-metric-item">
              <span className="org-metric-label">Active Accounts</span>
              <span className="org-metric-value">{members.length}</span>
            </div>
          </div>

          {/* Service Accounts list view directly */}
          <div className="org-list-container" style={{ marginTop: '16px' }}>
            <div className="org-list-header-row" style={{ marginTop: 0 }}>
              <span className="org-list-select-label">Service Accounts</span>
              <button className="org-list-add-btn" onClick={openAddMember}>
                Create Service Account
              </button>
            </div>

            <div className="org-stack">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="org-card-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openEditMember(member)}
                >
                  <div className="org-card-left">
                    <div className="org-avatar" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                      {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="org-row-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '600', color: '#ffffff' }}>{member.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="org-card-right">
                    <Pencil size={14} className="org-hover-pencil" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </ViewFrame>
  );
}
