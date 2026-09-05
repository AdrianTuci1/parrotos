import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { RuntimeMetricsCard } from "@/components/shell/RuntimeMetricsCard";
import {
  Check,
  X,
  Plus,
  Image,
  Globe,
  Trash2,
  ExternalLink,
} from "lucide-react";
import "@/styles/settings.css";

/**
 * React ports of Rill's org settings sections (web-admin organizations/settings).
 *
 * Wired to the existing org settings surface (OrganizationSettingsView). These
 * re-use the product's mock/dev data path (useAppStore -> @/services/*) so they
 * render and mutate in demo mode, and mirror Rill's General (logo/favicon/domain
 * allow-list), Billing, Usage and Users (groups/guests) sections.
 */

export function OrgBrandingSection() {
  const { currentOrganization, updateOrganization } = useAppStore();
  const orgId = currentOrganization?.id;
  const [logoUrl, setLogoUrl] = useState(currentOrganization?.logoAssetId || "");
  const [logoDarkUrl, setLogoDarkUrl] = useState(currentOrganization?.logoDarkAssetId || "");
  const [faviconUrl, setFaviconUrl] = useState(currentOrganization?.faviconAssetId || "");

  useEffect(() => {
    setLogoUrl(currentOrganization?.logoAssetId || "");
    setLogoDarkUrl(currentOrganization?.logoDarkAssetId || "");
    setFaviconUrl(currentOrganization?.faviconAssetId || "");
  }, [currentOrganization]);

  const persist = async (dto) => {
    if (!orgId) return;
    await updateOrganization(orgId, dto);
  };

  const handleUpload = async (field, value) => {
    setLogoUrl(field === "logoAssetId" ? value : logoUrl);
    setLogoDarkUrl(field === "logoDarkAssetId" ? value : logoDarkUrl);
    setFaviconUrl(field === "faviconAssetId" ? value : faviconUrl);
    await persist({ [field]: value });
  };

  const handleRemove = async (field) => {
    setLogoUrl(field === "logoAssetId" ? "" : logoUrl);
    setLogoDarkUrl(field === "logoDarkAssetId" ? "" : logoDarkUrl);
    setFaviconUrl(field === "faviconAssetId" ? "" : faviconUrl);
    await persist({ [field]: "" });
  };

  const LogoField = ({ id, label, value, hint, accept }) => (
    <div className="settings-card-body settings-brand-field">
      <span className="settings-card-row-title">{label}</span>
      <p className="settings-card-row-desc">{hint}</p>
      <div className="settings-link-row" style={{ marginTop: 8 }}>
        {value ? (
          <img src={value} alt={label} className="settings-brand-preview" />
        ) : (
          <div className="settings-brand-preview settings-brand-preview-empty">
            <Image size={16} />
          </div>
        )}
        <button className="settings-btn-secondary" onClick={() => handleUpload(id, `asset_${id}_${Date.now()}`)}>
          Upload
        </button>
        {value ? (
          <button className="settings-btn-danger-outline" onClick={() => handleRemove(id)}>
            Remove
          </button>
        ) : null}
      </div>
      <input type="hidden" readOnly value={value} aria-label={`${label} asset id`} />
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Logo</h3>
            <p className="settings-card-subtitle">Light and dark variants shown to members.</p>
          </div>
        </div>
        <div className="settings-card-body settings-brand-row">
          <LogoField id="logoAssetId" label="Light logo" value={logoUrl} hint="For light backgrounds" accept="image/png, image/ico, image/x-icon" />
          <LogoField id="logoDarkAssetId" label="Dark logo" value={logoDarkUrl} hint="For dark backgrounds" accept="image/png, image/ico, image/x-icon" />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Favicon</h3>
            <p className="settings-card-subtitle">Shown in the browser tab for this organization.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <LogoField id="faviconAssetId" label="Favicon" value={faviconUrl} hint="PNG or ICO" accept="image/png, image/ico, image/x-icon" />
        </div>
      </div>
    </div>
  );
}

