import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { SettingsSidebar } from "@/components/shell/SettingsSidebar";
import {
  Link as LinkIcon,
  RefreshCw,
  Trash2,
  Check,
  Copy,
  X,
  Users,
  Bell,
  Shield,
  Database,
  Globe,
  Pencil,
} from "lucide-react";
import "@/styles/settings.css";

const projectSettingsItems = [
  { id: "general", label: "General", icon: <Globe size={16} /> },
  { id: "team", label: "Team", icon: <Users size={16} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  { id: "integrations", label: "Integrations & Hooks", icon: <LinkIcon size={16} /> },
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
  const { currentWorkspace, updateProject } = useAppStore();
  const [name, setName] = useState(currentWorkspace?.name || "");
  const [desc, setDesc] = useState(currentWorkspace?.description || "");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!currentWorkspace) return;
    await updateProject(currentWorkspace.organizationId, currentWorkspace.id, {
      name: name.trim(),
      description: desc.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <SectionHeader title="General" description="Project name, description, and public domain." />

      <div className="settings-card">
        <div className="settings-field">
          <label className="settings-label">Project name</label>
          <input
            className="settings-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
          />
        </div>
        <div className="settings-field">
          <label className="settings-label">Description</label>
          <textarea
            className="settings-input settings-textarea"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Short description"
            rows={3}
          />
        </div>
        <div className="settings-card-actions">
          <button className="settings-btn-primary" onClick={handleSave} disabled={saved}>
            {saved ? <><Check size={14} /> Saved</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicLinkRow() {
  const { currentWorkspace, generatePublicLink, revokePublicLink, regeneratePublicLink } = useAppStore();
  const [link, setLink] = useState(currentWorkspace?.publicLink?.url || "");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!currentWorkspace) return;
    const result = await generatePublicLink(currentWorkspace.organizationId, currentWorkspace.id);
    setLink(result?.url || "");
  };
  const handleRegenerate = async () => {
    if (!currentWorkspace) return;
    const result = await regeneratePublicLink(currentWorkspace.organizationId, currentWorkspace.id);
    setLink(result?.url || "");
  };
  const handleRevoke = async () => {
    if (!currentWorkspace) return;
    await revokePublicLink(currentWorkspace.organizationId, currentWorkspace.id);
    setLink("");
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-header-text">
          <h3 className="settings-card-title">Public Link</h3>
          <p className="settings-card-subtitle">Share read-only analytics without login.</p>
        </div>
      </div>
      <div className="settings-card-body">
        {link ? (
          <div className="settings-link-row">
            <div className="settings-link-display">
              <span className="settings-link-text">{link}</span>
            </div>
            <button className="settings-btn-icon" onClick={handleCopy} title="Copy">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button className="settings-btn-icon" onClick={handleRegenerate} title="Regenerate">
              <RefreshCw size={14} />
            </button>
            <button className="settings-btn-danger-outline" onClick={handleRevoke}>Revoke</button>
          </div>
        ) : (
          <button className="settings-btn-secondary" onClick={handleGenerate}>Generate Public Link</button>
        )}
      </div>
    </div>
  );
}

function PlaceholderSection({ title, description }) {
  return (
    <div className="settings-page">
      <SectionHeader title={title} description={description} />
      <div className="settings-card">
        <p className="settings-placeholder">This section is under construction.</p>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div className="settings-page">
      <SectionHeader title="Integrations & Hooks" description="Incoming webhooks and outgoing connectors." />

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Webhook URL</h3>
            <p className="settings-card-subtitle">POST events to this endpoint to ingest data.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <div className="settings-link-row">
            <div className="settings-link-display">
              <span className="settings-link-text">https://api.parrot.io/v1/hooks/ingest/{'{projectId}'}</span>
            </div>
            <button className="settings-btn-icon" title="Copy">
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Connected Sources</h3>
            <p className="settings-card-subtitle">Live integrations feeding this project.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <p className="settings-placeholder">No sources connected yet. Use the Sources tab to connect.</p>
        </div>
      </div>
    </div>
  );
}

function DangerSection() {
  const { currentWorkspace, deleteProject } = useAppStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleDelete = async () => {
    if (!currentWorkspace) return;
    try {
      await deleteProject(currentWorkspace.organizationId, currentWorkspace.id);
      setOpen(false);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="settings-page">
      <SectionHeader title="Danger Zone" description="Irreversible actions for this project." />

      <div className="settings-card settings-card-danger">
        <div className="settings-danger-row">
          <div className="settings-danger-text">
            <h3 className="settings-card-title">Delete Project</h3>
            <p className="settings-card-subtitle">Permanently delete {currentWorkspace?.name || "this project"} and all associated data.</p>
          </div>
          <button className="settings-btn-danger" onClick={() => setOpen(true)}>Delete Project</button>
        </div>
      </div>

      {open && (
        <div className="settings-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <h3 className="settings-overlay-title">Delete Project</h3>
              <button className="settings-overlay-close" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="settings-overlay-body">
              <p className="settings-overlay-copy">
                This action cannot be undone. Type <strong>{currentWorkspace?.name}</strong> to confirm.
              </p>
              <input
                type="text"
                className="settings-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Type ${currentWorkspace?.name} to confirm`}
                autoFocus
              />
            </div>
            <div className="settings-overlay-footer">
              <button className="settings-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="settings-btn-danger" disabled={input !== currentWorkspace?.name} onClick={handleDelete}>
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="settings-layout">
      <SettingsSidebar items={projectSettingsItems} activeId={activeTab} onChange={setActiveTab} />
      <div className="settings-main">
        {activeTab === "general" && (
          <>
            <SectionHeader title="Settings" description="Manage project configuration, team access, and integrations." />
            <GeneralSection />
            <PublicLinkRow />
          </>
        )}
        {activeTab === "team" && <PlaceholderSection title="Team" description="Invite and manage project members." />}
        {activeTab === "notifications" && <PlaceholderSection title="Notifications" description="Configure alerts and routing." />}
        {activeTab === "integrations" && <IntegrationsSection />}
        {activeTab === "danger" && <DangerSection />}
      </div>
    </div>
  );
}
