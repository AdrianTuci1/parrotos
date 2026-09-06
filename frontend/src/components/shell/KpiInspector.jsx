import { useState } from "react";
import "@/styles/explore.css";

const FORMAT_OPTIONS = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
];

const MARK_OPTIONS = [
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
];

/**
 * Rill-style KPI/measure card inspector (right-side panel).
 *
 * In Rill the per-card editor is the Canvas inspector: clicking a card selects it and
 * the inspector renders that card's fields (`ComponentsEditor`/`ParamMapper` →
 * `inputParams()`: title, description, sparkline, comparison, axes), plus, for the
 * custom-chart card, an "Edit with AI" prompt that routes to the developer agent.
 *
 * This mock inspector edits the selected mock measure's card fields and reports each
 * patch back through `onChange`; the "Edit with AI" textarea sends the prompt to the
 * `onAiEdit` handler (a mock agent in runtime-less mode, swappable for the real
 * developer agent).
 */
export default function KpiInspector({
  measure,
  open,
  width = 320,
  onResizeStart,
  onClose,
  onChange,
  onAiEdit,
}) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");

  if (!open || !measure) return null;

  const handleChange = (field, value) => onChange({ field, value });
  const preview = formatValue(1234.5, measure.formatPreset);

  const sendAi = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy) return;
    setAiBusy(true);
    setAiNote("");
    // Give the "AI is editing…" state a beat before applying, like the streaming agent.
    await new Promise((r) => setTimeout(r, 700));
    try {
      const message = await onAiEdit(prompt);
      setAiNote(message);
      setAiPrompt("");
    } catch {
      setAiNote("Sorry, I couldn’t apply that change.");
    } finally {
      setAiBusy(false);
    }
  };

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
          <div className="mock-inspector-section-title">Edit with AI</div>
          <div className="mock-inspector-ai">
            <textarea
              className="mock-inspector-ai-textarea"
              rows={2}
              placeholder="Describe changes to this KPI…"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendAi();
                }
              }}
              aria-label="Describe this KPI"
            />
            <button
              type="button"
              className="mock-inspector-ai-send"
              onClick={sendAi}
              disabled={aiBusy || !aiPrompt.trim()}
              aria-label="Edit with AI"
            >
              <SendIcon size={14} />
            </button>
          </div>
          {aiBusy ? (
            <div className="mock-inspector-ai-note">AI is editing…</div>
          ) : aiNote ? (
            <div className="mock-inspector-ai-note">{aiNote}</div>
          ) : (
            <div className="mock-inspector-ai-note">
              e.g. “add a comparison”, “switch to bar”, “rename to Annual revenue”
            </div>
          )}
        </section>

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
          <div className="mock-inspector-section-title">Display</div>
          <div className="mock-inspector-field">
            <label className="mock-inspector-label" htmlFor="kpi-mark">
              Chart type
            </label>
            <select
              id="kpi-mark"
              className="mock-inspector-select"
              value={measure.mark ?? "area"}
              onChange={(e) => handleChange("mark", e.target.value)}
            >
              {MARK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
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
          <div className="mock-inspector-section-title">Options</div>
          <label className="mock-inspector-option">
            <span className="mock-inspector-label">Sparkline</span>
            <input
              type="checkbox"
              checked={measure.sparkline !== false}
              onChange={(e) => handleChange("sparkline", e.target.checked)}
            />
          </label>
          <label className="mock-inspector-option">
            <span className="mock-inspector-label">Show comparison</span>
            <input
              type="checkbox"
              checked={Boolean(measure.comparison)}
              onChange={(e) => handleChange("comparison", e.target.checked)}
            />
          </label>
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

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Expression</div>
          <div className="mock-inspector-code">{measure.expression || measure.name}</div>
          <div className="mock-inspector-note">
            Expressions are edited in the metrics-view YAML in Rill; shown read-only here.
          </div>
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

function SendIcon({ size = "16px", className = "" }) {
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
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}
