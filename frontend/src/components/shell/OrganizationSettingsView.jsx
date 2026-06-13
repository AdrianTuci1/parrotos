import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ViewFrame } from '@/components/shell/ViewFrame';
import {
  Globe,
  Bell,
  ShieldCheck,
  Database,
  RefreshCw,
  ToggleLeft,
  Check,
  X,
  Pencil
} from 'lucide-react';
import '@/styles/organization-views.css';
import '@/styles/settings.css';

export function OrganizationSettingsView() {
  const { currentOrganization, organizationMetrics, updateOrganization, fetchSubscription } = useAppStore();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  // Interactive local states for simplified metrics cycling
  const [defaultRole, setDefaultRole] = useState(currentOrganization?.settings?.defaultRole || 'Member');
  const [retention, setRetention] = useState(currentOrganization?.settings?.retention || '90 days');
  const [autoInvite, setAutoInvite] = useState(currentOrganization?.settings?.autoInviteDomains?.length > 0 || false);

  useEffect(() => {
    if (currentOrganization?.id) {
      setDefaultRole(currentOrganization?.settings?.defaultRole || 'Member');
      setRetention(currentOrganization?.settings?.retention || '90 days');
      setAutoInvite((currentOrganization?.settings?.autoInviteDomains || []).length > 0);
    }
  }, [currentOrganization]);

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    try {
      await updateOrganization(currentOrganization.id, { name: nameValue.trim() });
      setEditingName(false);
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  const handleSaveSettings = async (key, value) => {
    try {
      const settings = {
        ...currentOrganization.settings,
        [key]: value,
      };
      await updateOrganization(currentOrganization.id, { settings });
    } catch (err) {
      alert('Failed to update settings: ' + err.message);
    }
  };

  return (
    <ViewFrame
      title="Organization Settings"
      description="Configure account-level defaults, governance rules, and managed infrastructure preferences."
      maxWidthClassName="max-w-3xl"
    >
      <div className="org-metrics-row">
        <div className="org-metric-item">
          <span className="org-metric-label">Policies</span>
          <span className="org-metric-value">6</span>
        </div>
        <div className="org-metric-item">
          <span className="org-metric-label">Pending</span>
          <span className="org-metric-value">2</span>
        </div>
        <div className="org-metric-item">
          <span className="org-metric-label">Warehouse</span>
          <span className="org-metric-value">
            {organizationMetrics?.warehouseConsumption?.value || '3.8 TB'}
          </span>
        </div>
      </div>

      <div className="org-gap-4">
        <div className="org-list-container">
          <div className="org-list-header-row" style={{ marginTop: 0 }}>
            <span className="org-list-select-label">General Settings</span>
          </div>

          <div className="org-stack">
            {/* Row 1: Organization Display Name */}
            <div
              className="org-card-item"
              style={{ cursor: editingName ? "default" : "pointer" }}
              onClick={() => {
                if (!editingName) {
                  setNameValue(currentOrganization.name);
                  setEditingName(true);
                }
              }}
            >
              <div className="org-card-left">
                <Globe size={16} className="org-card-folder-icon" />
                <div>
                  <div className="org-row-name">Organization display name</div>
                  {editingName ? (
                    <div
                      style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        className="org-modal-input"
                        style={{ width: '100%', maxWidth: '240px' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                      />
                      <button
                        className="org-modal-primary-btn"
                        style={{ height: '30px', padding: '0 12px', minWidth: 'auto', borderRadius: '6px', fontSize: '11px' }}
                        onClick={handleSaveName}
                      >
                        Save
                      </button>
                      <button
                        className="org-modal-secondary-btn"
                        style={{ height: '30px', padding: '0 12px', minWidth: 'auto', borderRadius: '6px', fontSize: '11px' }}
                        onClick={() => setEditingName(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="org-row-meta">{currentOrganization.name}</div>
                  )}
                </div>
              </div>
              {!editingName && (
                <div className="org-card-right">
                  <Pencil size={14} className="org-hover-pencil" />
                </div>
              )}
            </div>

            {/* Row 2: Notification Preferences */}
            <div
              className="org-card-item"
              style={{ cursor: "pointer" }}
              onClick={() => alert("Opening notification preference dashboard...")}
            >
              <div className="org-card-left">
                <Bell size={16} className="org-card-folder-icon" />
                <div>
                  <div className="org-row-name">Notification preferences</div>
                  <div className="org-row-meta">Email and Slack alert routing</div>
                </div>
              </div>
              <div className="org-card-right">
                <span className="org-role-permissions-text">Configured</span>
                <Pencil size={14} className="org-hover-pencil" />
              </div>
            </div>

            {/* Row 3: Default Member Role */}
            <div
              className="org-card-item"
              style={{ cursor: "pointer" }}
              onClick={() => {
                const rolesCycle = { 'Member': 'Admin', 'Admin': 'Viewer', 'Viewer': 'Member' };
                const newRole = rolesCycle[defaultRole];
                setDefaultRole(newRole);
                handleSaveSettings('defaultRole', newRole);
              }}
            >
              <div className="org-card-left">
                <ShieldCheck size={16} className="org-card-folder-icon" />
                <div>
                  <div className="org-row-name">Default member role</div>
                  <div className="org-row-meta">Role assigned to new team members</div>
                </div>
              </div>
              <div className="org-card-right">
                <span className="org-role-permissions-text" style={{ color: "#a8c7fa" }}>{defaultRole}</span>
                <Pencil size={14} className="org-hover-pencil" />
              </div>
            </div>

            {/* Row 4: Data Retention Policy */}
            <div
              className="org-card-item"
              style={{ cursor: "pointer" }}
              onClick={() => {
                const retentionCycle = { '90 days': '180 days', '180 days': '365 days', '365 days': '30 days', '30 days': '90 days' };
                const newRetention = retentionCycle[retention];
                setRetention(newRetention);
                handleSaveSettings('retention', newRetention);
              }}
            >
              <div className="org-card-left">
                <Database size={16} className="org-card-folder-icon" />
                <div>
                  <div className="org-row-name">Data retention policy</div>
                  <div className="org-row-meta">Automatic data archiving and cleanup</div>
                </div>
              </div>
              <div className="org-card-right">
                <span className="org-role-permissions-text" style={{ color: "#a8c7fa" }}>{retention}</span>
                <Pencil size={14} className="org-hover-pencil" />
              </div>
            </div>

            {/* Row 5: Auto-invite domains */}
            <div
              className="org-card-item"
              style={{ cursor: "pointer" }}
              onClick={() => {
                const newAutoInvite = !autoInvite;
                setAutoInvite(newAutoInvite);
                handleSaveSettings('autoInviteDomains', newAutoInvite ? [currentOrganization?.domain || 'example.com'] : []);
              }}
            >
              <div className="org-card-left">
                <ToggleLeft size={16} className="org-card-folder-icon" />
                <div>
                  <div className="org-row-name">Auto-invite domains</div>
                  <div className="org-row-meta">Allow auto-join from verified domains</div>
                </div>
              </div>
              <div className="org-card-right">
                <button
                  type="button"
                  className={`settings-toggle ${autoInvite ? "active" : ""}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="settings-toggle-dot" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ViewFrame>
  );
}
