import { useState } from "react";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ALERT_CRITERIA_OPERATION_OPTIONS,
  ALERT_OPERATION_OPTIONS,
  ALERT_TYPE_OPTIONS,
  MOCK_ALERT_DIMENSIONS,
  MOCK_ALERT_MEASURES,
  createMockAlert,
  deleteMockAlert,
  describeThreshold,
  emptyCriteria,
  formatLastRun,
  getMockAlert,
  listMockAlerts,
  updateMockAlert,
} from "@/data/mockAlerts";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import "@/styles/alerts.css";

const measureOptions = MOCK_ALERT_MEASURES.map((m) => ({
  value: m.name,
  label: m.displayName || m.name || m.expression,
}));

const dimensionOptions = [
  { value: "", label: "None" },
  ...MOCK_ALERT_DIMENSIONS.map((d) => ({
    value: d.name,
    label: d.displayName || d.name,
  })),
];

function blankForm() {
  const firstMeasure = MOCK_ALERT_MEASURES[0]?.name || "";
  return {
    name: "",
    measure: firstMeasure,
    splitByDimension: "",
    criteriaOperation: "OPERATION_AND",
    criteria: [emptyCriteria(firstMeasure)],
    enableEmail: true,
    emailRecipients: [""],
    enableSlack: false,
    slackChannels: [""],
  };
}

function formFromAlert(alert) {
  return {
    name: alert.name || "",
    measure: alert.measure || "",
    splitByDimension: alert.splitByDimension || "",
    criteriaOperation: alert.criteriaOperation || "OPERATION_AND",
    criteria: (alert.criteria || []).map((c) => ({ ...c })),
    enableEmail: alert.enableEmail ?? true,
    emailRecipients: alert.emailRecipients?.length ? [...alert.emailRecipients] : [""],
    enableSlack: alert.enableSlack ?? false,
    slackChannels: alert.slackChannels?.length ? [...alert.slackChannels] : [""],
  };
}

/** Auto-generate a display name from the first criteria (mirrors Parrot's `generateAlertName`). */
function generateName(form) {
  const c = form.criteria?.[0];
  if (!c || !c.measure) return "";
  const op = ALERT_OPERATION_OPTIONS.find((o) => o.value === c.operation)?.label || c.operation;
  const measureLabel = measureOptions.find((m) => m.value === c.measure)?.label || c.measure;
  const suffix = c.type === "PercentChange" ? "%" : "";
  return `${measureLabel} ${op} ${c.value1 || "0"}${suffix}`;
}

function MenuSelect({ value, options, onChange, className, ariaLabel }) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ariaLabel}
        className={cn("alerts-menu-trigger", className)}
      >
        <span className="alerts-menu-trigger-label">{current?.label ?? "Select"}</span>
        <ChevronDown size={14} className="alerts-menu-trigger-caret" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="alerts-menu-content">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn("alerts-menu-item", o.value === value && "active")}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="alerts-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="alerts-toggle-track" aria-hidden="true">
        <span className="alerts-toggle-thumb" />
      </span>
      <span className="alerts-toggle-text">
        <span className="alerts-toggle-label">{label}</span>
        {hint && <span className="alerts-toggle-hint">{hint}</span>}
      </span>
    </label>
  );
}

