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
  REPORT_TYPE_OPTIONS,
  REPORT_FORMAT_OPTIONS,
  REPORT_FREQUENCY_OPTIONS,
  REPORT_DAY_OPTIONS,
  REPORT_TIME_ZONE_OPTIONS,
  MOCK_FILTERABLE_DIMENSIONS,
  MOCK_DIMENSION_VALUES,
  getReportFieldOptions,
  blankForm,
  formFromReport,
  listMockReports,
  getMockReport,
  createMockReport,
  updateMockReport,
  deleteMockReport,
  describeSchedule,
  describeFormat,
  describeRecipients,
  formatLastRun,
  convertFormValuesToCron,
} from "@/data/mockReports";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import "@/styles/reports.css";

const fieldOptions = getReportFieldOptions();
const measureOptions = fieldOptions.measures;
const dimensionOptions = fieldOptions.dimensions;

const localTZ =
  (typeof Intl !== "undefined" &&
    Intl.DateTimeFormat().resolvedOptions().timeZone) ||
  "UTC";
const timeZoneOptions = [
  { value: localTZ, label: `${localTZ} (local)` },
  ...REPORT_TIME_ZONE_OPTIONS,
];

function MenuSelect({ value, options, onChange, className, ariaLabel }) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ariaLabel}
        className={cn("reports-menu-trigger", className)}
      >
        <span className="reports-menu-trigger-label">
          {current?.label ?? "Select"}
        </span>
        <ChevronDown size={14} className="reports-menu-trigger-caret" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="reports-menu-content">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "reports-menu-item",
              o.value === value && "active",
            )}
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
    <label className="reports-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="reports-toggle-track" aria-hidden="true">
        <span className="reports-toggle-thumb" />
      </span>
      <span className="reports-toggle-text">
        <span className="reports-toggle-label">{label}</span>
        {hint && <span className="reports-toggle-hint">{hint}</span>}
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
    <div className="reports-multi">
      {values.map((val, idx) => (
        <div key={idx} className="reports-multi-row">
          <Input
            className="reports-multi-input"
            value={val}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={placeholder}
          />
          {values.length > 1 && (
            <button
              type="button"
              className="reports-multi-remove"
              onClick={() => remove(idx)}
              aria-label="Remove entry"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="reports-multi-add" onClick={add}>
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}

/** A chip list with an "Add" dropdown, mirroring Rill's field list for rows/columns. */
function FieldPicker({ label, fields, onChange, options, placeholder, id }) {
  const selected = new Set(fields);
  const available = options.filter((o) => !selected.has(o.value));
  return (
    <div className="reports-field">
      <label className="reports-label" htmlFor={id}>{label}</label>
      <div className="reports-field-chips">
        {fields.length === 0 && (
          <span className="reports-field-empty">{placeholder}</span>
        )}
        {fields.map((field) => {
          const opt = options.find((o) => o.value === field);
          return (
            <span key={field} className="reports-chip">
              {opt?.label || field}
              <button
                type="button"
                className="reports-chip-remove"
                onClick={() => onChange(fields.filter((f) => f !== field))}
                aria-label={`Remove ${field}`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Add ${label}`}
            className="reports-field-add"
          >
            <Plus size={14} />
            Add
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {available.length === 0 && (
              <DropdownMenuItem disabled>No fields left</DropdownMenuItem>
            )}
            {available.map((o) => (
              <DropdownMenuItem
                key={o.value}
                onClick={() => onChange([...fields, o.value])}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function FilterRow({ filter, onChange, onRemove }) {
  const dimensionOptions = MOCK_FILTERABLE_DIMENSIONS;
  const valueOptions = (MOCK_DIMENSION_VALUES[filter.dimension] || []).map(
    (v) => ({ value: v, label: v }),
  );

  const setDimension = (dimension) =>
    onChange({ dimension, values: [], mode: filter.mode });
  const setValue = (value) => onChange({ ...filter, values: [value] });
  const toggleMode = () =>
    onChange({
      ...filter,
      mode: filter.mode === "include" ? "exclude" : "include",
    });
  const selectedValue = filter.values?.[0] || "";

  return (
    <div className="reports-filter-row">
      <MenuSelect
        ariaLabel="Filter dimension"
        value={filter.dimension}
        onChange={setDimension}
        options={dimensionOptions}
        className="reports-filter-dimension"
      />
      <MenuSelect
        ariaLabel="Filter value"
        value={selectedValue}
        onChange={setValue}
        options={valueOptions}
        className="reports-filter-value"
      />
      <button
        type="button"
        className="reports-filter-mode"
        onClick={toggleMode}
        aria-label="Toggle include/exclude"
      >
        {filter.mode === "include" ? "Include" : "Exclude"}
      </button>
      <button
        type="button"
        className="reports-filter-remove"
        onClick={onRemove}
        aria-label="Remove filter"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function FilterEditor({ filters, onChange }) {
  const add = () =>
    onChange([
      ...filters,
      {
        dimension: MOCK_FILTERABLE_DIMENSIONS[0]?.name || "",
        values: [],
        mode: "include",
      },
    ]);
  const update = (i, patch) =>
    onChange(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i) => onChange(filters.filter((_, idx) => idx !== i));

  return (
    <div className="reports-filter-editor">
      {filters.length === 0 && (
        <p className="reports-filter-empty">No filters — the report runs on all data.</p>
      )}
      {filters.map((f, i) => (
        <FilterRow
          key={i}
          filter={f}
          onChange={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
        />
      ))}
      <button type="button" className="reports-add-filter" onClick={add}>
        <Plus size={14} />
        Add filter
      </button>
    </div>
  );
}

function ReportForm({ initial, mode, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  const rowOptions = dimensionOptions.filter(
    (o) => !form.columns.includes(o.value),
  );
  const columnOptions = [...measureOptions, ...dimensionOptions].filter(
    (o) => !form.rows.includes(o.value),
  );

  const previewCron = convertFormValuesToCron(
    form.frequency,
    form.dayOfWeek,
    form.timeOfDay,
    form.dayOfMonth,
  );

  function setType(type) {
    setForm((f) => ({
      ...f,
      type,
      format: type === "pdf" ? "pdf" : f.format === "pdf" ? "csv" : f.format,
    }));
  }

  function setFormat(format) {
    setForm((f) => ({ ...f, format }));
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Enter a report name.");
      return;
    }
    if (form.type === "query" && !form.columns.length) {
      setError("Select at least one column for the report.");
      return;
    }
    const hasEmail = form.enableEmail && form.emailRecipients.some((r) => r.trim());
    const hasSlack =
      form.enableSlack &&
      [...form.slackChannels, ...form.slackUsers].some((r) => r.trim());
    if (!hasEmail && !hasSlack) {
      setError("Add at least one email recipient or Slack channel.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      format: form.format,
      frequency: form.frequency,
      dayOfWeek: form.dayOfWeek,
      dayOfMonth: form.dayOfMonth,
      timeOfDay: form.timeOfDay,
      timeZone: form.timeZone,
      rows: form.rows,
      columns: form.columns,
      filters: form.filters.map((f) => ({ ...f })),
      enableEmail: form.enableEmail,
      emailRecipients: form.enableEmail ? form.emailRecipients.filter(Boolean) : [],
      enableSlack: form.enableSlack,
      slackChannels: form.enableSlack ? form.slackChannels.filter(Boolean) : [],
      slackUsers: form.enableSlack ? form.slackUsers.filter(Boolean) : [],
    };
    onSave(payload);
  }

  return (
    <div className="reports-form">
      <div className="reports-form-body">
        <div className="reports-field">
          <label className="reports-label" htmlFor="report-name">Name</label>
          <Input
            id="report-name"
            className="reports-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Weekly revenue summary"
          />
        </div>

        <div className="reports-field">
          <label className="reports-label">Report type</label>
          <MenuSelect
            ariaLabel="Report type"
            value={form.type}
            onChange={setType}
            options={REPORT_TYPE_OPTIONS}
          />
          <span className="reports-hint">
            {REPORT_TYPE_OPTIONS.find((o) => o.value === form.type)?.description}
          </span>
        </div>

        <div className="reports-field">
          <label className="reports-label">Format</label>
          {form.type === "pdf" ? (
            <div className="reports-format-lock">PDF</div>
          ) : (
            <MenuSelect
              ariaLabel="Format"
              value={form.format}
              onChange={setFormat}
              options={REPORT_FORMAT_OPTIONS}
            />
          )}
        </div>

        <Separator className="reports-form-divider" />

        <h3 className="reports-form-section-title">Schedule</h3>
        <div className="reports-schedule-grid">
          <div className="reports-field">
            <label className="reports-label">Frequency</label>
            <MenuSelect
              ariaLabel="Frequency"
              value={form.frequency}
              onChange={(v) => setForm((f) => ({ ...f, frequency: v }))}
              options={REPORT_FREQUENCY_OPTIONS}
            />
          </div>
          {form.frequency === "Weekly" && (
            <div className="reports-field">
              <label className="reports-label">Day</label>
              <MenuSelect
                ariaLabel="Day of week"
                value={form.dayOfWeek}
                onChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v }))}
                options={REPORT_DAY_OPTIONS}
              />
            </div>
          )}
          {form.frequency === "Monthly" && (
            <div className="reports-field">
              <label className="reports-label">Day</label>
              <div className="reports-format-lock">First day</div>
            </div>
          )}
          <div className="reports-field">
            <label className="reports-label">Time of day</label>
            <Input
              className="reports-input reports-time-input"
              value={form.timeOfDay}
              onChange={(e) => setForm((f) => ({ ...f, timeOfDay: e.target.value }))}
              placeholder="08:00"
              inputMode="numeric"
            />
          </div>
          <div className="reports-field">
            <label className="reports-label">Time zone</label>
            <MenuSelect
              ariaLabel="Time zone"
              value={form.timeZone}
              onChange={(v) => setForm((f) => ({ ...f, timeZone: v }))}
              options={timeZoneOptions}
            />
          </div>
        </div>
        <p className="reports-hint reports-cron-hint">
          Runs every <span className="reports-cron">{previewCron}</span>
        </p>

        {form.type === "query" && (
          <>
            <Separator className="reports-form-divider" />
            <h3 className="reports-form-section-title">Fields</h3>
            <div className="reports-fields-grid">
              <FieldPicker
                id="report-rows"
                label="Rows (dimensions)"
                fields={form.rows}
                onChange={(rows) => setForm((f) => ({ ...f, rows }))}
                options={rowOptions}
                placeholder="No rows selected"
              />
              <FieldPicker
                id="report-columns"
                label="Columns (measures + dimensions)"
                fields={form.columns}
                onChange={(columns) => setForm((f) => ({ ...f, columns }))}
                options={columnOptions}
                placeholder="Select at least one column"
              />
            </div>

            <Separator className="reports-form-divider" />
            <h3 className="reports-form-section-title">Filters</h3>
            <FilterEditor
              filters={form.filters}
              onChange={(filters) => setForm((f) => ({ ...f, filters }))}
            />
          </>
        )}

        <Separator className="reports-form-divider" />
        <h3 className="reports-form-section-title">Delivery</h3>
        <div className="reports-toggle-group">
          <Toggle
            checked={form.enableEmail}
            onChange={(v) => setForm((f) => ({ ...f, enableEmail: v }))}
            label="Email"
            hint="Send the report to these recipients"
          />
          {form.enableEmail && (
            <MultiInput
              values={form.emailRecipients}
              onChange={(emailRecipients) => setForm((f) => ({ ...f, emailRecipients }))}
              placeholder="name@example.com"
              addLabel="Add email"
            />
          )}
        </div>
        <div className="reports-toggle-group">
          <Toggle
            checked={form.enableSlack}
            onChange={(v) => setForm((f) => ({ ...f, enableSlack: v }))}
            label="Slack"
            hint="Post the report to these channels or users"
          />
          {form.enableSlack && (
            <>
              <MultiInput
                values={form.slackChannels}
                onChange={(slackChannels) => setForm((f) => ({ ...f, slackChannels }))}
                placeholder="#channel"
                addLabel="Add channel"
              />
              <MultiInput
                values={form.slackUsers}
                onChange={(slackUsers) => setForm((f) => ({ ...f, slackUsers }))}
                placeholder="user@example.com"
                addLabel="Add user"
              />
            </>
          )}
        </div>
      </div>

      <div className="reports-form-footer">
        <span className="reports-form-error">{error}</span>
        <div className="reports-form-actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "edit" ? "Update report" : "Create report"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RunStatusIcon({ status }) {
  if (status === "error") return <AlertCircle size={14} className="reports-run-error" />;
  if (status === "ok") return <CheckCircle2 size={14} className="reports-run-ok" />;
  return <Clock size={14} className="reports-run-pending" />;
}

export function ReportsView() {
  const [reports, setReports] = useState(() => listMockReports());
  const [mode, setMode] = useState("list"); // 'list' | 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);

  function refresh() {
    setReports(listMockReports());
  }

  function handleCreate() {
    setMode("create");
    setEditingId(null);
  }

  function handleEdit(id) {
    const report = getMockReport(id);
    if (!report) return;
    setEditingId(id);
    setMode("edit");
  }

  function handleSave(payload) {
    if (mode === "edit" && editingId) {
      updateMockReport(editingId, payload);
    } else {
      createMockReport(payload);
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
    deleteMockReport(id);
    refresh();
  }

  const openForm = mode === "create" || mode === "edit";

  return (
    <ViewFrame
      title="Reports"
      description="Schedule recurring exports of your data and deliver them by email or Slack. Create and manage reports for this project."
      actions={
        !openForm && (
          <Button onClick={handleCreate}>
            <FileText size={15} />
            New report
          </Button>
        )
      }
      maxWidthClassName="full-width"
    >
      {openForm ? (
        <ReportForm
          key={mode === "edit" ? editingId : "create"}
          initial={
            mode === "edit"
              ? formFromReport(getMockReport(editingId) || blankForm("query"))
              : blankForm("query")
          }
          mode={mode}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      ) : (
        <div className="reports-list">
          {reports.length === 0 ? (
            <div className="reports-empty">
              <FileText size={24} />
              <p className="reports-empty-title">No reports yet</p>
              <p className="reports-empty-desc">
                Schedule a recurring export and deliver it by email or Slack.
              </p>
              <Button onClick={handleCreate}>
                <Plus size={15} />
                New report
              </Button>
            </div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th className="reports-th-name">Name</th>
                    <th>Schedule</th>
                    <th>Format</th>
                    <th>Recipients</th>
                    <th>Last run</th>
                    <th className="reports-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="reports-td-name">
                        <span className="reports-name">{report.name}</span>
                      </td>
                      <td>
                        <div className="reports-schedule">
                          <span>{describeSchedule(report)}</span>
                          <span className="reports-cron">{report.cron}</span>
                        </div>
                      </td>
                      <td>
                        <span className="reports-format-badge">
                          {describeFormat(report)}
                        </span>
                      </td>
                      <td>
                        <span className="reports-recipients">
                          {describeRecipients(report)}
                        </span>
                      </td>
                      <td>
                        <span className="reports-last-run">
                          <RunStatusIcon status={report.status} />
                          {formatLastRun(report.lastRun)}
                        </span>
                      </td>
                      <td className="reports-td-actions">
                        <button
                          type="button"
                          className="reports-row-action"
                          onClick={() => handleEdit(report.id)}
                          aria-label={`Edit ${report.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="reports-row-action reports-row-action-danger"
                          onClick={() => handleDelete(report.id)}
                          aria-label={`Delete ${report.name}`}
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

export default ReportsView;
