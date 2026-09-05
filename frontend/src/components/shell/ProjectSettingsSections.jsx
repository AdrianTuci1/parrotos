import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  GitBranch,
  Copy,
  RefreshCw,
  Search,
  Globe,
} from "lucide-react";
import "@/styles/settings.css";

/**
 * React ports of Rill's project settings sections (web-admin projects/settings).
 *
 * Wired to the existing project settings surface (SettingsView). Mirrors Rill's
 * GitHub connection, visibility, hibernate, environment-variables and public-URLs
 * sections. CRUD flows through the product's mock/dev data path so the surfaces
 * render and mutate in demo mode.
 */

export function ProjectGithubSection() {
  const { currentWorkspace, updateProject } = useAppStore();
  const orgId = currentWorkspace?.organizationId;
  const projectId = currentWorkspace?.id;
  const [connection, setConnection] = useState(
    currentWorkspace?.gitRemote
      ? { connected: true, repo: currentWorkspace.gitRemote, managed: Boolean(currentWorkspace.managedGitId) }
      : { connected: false, repo: "", managed: false },
  );
  const [open, setOpen] = useState(false);
  const [repo, setRepo] = useState("");

  useEffect(() => {
    if (currentWorkspace?.gitRemote) {
      setConnection({ connected: true, repo: currentWorkspace.gitRemote, managed: Boolean(currentWorkspace.managedGitId) });
    }
  }, [currentWorkspace]);

  const connect = async () => {
    const trimmed = repo.trim();
    if (!trimmed) return;
    setConnection({ connected: true, repo: trimmed, managed: false });
    setOpen(false);
    setRepo("");
    await updateProject(orgId, projectId, { gitRemote: trimmed }).catch(() => {});
  };

  const disconnect = async () => {
    setConnection({ connected: false, repo: "", managed: false });
    await updateProject(orgId, projectId, { gitRemote: "" }).catch(() => {});
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">GitHub connection</h3>
            <p className="settings-card-subtitle">
              {connection.connected
                ? `Connected to ${connection.repo}${connection.managed ? " (managed)" : ""}`
                : "Connect a GitHub repository to enable source control for this project."}
            </p>
          </div>
          {!connection.connected ? (
            <button className="settings-btn-primary" onClick={() => setOpen(true)}>
              <GitBranch size={14} /> Connect
            </button>
          ) : (
            <button className="settings-btn-danger-outline" onClick={disconnect}>
              Disconnect
            </button>
          )}
        </div>
        <div className="settings-card-body">
          {connection.connected ? (
            <div className="settings-link-row">
              <div className="settings-link-display">
                <GitBranch size={14} />
                <span className="settings-link-text">{connection.repo}</span>
              </div>
              <button className="settings-btn-icon" title="Copy" onClick={() => { navigator.clipboard.writeText(connection.repo); }}>
                <Copy size={14} />
              </button>
              <button className="settings-btn-secondary" onClick={() => setOpen(true)}>
                Change
              </button>
            </div>
          ) : (
            <p className="settings-placeholder">No GitHub repository connected.</p>
          )}
        </div>
      </div>

      {open && (
        <div className="settings-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <h3 className="settings-overlay-title">Connect GitHub repository</h3>
              <button className="settings-overlay-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="settings-overlay-body">
              <label className="settings-label">Repository URL</label>
              <input
                className="settings-input"
                autoFocus
                placeholder="org/repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") connect(); }}
              />
            </div>
            <div className="settings-overlay-footer">
              <button className="settings-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="settings-btn-primary" onClick={connect} disabled={!repo.trim()}>Connect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectVisibilitySection() {
  const { currentWorkspace, updateProject } = useAppStore();
  const orgId = currentWorkspace?.organizationId;
  const projectId = currentWorkspace?.id;
  const [isPublic, setIsPublic] = useState(Boolean(currentWorkspace?.public));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setIsPublic(Boolean(currentWorkspace?.public)); }, [currentWorkspace]);

  const toggle = async () => {
    const next = !isPublic;
    setSaving(true);
    await updateProject(orgId, projectId, { public: next }).catch(() => {});
    setIsPublic(next);
    setSaving(false);
  };

  return (
    <div className="settings-card settings-card-danger">
      <div className="settings-danger-row">
        <div className="settings-danger-text">
          <h3 className="settings-card-title">
            Project visibility · {isPublic ? "Public" : "Private"}
          </h3>
          <p className="settings-card-subtitle">
            {isPublic
              ? "Anyone with the link can view this project's dashboards."
              : "Only invited members can access this project."}
          </p>
        </div>
        <button className="settings-btn-secondary" onClick={toggle} disabled={saving}>
          {isPublic ? "Make private" : "Make public"}
        </button>
      </div>
    </div>
  );
}