function MultiInput({ values, onChange, placeholder, addLabel }) {
  const update = (idx, val) => {
    const next = [...values];
    next[idx] = val;
    onChange(next);
  };
  const remove = (idx) => onChange(values.filter((_, i) => i !== idx));
  const add = () => onChange([...values, ""]);

  return (
    <div className="alerts-multi">
      {values.map((val, idx) => (
        <div key={idx} className="alerts-multi-row">
          <Input
            className="alerts-multi-input"
            value={val}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={placeholder}
          />
          {values.length > 1 && (
            <button
              type="button"
              className="alerts-multi-remove"
              onClick={() => remove(idx)}
              aria-label="Remove entry"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="alerts-multi-add" onClick={add}>
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    ok: { label: "OK", icon: CheckCircle2, cls: "alerts-status-ok" },
    firing: { label: "Firing", icon: AlertCircle, cls: "alerts-status-firing" },
    pending: { label: "Awaiting run", icon: Clock, cls: "alerts-status-pending" },
  }[status] || { label: "OK", icon: CheckCircle2, cls: "alerts-status-ok" };
  const Icon = config.icon;
  return (
    <span className={cn("alerts-status", config.cls)}>
      <Icon size={13} />
      {config.label}
    </span>
  );
}

function CriteriaRow({ criteria, onChange, onRemove }) {
  const update = (patch) => onChange({ ...criteria, ...patch });
  return (
    <div className="alerts-criteria-row">
      <MenuSelect
        ariaLabel="Criteria measure"
        value={criteria.measure}
        onChange={(v) => update({ measure: v })}
        options={measureOptions}
        className="alerts-criteria-measure"
      />
      <MenuSelect
        ariaLabel="Criteria type"
        value={criteria.type}
        onChange={(v) => update({ type: v })}
        options={ALERT_TYPE_OPTIONS}
        className="alerts-criteria-type"
      />
      <MenuSelect
        ariaLabel="Criteria operator"
        value={criteria.operation}
        onChange={(v) => update({ operation: v })}
        options={ALERT_OPERATION_OPTIONS}
        className="alerts-criteria-op"
      />
      <Input
        className="alerts-criteria-value"
        value={criteria.value1}
        onChange={(e) => update({ value1: e.target.value })}
        placeholder="0"
        inputMode="decimal"
      />
      <button
        type="button"
        className="alerts-criteria-remove"
        onClick={onRemove}
        aria-label="Remove condition"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function AlertForm({ initial, mode, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const [tabIndex, setTabIndex] = useState(0);
  const [error, setError] = useState("");

  const tabs = ["Data", "Criteria", "Delivery"];

  function setMeasure(measure) {
    setForm((f) => ({
      ...f,
      measure,
      criteria: f.criteria.map((c) => ({ ...c, measure })),
    }));
  }

  function setCriteria(index, patch) {
    setForm((f) => ({
      ...f,
      criteria: f.criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function addCriteria() {
    setForm((f) => ({ ...f, criteria: [...f.criteria, emptyCriteria(f.measure)] }));
  }

  function removeCriteria(index) {
    setForm((f) => ({ ...f, criteria: f.criteria.filter((_, i) => i !== index) }));
  }

  function isTabValid(tab) {
    if (tab === 0) return Boolean(form.measure);
    if (tab === 1) {
      if (!form.criteria.length) return false;
      return form.criteria.every(
        (c) => c.measure && String(c.value1).trim() !== "" && !Number.isNaN(Number(c.value1)),
      );
    }
    if (tab === 2) {
      if (!form.name.trim()) return false;
      if (form.enableEmail && !form.emailRecipients.some((r) => r.trim())) return false;
      return true;
    }
    return true;
  }

  function handleNext() {
    if (!isTabValid(tabIndex)) {
      setError(
        tabIndex === 1
          ? "Every condition needs a valid numeric threshold."
          : "Please complete the required fields.",
      );
      return;
    }
    setError("");
    let next = tabIndex + 1;
    if (next === 2 && !form.name.trim()) {
      setForm({ ...form, name: generateName(form) });
    }
    setTabIndex(next);
  }

  function handleBack() {
    setError("");
    setTabIndex((t) => Math.max(0, t - 1));
  }

  function handleSubmit() {
    if (!isTabValid(2)) {
      setError(
        form.enableEmail && !form.emailRecipients.some((r) => r.trim())
          ? "Add at least one email recipient."
          : "Enter an alert name.",
      );
      return;
    }
    const payload = {
      name: form.name.trim() || generateName(form),
      measure: form.measure,
      splitByDimension: form.splitByDimension,
      criteriaOperation: form.criteriaOperation,
      criteria: form.criteria.map((c) => ({ ...c })),
      enableEmail: form.enableEmail,
      emailRecipients: form.enableEmail ? form.emailRecipients : [],
      enableSlack: form.enableSlack,
      slackChannels: form.enableSlack ? form.slackChannels : [],
    };
    onSave(payload);
  }

  return (
    <div className="alerts-form">
      <div className="alerts-form-tabs">
        {tabs.map((label, i) => (
          <button
            key={label}
            type="button"
            className={cn("alerts-form-tab", i === tabIndex && "active")}
            onClick={() => {
              if (i <= tabIndex) {
                setError("");
                setTabIndex(i);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="alerts-form-body">
        {tabIndex === 0 && (
          <div className="alerts-form-section">
            <h3 className="alerts-form-section-title">Data</h3>
            <p className="alerts-form-section-desc">
              Choose the metric and (optionally) split the alert by a dimension.
            </p>
            <div className="alerts-field">
              <label className="alerts-label">Measure</label>
              <MenuSelect
                ariaLabel="Measure"
                value={form.measure}
                onChange={setMeasure}
                options={measureOptions}
              />
            </div>
            <div className="alerts-field">
              <label className="alerts-label">Split by dimension</label>
              <MenuSelect
                ariaLabel="Split by dimension"
                value={form.splitByDimension}
                onChange={(v) => setForm({ ...form, splitByDimension: v })}
                options={dimensionOptions}
              />
            </div>
          </div>
        )}

        {tabIndex === 1 && (
          <div className="alerts-form-section">
            <div className="alerts-form-section-head">
              <div>
                <h3 className="alerts-form-section-title">Criteria</h3>
                <p className="alerts-form-section-desc">
                  Alert when the measure matches any of these conditions.
                </p>
              </div>
              <MenuSelect
                ariaLabel="Combine conditions"
                value={form.criteriaOperation}
                onChange={(v) => setForm({ ...form, criteriaOperation: v })}
                options={ALERT_CRITERIA_OPERATION_OPTIONS}
                className="alerts-criteria-group-op"
              />
            </div>
            <div className="alerts-criteria-list">
              {form.criteria.map((c, i) => (
                <CriteriaRow
                  key={i}
                  criteria={c}
                  onChange={(patch) => setCriteria(i, patch)}
                  onRemove={form.criteria.length > 1 ? () => removeCriteria(i) : undefined}
                />
              ))}
            </div>
            <button type="button" className="alerts-add-condition" onClick={addCriteria}>
              <Plus size={14} />
              Add condition
            </button>
          </div>
        )}

        {tabIndex === 2 && (
          <div className="alerts-form-section">
            <h3 className="alerts-form-section-title">Delivery</h3>
            <p className="alerts-form-section-desc">
              Name the alert and choose where its notifications are sent.
            </p>
            <div className="alerts-field">
              <label className="alerts-label">Name</label>
              <Input
                className="alerts-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Revenue above target"
              />
            </div>
            <Separator className="alerts-form-divider" />
            <div className="alerts-toggle-group">
              <Toggle
                checked={form.enableEmail}
                onChange={(v) => setForm({ ...form, enableEmail: v })}
                label="Email"
                hint="Send a notification to these recipients"
              />
              {form.enableEmail && (
                <MultiInput
                  values={form.emailRecipients}
                  onChange={(emailRecipients) => setForm({ ...form, emailRecipients })}
                  placeholder="name@example.com"
                  addLabel="Add email"
                />
              )}
            </div>
            <div className="alerts-toggle-group">
              <Toggle
                checked={form.enableSlack}
                onChange={(v) => setForm({ ...form, enableSlack: v })}
                label="Slack"
                hint="Post to these channels"
              />
              {form.enableSlack && (
                <MultiInput
                  values={form.slackChannels}
                  onChange={(slackChannels) => setForm({ ...form, slackChannels })}
                  placeholder="#channel"
                  addLabel="Add channel"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="alerts-form-footer">
        <span className="alerts-form-error">{error}</span>
        <div className="alerts-form-actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          {tabIndex > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
          {tabIndex < tabs.length - 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSubmit}>{mode === "edit" ? "Update alert" : "Create alert"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlertsView() {
  const [alerts, setAlerts] = useState(() => listMockAlerts());
  const [mode, setMode] = useState("list"); // 'list' | 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);

  function refresh() {
    setAlerts(listMockAlerts());
  }

  function handleCreate() {
    setMode("create");
    setEditingId(null);
  }

  function handleEdit(id) {
    const alert = getMockAlert(id);
    if (!alert) return;
    setEditingId(id);
    setMode("edit");
  }

  function handleSave(payload) {
    if (mode === "edit" && editingId) {
      updateMockAlert(editingId, payload);
    } else {
      createMockAlert(payload);
    }
    refresh();
    setMode("list");
    setEditingId(null);
  }

  function handleCancel() {
    setMode("list");
    setEditingId(null);
  }

  function handleDelete(id) {
    deleteMockAlert(id);
    refresh();
  }

  const openForm = mode === "create" || mode === "edit";

  return (
    <ViewFrame
      title="Alerts"
      description="Monitor a metric and get notified when it crosses a threshold. Create and manage alerts for this project."
      actions={
        !openForm && (
          <Button onClick={handleCreate}>
            <Bell size={15} />
            New alert
          </Button>
        )
      }
      maxWidthClassName="full-width"
    >
      {openForm ? (
        <AlertForm
          key={mode === "edit" ? editingId : "create"}
          initial={mode === "edit" ? formFromAlert(getMockAlert(editingId) || blankForm()) : blankForm()}
          mode={mode}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      ) : (
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <div className="alerts-empty">
              <Bell size={24} />
              <p className="alerts-empty-title">No alerts yet</p>
              <p className="alerts-empty-desc">
                Create an alert to get notifications when a metric crosses a threshold.
              </p>
              <Button onClick={handleCreate}>
                <Plus size={15} />
                New alert
              </Button>
            </div>
          ) : (
            <div className="alerts-table-wrap">
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th className="alerts-th-name">Name</th>
                    <th>Status</th>
                    <th>Condition</th>
                    <th>Last run</th>
                    <th className="alerts-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td className="alerts-td-name">
                        <span className="alerts-name">{alert.name}</span>
                      </td>
                      <td>
                        <StatusBadge status={alert.status} />
                      </td>
                      <td>
                        <span className="alerts-condition">{describeThreshold(alert)}</span>
                      </td>
                      <td>
                        <span className="alerts-last-run">{formatLastRun(alert.lastRun)}</span>
                      </td>
                      <td className="alerts-td-actions">
                        <button
                          type="button"
                          className="alerts-row-action"
                          onClick={() => handleEdit(alert.id)}
                          aria-label={`Edit ${alert.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="alerts-row-action alerts-row-action-danger"
                          onClick={() => handleDelete(alert.id)}
                          aria-label={`Delete ${alert.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ViewFrame>
  );
}

export default AlertsView;
