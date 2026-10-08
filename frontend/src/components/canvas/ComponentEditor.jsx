import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { mockDimensions, mockMeasures } from "@/data/mockCanvas";

const MARK_OPTIONS = [
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
];

const FORMAT_OPTIONS = [
  { value: "currency", label: "Currency" },
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent" },
];

/**
 * Per-card property editor (Parrot's `ParamMapper` translation). Renders the editable
 * fields for the selected canvas card by type and an "Edit with AI" prompt for the
 * analytics cards. Writes each change back via `onChange(specPatch)`.
 */
export function ComponentEditor({ component, onClose, onChange, onDelete, onAiEdit }) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");

  if (!component) return null;
  const spec = component.spec || {};
  const type = component.type;
  const isChart = ["line", "bar", "area"].includes(type);
  const hasAi = type !== "markdown" && type !== "image";

  const sendAi = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy) return;
    setAiBusy(true);
    setAiNote("");
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
    <aside className="canvas-inspector">
      <div className="mock-inspector-header">
        <h3>{spec.title || type}</h3>
        <span className="mock-inspector-badge">{type}</span>
        <button type="button" className="mock-inspector-close" onClick={onClose} aria-label="Close editor">
          <X size={16} />
        </button>
      </div>

      <div className="mock-inspector-body">
        {hasAi ? (
          <section className="mock-inspector-section">
            <div className="mock-inspector-section-title">Edit with AI</div>
            <div className="mock-inspector-ai">
              <textarea
                className="mock-inspector-ai-textarea"
                rows={2}
                placeholder="Describe changes to this card…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    sendAi();
                  }
                }}
                aria-label="Edit this card with AI"
              />
              <button
                type="button"
                className="mock-inspector-ai-send"
                onClick={sendAi}
                disabled={aiBusy || !aiPrompt.trim()}
                aria-label="Send prompt"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4Z" />
                </svg>
              </button>
            </div>
            {aiBusy ? (
              <div className="mock-inspector-ai-note">AI is editing…</div>
            ) : aiNote ? (
              <div className="mock-inspector-ai-note">{aiNote}</div>
            ) : (
              <div className="mock-inspector-ai-note">e.g. “add a comparison”, “switch to bar”, “rename to Annual revenue”</div>
            )}
          </section>
        ) : null}

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">General</div>
          <div className="mock-inspector-field">
            <label className="mock-inspector-label" htmlFor="canvas-title">Title</label>
            <input
              id="canvas-title"
              className="mock-inspector-input"
              value={spec.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>
          <div className="mock-inspector-field">
            <label className="mock-inspector-label" htmlFor="canvas-desc">Description</label>
            <textarea
              id="canvas-desc"
              className="mock-inspector-textarea"
              rows={2}
              value={spec.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
          <label className="mock-inspector-option">
            <span className="mock-inspector-label">Show description as tooltip</span>
            <input
              type="checkbox"
              checked={Boolean(spec.show_description_as_tooltip)}
              onChange={(e) => onChange({ show_description_as_tooltip: e.target.checked })}
            />
          </label>
        </section>

        {isChart ? <ChartFields spec={spec} onChange={onChange} /> : null}
        {type === "kpi_grid" ? <KpiFields spec={spec} onChange={onChange} /> : null}
        {type === "leaderboard" ? <LeaderboardFields spec={spec} onChange={onChange} /> : null}
        {["pivot", "table"].includes(type) ? <TableFields spec={spec} onChange={onChange} /> : null}
        {type === "markdown" ? <MarkdownFields spec={spec} onChange={onChange} /> : null}
        {type === "image" ? <ImageFields spec={spec} onChange={onChange} /> : null}

        <section className="mock-inspector-section">
          <div className="mock-inspector-section-title">Actions</div>
          <button type="button" className="canvas-inspector-delete" onClick={onDelete}>
            <Trash2 size={14} />
            <span>Delete card</span>
          </button>
        </section>
      </div>
    </aside>
  );
}

