import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { SettingsSidebar } from "@/components/shell/SettingsSidebar";
import { OrganizationBillingView } from "@/components/shell/OrganizationBillingView";
import {
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  Trash2,
  Check,
  X,
  Plus,
  MoreHorizontal,
  Shield,
  Lock,
  Eye,
} from "lucide-react";
import "@/styles/settings.css";

const orgSettingsItems = [
  { id: "general", label: "General", icon: <Building2 size={16} /> },
  { id: "members", label: "Members", icon: <Users size={16} /> },
  { id: "billing", label: "Billing", icon: <CreditCard size={16} /> },
  { id: "security", label: "Security", icon: <ShieldCheck size={16} /> },
  { id: "danger", label: "Danger Zone", icon: <Trash2 size={16} /> },
];

function SectionHeader({ title, description }) {
  return (
    <div className="settings-page-header">
      <h1 className="settings-page-title">{title}</h1>
      {description && <p className="settings-page-desc">{description}</p>}
    </div>
  );
}

function GeneralSection() {
  const { currentOrganization, updateOrganization } = useAppStore();
  const [name, setName] = useState(currentOrganization?.name || "");
  const [defaultRole, setDefaultRole] = useState(currentOrganization?.settings?.defaultRole || "Member");
  const [retention, setRetention] = useState(currentOrganization?.settings?.retention || "90 days");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      setDefaultRole(currentOrganization?.settings?.defaultRole || "Member");
      setRetention(currentOrganization?.settings?.retention || "90 days");
      setName(currentOrganization?.name || "");
    }
  }, [currentOrganization]);

  const handleSave = async () => {
    if (!currentOrganization) return;
    await updateOrganization(currentOrganization.id, {
      name: name.trim(),
      settings: { ...currentOrganization.settings, defaultRole, retention },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Row = ({ title, desc, right }) => (
    <div className="settings-card-row">
      <div className="settings-card-row-text">
        <div className="settings-card-row-title">{title}</div>
        <div className="settings-card-row-desc">{desc}</div>
      </div>
      <div className="settings-card-row-right">{right}</div>
    </div>
  );

  return (
    <div className="settings-page">
      <SectionHeader title="General" description="Organization name, default roles, and governance rules." />

      <div className="settings-card">
        <div className="settings-field">
          <label className="settings-label">Organization display name</label>
          <div className="settings-input-row">
            <input className="settings-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" />
            <button className="settings-btn-primary" onClick={handleSave} disabled={saved}>
              {saved ? <><Check size={14} /> Saved</> : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Defaults</h3>
            <p className="settings-card-subtitle">Values applied to new members and projects.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <Row
            title="Default member role"
            desc="Role assigned to new team members"
            right={
              <select
                className="settings-select"
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value)}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </select>
            }
          />
          <Row
            title="Data retention policy"
            desc="Automatic data archiving and cleanup"
            right={
              <select
                className="settings-select"
                value={retention}
                onChange={(e) => setRetention(e.target.value)}
              >
                <option value="30 days">30 days</option>
                <option value="90 days">90 days</option>
                <option value="1 year">1 year</option>
              </select>
            }
          />
        </div>
      </div>
    </div>
  );
}

function MembersSection() {
  const { currentOrganization, currentUser, members, fetchMembers, addMember, removeMember, updateMember, cancelInvitation } = useAppStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchMembers(currentOrganization.id).catch(() => {});
    }
  }, [currentOrganization?.id]);

  const handleInvite = async () => {
    if (!email.trim() || !currentOrganization) return;
    setError("");
    setLoading(true);
    try {
      await addMember(currentOrganization.id, email.trim(), role);
      setEmail("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to invite member.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!currentOrganization) return;
    try {
      await updateMember(currentOrganization.id, userId, newRole);
    } catch (err) {
      setError(err.message || "Failed to update role.");
    }
  };

  const handleRemove = async (userId) => {
    if (!currentOrganization || userId === currentUser?.id) return;
    try {
      await removeMember(currentOrganization.id, userId);
    } catch (err) {
      setError(err.message || "Failed to remove member.");
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!currentOrganization) return;
    try {
      await cancelInvitation(currentOrganization.id, invitationId);
    } catch (err) {
      setError(err.message || "Failed to cancel invitation.");
    }
  };

  return (
    <div className="settings-page">
      <SectionHeader title="Members" description="Invite and manage team members." />

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Invite member</h3>
            <p className="settings-card-subtitle">Send an invitation by email. Existing users join immediately.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <div className="settings-input-row" style={{ marginBottom: 12 }}>
            <input
              className="settings-input"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
            />
            <select className="settings-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button className="settings-btn-primary" onClick={handleInvite} disabled={loading || saved}>
              {saved ? <><Check size={14} /> Invited</> : <><Plus size={14} /> Invite</>}
            </button>
          </div>
          {error && <span className="create-project-error">{error}</span>}
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Team members</h3>
            <p className="settings-card-subtitle">{members.length} member{members.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="settings-card-body">
          {(members || []).map((member) => {
            const isInvitation = member.invitationId != null;
            const key = member.userId || member.invitationId;
            return (
              <div className="settings-card-row" key={key}>
                <div className="settings-card-row-text">
                  <div className="settings-card-row-title">{member.email}</div>
                  <div className="settings-card-row-desc">
                    {member.role}
                    {isInvitation ? " · invitation pending" : ` · joined ${new Date(member.joinedAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="settings-card-row-right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {member.userId === currentUser?.id ? (
                    <span className="settings-card-row-desc">You</span>
                  ) : (
                    <>
                      <select
                        className="settings-select"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                        disabled={isInvitation}
                      >
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                      <button
                        className="settings-btn-icon"
                        title={isInvitation ? "Cancel invitation" : "Remove member"}
                        onClick={() => isInvitation ? handleCancelInvitation(member.invitationId) : handleRemove(member.userId)}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  const { currentOrganization, fetchSecuritySettings, updateSecuritySettings } = useAppStore();
  const [settings, setSettings] = useState({
    require2FA: false,
    ssoEnabled: false,
    ssoProvider: "",
    auditLogRetention: "90 days",
    allowedDomains: "",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchSecuritySettings(currentOrganization.id).then((s) => {
        setSettings({
          require2FA: s.require2FA || false,
          ssoEnabled: s.ssoEnabled || false,
          ssoProvider: s.ssoProvider || "",
          auditLogRetention: s.auditLogRetention || "90 days",
          allowedDomains: (s.allowedDomains || []).join(", "),
        });
      }).catch(() => {});
    }
  }, [currentOrganization?.id]);

  const handleSave = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      await updateSecuritySettings(currentOrganization.id, {
        require2FA: settings.require2FA,
        ssoEnabled: settings.ssoEnabled,
        ssoProvider: settings.ssoProvider,
        auditLogRetention: settings.auditLogRetention,
        allowedDomains: settings.allowedDomains.split(",").map(d => d.trim()).filter(Boolean),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // handled by store
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ icon, title, desc, checked, onChange }) => (
    <div className="settings-card-row">
      <div className="settings-card-row-text" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="org-stat-icon-box" style={{ borderRadius: 10, width: 36, height: 36 }}>{icon}</div>
        <div>
          <div className="settings-card-row-title">{title}</div>
          <div className="settings-card-row-desc">{desc}</div>
        </div>
      </div>
      <div className="settings-card-row-right">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      <SectionHeader title="Security" description="SSO, audit logs, and access policies." />

      <div className="settings-card">
        <div className="settings-card-body">
          <Toggle
            icon={<Lock size={18} />}
            title="Require two-factor authentication"
            desc="All members must enable 2FA to access this organization."
            checked={settings.require2FA}
            onChange={(v) => setSettings((s) => ({ ...s, require2FA: v }))}
          />
          <Toggle
            icon={<Shield size={18} />}
            title="Enable SSO"
            desc="Authenticate members through a single sign-on provider."
            checked={settings.ssoEnabled}
            onChange={(v) => setSettings((s) => ({ ...s, ssoEnabled: v }))}
          />
          <Toggle
            icon={<Eye size={18} />}
            title="Audit log retention"
            desc="Keep audit logs for the selected duration."
            checked={settings.auditLogRetention !== "30 days"}
            onChange={(v) => setSettings((s) => ({ ...s, auditLogRetention: v ? "90 days" : "30 days" }))}
          />
        </div>
      </div>

      {settings.ssoEnabled && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-header-text">
              <h3 className="settings-card-title">SSO configuration</h3>
              <p className="settings-card-subtitle">Provider and allowed domains.</p>
            </div>
          </div>
          <div className="settings-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="settings-field" style={{ padding: 0 }}>
              <label className="settings-label">SSO provider</label>
              <input
                className="settings-input"
                placeholder="e.g. Google Workspace, Okta"
                value={settings.ssoProvider}
                onChange={(e) => setSettings((s) => ({ ...s, ssoProvider: e.target.value }))}
              />
            </div>
            <div className="settings-field" style={{ padding: 0 }}>
              <label className="settings-label">Allowed email domains (comma separated)</label>
              <input
                className="settings-input"
                placeholder="example.com, acme.com"
                value={settings.allowedDomains}
                onChange={(e) => setSettings((s) => ({ ...s, allowedDomains: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      <div className="settings-card-actions">
        <button className="settings-btn-primary" onClick={handleSave} disabled={loading || saved}>
          {saved ? <><Check size={14} /> Saved</> : "Save security settings"}
        </button>
      </div>
    </div>
  );
}

function DangerSection() {
  const { currentOrganization, deleteOrganization } = useAppStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleDelete = async () => {
    if (!currentOrganization) return;
    try {
      await deleteOrganization(currentOrganization.id);
      setOpen(false);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="settings-page">
      <SectionHeader title="Danger Zone" description="Irreversible actions for this organization." />

      <div className="settings-card settings-card-danger">
        <div className="settings-danger-row">
          <div className="settings-danger-text">
            <h3 className="settings-card-title">Delete Organization</h3>
            <p className="settings-card-subtitle">Permanently delete {currentOrganization?.name || "this organization"} and all projects inside it.</p>
          </div>
          <button className="settings-btn-danger" onClick={() => setOpen(true)}>Delete Organization</button>
        </div>
      </div>

      {open && (
        <div className="settings-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <h3 className="settings-overlay-title">Delete Organization</h3>
              <button className="settings-overlay-close" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="settings-overlay-body">
              <p className="settings-overlay-copy">
                This action cannot be undone. Type <strong>{currentOrganization?.name}</strong> to confirm.
              </p>
              <input
                type="text"
                className="settings-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Type ${currentOrganization?.name} to confirm`}
                autoFocus
              />
            </div>
            <div className="settings-overlay-footer">
              <button className="settings-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="settings-btn-danger" disabled={input !== currentOrganization?.name} onClick={handleDelete}>
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrganizationSettingsView() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="settings-layout">
      <SettingsSidebar items={orgSettingsItems} activeId={activeTab} onChange={setActiveTab} />
      <div className="settings-main">
        {activeTab === "general" && (
          <>
            <SectionHeader title="Settings" description="Configure account-level defaults and governance." />
            <GeneralSection />
          </>
        )}
        {activeTab === "members" && <MembersSection />}
        {activeTab === "billing" && <OrganizationBillingView embedded />}
        {activeTab === "security" && <SecuritySection />}
        {activeTab === "danger" && <DangerSection />}
      </div>
    </div>
  );
}
