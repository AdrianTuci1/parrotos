import "@/styles/explore.css";

const FORMAT_OPTIONS = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
];

/**
 * Rill-style KPI/measure inspector (right-side panel).
 *
 * In Rill the dashboard's measure display settings are edited in a resizable
 * `aside.inspector-wrapper`; the underlying measure schema fields are
 * `name, display_name, description, format_preset, valid_percent_of_total, hide, ...`
 * (expression is edited only in the metrics-view YAML, so it is shown read-only here).
 *
 * This mock inspector edits the selected mock measure's display fields and reports the
 * patch back through `onChange`, so the Explore cards update live.
 */
export default function KpiInspector({
  measure,
  open,
  width = 320,
  onResizeStart,
  onClose,
  onChange,
}) {
  if (!open || !measure) return null;

  const handleChange = (field, value) => onChange({ field, value });

  const preview = formatValue(1234.5, measure.formatPreset);

  return (
    <aside
      className="mock-inspector"
      style={{ width }}
      data-testid="kpi-inspector"
    >
      <div className="mock-inspector-resizer" onMouseDown={onResizeStart} title="Drag to resize" />

      <div className="mock-inspector-header">
        <h3>Edit KPI</h3>
        <span className="mock-inspector-badge">{measure.name}</span>
        <button
          type="button"
          className="mock-inspector-close"
          onClick={onClose}
          aria-label="Close inspector"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="mock-inspector-body">
        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">General</div>
          <div className="mock-inspector-field">
            <label className="mock-inspector-label" htmlFor="kpi-name">
              Display name
            </label>
            <input
              id="kpi-name"
              className="mock-inspector-input"
              value={measure.displayName ?? ""}
              onChange={(e) => handleChange("displayName", e.target.value)}
              placeholder={measure.name}
            />
          </div>
          <div className="mock-inspector-field">
            <label className="mock-inspector-label" htmlFor="kpi-desc">
              Description
            </label>
            <textarea
              id="kpi-desc"
              className="mock-inspector-textarea"
              value={measure.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </section>

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Format</div>
          <div className="mock-inspector-field">
            <label className="mock-inspector-label" htmlFor="kpi-format">
              Format preset
            </label>
            <select
              id="kpi-format"
              className="mock-inspector-select"
              value={measure.formatPreset ?? "number"}
              onChange={(e) => handleChange("formatPreset", e.target.value)}
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mock-inspector-note">
            Preview: <span className="mock-inspector-preview">{preview}</span>
          </div>
        </section>

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Expression</div>
          <div className="mock-inspector-code">{measure.expression || measure.name}</div>
          <div className="mock-inspector-note">
            Expressions are edited in the metrics-view YAML in Rill; shown read-only here.
          </div>
        </section>

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Options</div>
          <label className="mock-inspector-option">
            <span className="mock-inspector-label">Hide on dashboard</span>
            <input
              type="checkbox"
              checked={Boolean(measure.hide)}
              onChange={(e) => handleChange("hide", e.target.checked)}
            />
          </label>
          <label className="mock-inspector-option">
            <span className="mock-inspector-label">Valid % of total</span>
            <input
              type="checkbox"
              checked={Boolean(measure.validPercentOfTotal)}
              onChange={(e) => handleChange("validPercentOfTotal", e.target.checked)}
            />
          </label>
        </section>
      </div>
    </aside>
  );
}

function formatValue(value, preset) {
  if (preset === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (preset === "percent") return `${value}%`;
  return new Intl.NumberFormat("en-US").format(value);
}

function CloseIcon({ size = "16px", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