function ChartFields({ spec, onChange }) {
  const x = spec.x || {};
  const y = spec.y || {};
  return (
    <section className="mock-inspector-section">
      <div className="mock-inspector-section-title">Chart</div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-mark">Mark</label>
        <select
          id="canvas-mark"
          className="mock-inspector-select"
          value={spec.mark || "area"}
          onChange={(e) => onChange({ mark: e.target.value })}
        >
          {MARK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-x">X (dimension)</label>
        <select
          id="canvas-x"
          className="mock-inspector-select"
          value={x.field || "time"}
          onChange={(e) => onChange({ x: { ...x, field: e.target.value, type: e.target.value === "time" ? "temporal" : "nominal" } })}
        >
          {mockDimensions().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-y">Y (measure)</label>
        <select
          id="canvas-y"
          className="mock-inspector-select"
          value={y.field || "total_revenue"}
          onChange={(e) => onChange({ y: { ...y, field: e.target.value } })}
        >
          {mockMeasures().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-color">Color by</label>
        <select
          id="canvas-color"
          className="mock-inspector-select"
          value={(spec.color && spec.color.field) || (x.field === "time" ? "channel" : "none")}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "none" ? { color: { field: null } } : { color: { field: v } });
          }}
        >
          <option value="none">None</option>
          {mockDimensions().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </section>
  );
}

function KpiFields({ spec, onChange }) {
  return (
    <section className="mock-inspector-section">
      <div className="mock-inspector-section-title">KPI</div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-kpi-measure">Measure</label>
        <select
          id="canvas-kpi-measure"
          className="mock-inspector-select"
          value={(spec.measures && spec.measures[0]) || "total_revenue"}
          onChange={(e) => onChange({ measures: [e.target.value] })}
        >
          {mockMeasures().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-kpi-format">Format</label>
        <select
          id="canvas-kpi-format"
          className="mock-inspector-select"
          value={spec.formatPreset || "currency"}
          onChange={(e) => onChange({ formatPreset: e.target.value })}
        >
          {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-kpi-mark">Sparkline mark</label>
        <select
          id="canvas-kpi-mark"
          className="mock-inspector-select"
          value={spec.mark || "area"}
          onChange={(e) => onChange({ mark: e.target.value })}
        >
          {MARK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <label className="mock-inspector-option">
        <span className="mock-inspector-label">Sparkline</span>
        <input
          type="checkbox"
          checked={spec.sparkline !== false}
          onChange={(e) => onChange({ sparkline: e.target.checked })}
        />
      </label>
      <label className="mock-inspector-option">
        <span className="mock-inspector-label">Show comparison</span>
        <input
          type="checkbox"
          checked={Boolean(spec.comparison)}
          onChange={(e) => onChange({ comparison: e.target.checked })}
        />
      </label>
    </section>
  );
}

function LeaderboardFields({ spec, onChange }) {
  return (
    <section className="mock-inspector-section">
      <div className="mock-inspector-section-title">Leaderboard</div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-lb-measure">Measure</label>
        <select
          id="canvas-lb-measure"
          className="mock-inspector-select"
          value={(spec.measures && spec.measures[0]) || "total_revenue"}
          onChange={(e) => onChange({ measures: [e.target.value] })}
        >
          {mockMeasures().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-lb-dim">Dimension</label>
        <select
          id="canvas-lb-dim"
          className="mock-inspector-select"
          value={(spec.dimensions && spec.dimensions[0]) || "channel"}
          onChange={(e) => onChange({ dimensions: [e.target.value] })}
        >
          {mockDimensions().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-lb-rows">Rows</label>
        <input
          id="canvas-lb-rows"
          type="number"
          min={1}
          max={10}
          className="mock-inspector-input"
          value={spec.num_rows || 5}
          onChange={(e) => onChange({ num_rows: Number(e.target.value) })}
        />
      </div>
    </section>
  );
}

function TableFields({ spec, onChange }) {
  return (
    <section className="mock-inspector-section">
      <div className="mock-inspector-section-title">Table</div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-table-cols">Columns (comma-separated)</label>
        <input
          id="canvas-table-cols"
          className="mock-inspector-input"
          value={(spec.columns || []).join(", ")}
          onChange={(e) => onChange({ columns: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })}
        />
      </div>
      <label className="mock-inspector-option">
        <span className="mock-inspector-label">Hide totals row</span>
        <input
          type="checkbox"
          checked={Boolean(spec.hide_totals_row)}
          onChange={(e) => onChange({ hide_totals_row: e.target.checked })}
        />
      </label>
    </section>
  );
}

function MarkdownFields({ spec, onChange }) {
  return (
    <section className="mock-inspector-section">
      <div className="mock-inspector-section-title">Markdown</div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-md-content">Content</label>
        <textarea
          id="canvas-md-content"
          className="mock-inspector-textarea"
          rows={6}
          value={spec.content || ""}
          onChange={(e) => onChange({ content: e.target.value })}
        />
      </div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-md-align">Alignment</label>
        <select
          id="canvas-md-align"
          className="mock-inspector-select"
          value={spec.alignment || "left"}
          onChange={(e) => onChange({ alignment: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </section>
  );
}

function ImageFields({ spec, onChange }) {
  return (
    <section className="mock-inspector-section">
      <div className="mock-inspector-section-title">Image</div>
      <div className="mock-inspector-field">
        <label className="mock-inspector-label" htmlFor="canvas-img-url">URL</label>
        <input
          id="canvas-img-url"
          className="mock-inspector-input"
          value={spec.url || ""}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </div>
    </section>
  );
}

export default ComponentEditor;