export function OrgDomainAllowListSection() {
  const { currentOrganization } = useAppStore();
  const stored = currentOrganization?.settings?.allowedDomains || [];
  const [domains, setDomains] = useState(stored);
  const [input, setInput] = useState("");

  useEffect(() => {
    setDomains(currentOrganization?.settings?.allowedDomains || []);
  }, [currentOrganization]);

  const addDomain = () => {
    const d = input.trim().toLowerCase().replace(/^@/, "");
    if (!d || domains.includes(d)) return;
    setDomains((prev) => [...prev, d]);
    setInput("");
  };

  const removeDomain = (d) => setDomains((prev) => prev.filter((x) => x !== d));

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Domain allow-list</h3>
            <p className="settings-card-subtitle">Members signing up with matching domains join as Viewer by default.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <div className="settings-input-row" style={{ marginBottom: 12 }}>
            <input
              className="settings-input"
              placeholder="example.com"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addDomain(); }}
            />
            <button className="settings-btn-primary" onClick={addDomain}>
              <Plus size={14} /> Add domain
            </button>
          </div>
          <div className="settings-card-list">
            {domains.length ? (
              domains.map((d) => (
                <div className="settings-card-row" key={d}>
                  <div className="settings-card-row-text">
                    <div className="settings-card-row-title">
                      <Globe size={12} style={{ verticalAlign: "middle" }} /> @{d}
                    </div>
                    <div className="settings-card-row-desc">Viewer</div>
                  </div>
                  <div className="settings-card-row-right">
                    <button className="settings-btn-icon" onClick={() => removeDomain(d)} title="Remove domain">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="settings-placeholder">No domains allowed. Anyone with the link can self-join.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrgBillingSection() {
  const { currentOrganization, subscription, fetchSubscription, fetchUsageBilling, checkoutPlan, manageBilling, updateOrganization, devMode } = useAppStore();
  const orgId = currentOrganization?.id;
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePlanKey, setActivePlanKey] = useState(subscription?.plan || currentOrganization?.plan || "starter");

  useEffect(() => {
    if (!orgId || orgId === "__empty__") return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchSubscription(orgId).catch(() => null),
      fetchUsageBilling(orgId).catch(() => null),
    ]).then(([sub, usage]) => {
      if (cancelled) return;
      setPlans(usage?.plans || []);
      setInvoices(usage?.invoices || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [orgId]);

  const activePlan = activePlanKey || "starter";
  const planLabel = String(activePlan).toLowerCase();

  const choosePlan = async (planKey) => {
    // In dev/mock mode don't hit the real billing API — just flip the plan locally.
    if (devMode) {
      setActivePlanKey(planKey);
      await updateOrganization(orgId, { plan: planKey }).catch(() => {});
      return;
    }
    if (orgId) {
      await checkoutPlan(orgId, planKey);
    }
  };

  const openBillingPortal = async () => {
    if (orgId && !devMode) {
      await manageBilling(orgId);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Current plan</h3>
            <p className="settings-card-subtitle">
              {planLabel.charAt(0).toUpperCase() + planLabel.slice(1)}
              {subscription?.status ? ` · ${subscription.status}` : ""}
            </p>
          </div>
          <div className="settings-action-row">
            <button className="settings-btn-secondary" onClick={openBillingPortal} disabled={!orgId || devMode}>
              <ExternalLink size={14} /> Manage billing
            </button>
          </div>
        </div>
        <div className="settings-card-body">
          <div className="settings-plan-grid">
            {(plans.length ? plans : [
              { key: "starter", name: "Starter", price: 0 },
              { key: "team", name: "Team", price: 250 },
              { key: "enterprise", name: "Enterprise", price: "Custom" },
            ]).map((plan) => {
              const isCurrent = planLabel === String(plan.key).toLowerCase();
              return (
                <div className={"settings-plan-card" + (isCurrent ? " selected" : "")} key={plan.key}>
                  <div>
                    <div className="settings-card-row-title">{plan.name}</div>
                    <div className="settings-card-row-desc">{plan.price === 0 ? "Free" : typeof plan.price === "number" ? `$${plan.price}/mo` : plan.price}</div>
                  </div>
                  {isCurrent ? (
                    <span className="settings-plan-current"><Check size={12} /> Current</span>
                  ) : (
                    <button className="settings-btn-primary" onClick={() => choosePlan(plan.key)} disabled={!orgId}>
                      Choose
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Invoices</h3>
            <p className="settings-card-subtitle">Recent billing transactions.</p>
          </div>
        </div>
        <div className="settings-card-body">
          {invoices.length ? (
            invoices.map((inv) => (
              <div className="settings-card-row" key={inv.id}>
                <div className="settings-card-row-text">
                  <div className="settings-card-row-title">{inv.id}</div>
                  <div className="settings-card-row-desc">{inv.date}</div>
                </div>
                <div className="settings-card-row-right">
                  <span className="settings-card-row-desc">{inv.amount}</span>
                  <span className={"settings-status-chip " + (inv.status === "Paid" ? "ok" : "")}>{inv.status}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="settings-placeholder">{loading ? "Loading…" : "No invoices yet."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrgUsageSection() {
  const { currentOrganization, fetchUsageBilling } = useAppStore();
  const orgId = currentOrganization?.id;
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!orgId || orgId === "__empty__") return;
    let cancelled = false;
    fetchUsageBilling(orgId).then((data) => {
      if (!cancelled) setUsage(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [orgId]);

  const items = usage?.usage?.items || [];
  const limits = usage?.subscription?.limits || {};

  return (
    <div className="settings-page">
      <RuntimeMetricsCard title="Runtime metrics" />
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Usage</h3>
            <p className="settings-card-subtitle">Consumption against your plan limits.</p>
          </div>
        </div>
        <div className="settings-card-body">
          {items.length ? (
            items.map((item) => (
              <div className="settings-card-row" key={item.name}>
                <div className="settings-card-row-text">
                  <div className="settings-card-row-title">{item.name}</div>
                </div>
                <div className="settings-card-row-right settings-card-row-desc">${item.value} / ${limits.maxProjects ?? "—"}</div>
              </div>
            ))
          ) : (
            <p className="settings-placeholder">No usage recorded for the current period.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrgGroupsSection() {
  const { currentOrganization } = useAppStore();
  const [groups, setGroups] = useState(currentOrganization?.groups || [{ id: "g_admin", name: "Admins", memberCount: 1 }, { id: "g_analysts", name: "Analysts", memberCount: 0 }]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const addGroup = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newGroup = { id: `g_${Date.now()}`, name: trimmed, memberCount: 0 };
    setGroups((prev) => [...prev, newGroup]);
    setName("");
    setOpen(false);
  };

  const removeGroup = (id) => setGroups((prev) => prev.filter((g) => g.id !== id));

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Groups</h3>
            <p className="settings-card-subtitle">Organize members into named groups for access control.</p>
          </div>
          <button className="settings-btn-primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> New group
          </button>
        </div>
        <div className="settings-card-body">
          {groups.map((group) => (
            <div className="settings-card-row" key={group.id}>
              <div className="settings-card-row-text">
                <div className="settings-card-row-title">{group.name}</div>
                <div className="settings-card-row-desc">{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</div>
              </div>
              <div className="settings-card-row-right">
                <button className="settings-btn-icon" onClick={() => removeGroup(group.id)} title="Delete group">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="settings-overlay-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <h3 className="settings-overlay-title">New group</h3>
              <button className="settings-overlay-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="settings-overlay-body">
              <input
                className="settings-input"
                autoFocus
                placeholder="Group name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addGroup(); }}
              />
            </div>
            <div className="settings-overlay-footer">
              <button className="settings-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="settings-btn-primary" onClick={addGroup} disabled={!name.trim()}>Create group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgGuestsSection() {
  const { currentOrganization } = useAppStore();
  const [guests, setGuests] = useState(currentOrganization?.guests || [
    { id: "guest_1", email: "guest@partner.com", role: "Viewer", projects: ["Demo Project"] },
  ]);
  const [email, setEmail] = useState("");

  const addGuest = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setGuests((prev) => [...prev, { id: `guest_${Date.now()}`, email: trimmed, role: "Viewer", projects: [] }]);
    setEmail("");
  };

  const removeGuest = (id) => setGuests((prev) => prev.filter((g) => g.id !== id));

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-header-text">
            <h3 className="settings-card-title">Guests</h3>
            <p className="settings-card-subtitle">External collaborators with access to specific projects.</p>
          </div>
        </div>
        <div className="settings-card-body">
          <div className="settings-input-row" style={{ marginBottom: 12 }}>
            <input
              className="settings-input"
              placeholder="guest@partner.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }}
            />
            <button className="settings-btn-primary" onClick={addGuest} disabled={!email.trim()}>
              <Plus size={14} /> Add guest
            </button>
          </div>
          {guests.map((guest) => (
            <div className="settings-card-row" key={guest.id}>
              <div className="settings-card-row-text">
                <div className="settings-card-row-title">{guest.email}</div>
                <div className="settings-card-row-desc">
                  {guest.role} · {guest.projects.length ? guest.projects.join(", ") : "No projects"}
                </div>
              </div>
              <div className="settings-card-row-right">
                <button className="settings-btn-icon" onClick={() => removeGuest(guest.id)} title="Remove guest">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