export function ProjectHibernateSection() {
  const { currentWorkspace } = useAppStore();
  const [hibernated, setHibernated] = useState(Boolean(currentWorkspace?.hibernated));
  const [open, setOpen] = useState(false);

  useEffect(() => { setHibernated(Boolean(currentWorkspace?.hibernated)); }, [currentWorkspace]);

  const hibernate = () => { setHibernated(true); setOpen(false); };
  const resume = () => setHibernated(false);

  return (
    <div className="settings-card settings-card-danger">
      <div className="settings-danger-row">
        <div className="settings-danger-text">
          <h3 className="settings-card-title">Hibernate project</h3>
          <p className="settings-card-subtitle">
            {hibernated
              ? "This project is stopped. Start it to resume computation."
              : "Stop the project to pause computation and billing for this environment."}
          </p>
        </div>
        {hibernated ? (
          <button className="settings-btn-primary" onClick={resume}>Start project</button>
        ) : (
          <button className="settings-btn-danger" onClick={() => setOpen(true)}>Hibernate</button>
        )}
      </div>

      {open && (
        <div className="settings-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <h3 className="settings-overlay-title">Hibernate project</h3>
              <button className="settings-overlay-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="settings-overlay-body">
              <p className="settings-overlay-copy">
                Are you sure you want to hibernate{" "}
                <strong>{currentWorkspace?.name || "this project"}</strong>? It will
                stop serving queries until restarted.
              </p>
            </div>
            <div className="settings-overlay-footer">
              <button className="settings-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="settings-btn-danger" onClick={hibernate}>Hibernate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ENV_ENVIRONMENTS = [
  { value: "UNDEFINED", label: "Default" },
  { value: "PRODUCTION", label: "Production" },
  { value: "DEVELOPMENT", label: "Development" },
];
const DEFAULT_KEYS = [
  { key: "API_BASE_URL", value: "https://api.example.com", environment: "DEVELOPMENT" },
  { key: "STRIPE_KEY", value: "pk_live_xxx", environment: "PRODUCTION" },
  { key: "LOG_LEVEL", value: "info", environment: "UNDEFINED" },
];

export function ProjectEnvironmentVariablesSection() {
  const { currentWorkspace } = useAppStore();
  const [variables, setVariables] = useState(() => currentWorkspace?.environmentVariables || DEFAULT_KEYS.map((v) => ({ ...v })));
  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", value: "", environment: "UNDEFINED" });

  const filtered = useMemo(() => {
    return variables
      .filter((v) => v.key.toLowerCase().includes(search.toLowerCase()))
      .filter((v) => envFilter.length === 0 || envFilter.includes(v.environment) || (envFilter.includes("UNDEFINED") && v.environment === "UNDEFINED"))
      .sort((a, b) => (b.updatedOn || 0) - (a.updatedOn || 0));
  }, [variables, search, envFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", value: "", environment: "UNDEFINED" });
    setOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v.key);
    setForm({ name: v.key, value: v.value, environment: v.environment });
    setOpen(true);
  };

  const save = () => {
    const name = form.name.trim();
    if (!name) return;
    if (editing) {
      setVariables((prev) => prev.map((v) => (v.key === editing ? { ...v, key: name, value: form.value, environment: form.environment, updatedOn: Date.now() } : v)));
    } else {
      setVariables((prev) => [{ key: name, value: form.value, environment: form.environment, updatedOn: Date.now() }, ...prev]);
    }
    setOpen(false);
  };

  const remove = (key) => setVariables((prev) => prev.filter((v) => v.key !== key));

  const toggleEnvFilter = (env) =>
    setEnvFilter((prev) => (prev.includes(env) ? prev.filter((e) => e !== env) : [...prev, env]));

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Environment variables</h3>
            <p className="settings-card-subtitle">Credentials and configuration scoped per environment.</p>
          </div>
          <button className="settings-btn-primary" onClick={openAdd}>
            <Plus size={14} /> New key
          </button>
        </div>
        <div className="settings-card-body">
          <div className="settings-toolbar">
            <div className="settings-search">
              <Search size={14} />
              <input
                className="settings-input"
                placeholder="Search keys…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="settings-filter-chips">
              {ENV_ENVIRONMENTS.map((env) => (
                <button
                  key={env.value}
                  type="button"
                  className={"settings-filter-chip" + (envFilter.includes(env.value) ? " active" : "")}
                  onClick={() => toggleEnvFilter(env.value)}
                >
                  {env.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-env-table">
            <div className="settings-env-table-row settings-env-table-head">
              <span>Key</span>
              <span>Environment</span>
              <span>Value</span>
              <span style={{ width: 80 }} />
            </div>
            {filtered.length ? (
              filtered.map((v) => (
                <div className="settings-env-table-row" key={v.key}>
                  <span className="settings-mono">{v.key}</span>
                  <span><span className="settings-status-chip">{ENV_ENVIRONMENTS.find((e) => e.value === v.environment)?.label || "Default"}</span></span>
                  <span className="settings-mono settings-truncate">{v.value}</span>
                  <span className="settings-row-actions">
                    <button className="settings-btn-icon" onClick={() => openEdit(v)} title="Edit"><Pencil size={14} /></button>
                    <button className="settings-btn-icon" onClick={() => remove(v.key)} title="Delete"><Trash2 size={14} /></button>
                  </span>
                </div>
              ))
            ) : (
              <p className="settings-placeholder">No environment variables match the current filters.</p>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="settings-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <h3 className="settings-overlay-title">{editing ? "Edit" : "Add"} environment variable</h3>
              <button className="settings-overlay-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="settings-overlay-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="settings-field" style={{ padding: 0 }}>
                <label className="settings-label">Key</label>
                <input className="settings-input" autoFocus placeholder="MY_VAR" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))} />
              </div>
              <div className="settings-field" style={{ padding: 0 }}>
                <label className="settings-label">Value</label>
                <input className="settings-input" placeholder="Value" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="settings-field" style={{ padding: 0 }}>
                <label className="settings-label">Environment</label>
                <select className="settings-select" value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}>
                  {ENV_ENVIRONMENTS.map((env) => <option key={env.value} value={env.value}>{env.label}</option>)}
                </select>
              </div>
            </div>
            <div className="settings-overlay-footer">
              <button className="settings-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="settings-btn-primary" onClick={save} disabled={!form.name.trim()}>{editing ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_PUBLIC_URLS = [
  { id: "url_1", token: "pk_ab12cd", label: "Revenue dashboard", resource: "orders_metrics", createdAt: "2026-06-01T10:00:00Z", filters: [{ column: "channel", value: "Online" }] },
  { id: "url_2", token: "pk_ef34gh", label: "Country breakdown", resource: "orders_metrics", createdAt: "2026-06-05T14:30:00Z", filters: [] },
];

export function ProjectPublicURLsSection() {
  const { currentWorkspace, generatePublicLink, revokePublicLink, regeneratePublicLink } = useAppStore();
  const orgId = currentWorkspace?.organizationId;
  const projectId = currentWorkspace?.id;
  const [urls, setUrls] = useState(currentWorkspace?.publicURLs || DEFAULT_PUBLIC_URLS.map((u) => ({ ...u })));
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", resource: "orders_metrics" });

  const filtered = useMemo(
    () => urls.filter((u) => u.label.toLowerCase().includes(search.toLowerCase()) || u.resource.toLowerCase().includes(search.toLowerCase())),
    [urls, search],
  );

  const createUrl = async () => {
    const label = form.label.trim();
    const result = await generatePublicLink(orgId, projectId).catch(() => null);
    const newUrl = {
      id: `url_${Date.now()}`,
      token: result?.token || "pk_" + Math.random().toString(36).substring(2, 8),
      label: label || "New public URL",
      resource: form.resource,
      createdAt: new Date().toISOString(),
      filters: [],
      url: result?.url,
    };
    setUrls((prev) => [newUrl, ...prev]);
    setOpen(false);
    setForm({ label: "", resource: "orders_metrics" });
  };

  const revoke = async (u) => {
    await revokePublicLink(orgId, projectId).catch(() => {});
    setUrls((prev) => prev.filter((item) => item.id !== u.id));
  };

  const regenerate = async (u) => {
    const result = await regeneratePublicLink(orgId, projectId).catch(() => null);
    setUrls((prev) => prev.map((item) => item.id === u.id ? { ...item, token: result?.token || item.token } : item));
  };

  const copy = (u) => {
    const link = u.url || `${window.location.origin}/p/${u.token}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Public URLs</h3>
            <p className="settings-card-subtitle">Shared read-only links into this project.</p>
          </div>
          <button className="settings-btn-primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> New public URL
          </button>
        </div>
        <div className="settings-card-body">
          <div className="settings-search" style={{ marginBottom: 12 }}>
            <Search size={14} />
            <input className="settings-input" placeholder="Search public URLs…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {filtered.length ? (
            filtered.map((u) => (
              <div className="settings-card-row" key={u.id}>
                <div className="settings-card-row-text">
                  <div className="settings-card-row-title">{u.label}</div>
                  <div className="settings-card-row-desc">
                    <Globe size={12} style={{ verticalAlign: "middle" }} /> {u.resource} · /p/{u.token}
                    {u.filters?.length ? ` · ${u.filters.length} filter${u.filters.length === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                <div className="settings-card-row-right settings-row-actions">
                  <button className="settings-btn-icon" title="Copy link" onClick={() => copy(u)}><Copy size={14} /></button>
                  <button className="settings-btn-icon" title="Regenerate token" onClick={() => regenerate(u)}><RefreshCw size={14} /></button>
                  <button className="settings-btn-icon" title="Revoke" onClick={() => revoke(u)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          ) : (
            <p className="settings-placeholder">No public URLs yet. Create one to share read-only analytics.</p>
          )}
        </div>
      </div>

      {open && (
        <div className="settings-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <h3 className="settings-overlay-title">Create public URL</h3>
              <button className="settings-overlay-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="settings-overlay-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="settings-field" style={{ padding: 0 }}>
                <label className="settings-label">Label</label>
                <input className="settings-input" autoFocus placeholder="Shared dashboard" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
              </div>
              <div className="settings-field" style={{ padding: 0 }}>
                <label className="settings-label">Resource</label>
                <select className="settings-select" value={form.resource} onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))}>
                  <option value="orders_metrics">orders_metrics</option>
                  <option value="customers_metrics">customers_metrics</option>
                </select>
              </div>
            </div>
            <div className="settings-overlay-footer">
              <button className="settings-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="settings-btn-primary" onClick={createUrl}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
