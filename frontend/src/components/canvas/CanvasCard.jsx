import { useMemo } from "react";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import MockChart from "@/components/widgets/MockChart";
import {
  getCardData,
  getKpiValue,
  formatCanvasValue,
  mockMeasures,
} from "@/data/mockCanvas";
import { buildMockTimeSeries } from "@/data/mockAdapter";
import { cn } from "@/lib/utils";

/**
 * A single canvas card. Renders the component by type (KPI grid, chart, leaderboard,
 * pivot/table, markdown, image) from its mock spec and surfaces the editor affordances:
 * click to select, drag handle to reorder, hover actions to edit / delete.
 */
export function CanvasCard({ item, selected, onSelect, onDelete, onDragStart }) {
  const spec = item.spec || {};
  const chartTypes = ["line", "bar", "area"];

  return (
    <div
      className={cn("canvas-card", selected && "canvas-card--selected")}
      onMouseDown={() => onSelect(item.id)}
      title={spec.show_description_as_tooltip ? spec.description : undefined}
    >
      <CardHeader spec={spec} />
      <div className="canvas-card-actions" onMouseDown={(e) => e.stopPropagation()}>
        {!["markdown", "image"].includes(item.type) && (
          <span
            className="canvas-card-drag"
            title="Drag to reorder"
            draggable
            onDragStart={onDragStart}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </span>
        )}
        <button className="canvas-card-action" title="Edit" onMouseDown={() => onSelect(item.id)}>
          <Pencil size={14} />
        </button>
        <button className="canvas-card-action canvas-card-action--danger" title="Delete" onClick={() => onDelete(item.id)}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="canvas-card-body">
        {item.type === "kpi_grid" ? <KpiGrid spec={spec} /> : null}
        {chartTypes.includes(item.type) ? <ChartBody spec={spec} itemType={item.type} /> : null}
        {item.type === "leaderboard" ? <LeaderboardBody spec={spec} /> : null}
        {["pivot", "table"].includes(item.type) ? <TableBody spec={spec} /> : null}
        {item.type === "markdown" ? <MarkdownBody spec={spec} /> : null}
        {item.type === "image" ? <ImageBody spec={spec} /> : null}
      </div>
    </div>
  );
}

function CardHeader({ spec }) {
  if (!spec.title && !spec.description) return null;
  return (
    <div className="canvas-card-header">
      {spec.title ? <span className="canvas-card-title">{spec.title}</span> : null}
      {!spec.show_description_as_tooltip && spec.description ? (
        <span className="canvas-card-subtitle">{spec.description}</span>
      ) : null}
    </div>
  );
}

/** Big-number row (one KPI) + optional sparkline, the card's hero. */
function KpiGrid({ spec }) {
  const measure = spec.measures && spec.measures[0] ? spec.measures[0] : "total_revenue";
  const value = getKpiValue(measure);
  const delta = useMemo(() => kpiDayOverDay(measure), [measure]);
  return (
    <div className="canvas-kpi">
      <div className="canvas-kpi-value-row">
        <span className="canvas-kpi-value">{formatCanvasValue(value, spec.formatPreset)}</span>
        {spec.comparison && delta != null ? (
          <span className={cn("mock-kpi-comparison", delta >= 0 ? "up" : "down")}>
            {delta >= 0 ? "▲" : "▼"}{Math.abs(delta).toFixed(1)}% vs prev
          </span>
        ) : null}
      </div>
      {spec.sparkline !== false ? (
        <MockChart
          values={buildMockTimeSeries()}
          xField="time"
          yField={measure}
          mark={spec.mark || "area"}
          xType="temporal"
          aggregate
          height={90}
        />
      ) : null}
    </div>
  );
}

function ChartBody({ spec, itemType }) {
  const data = getCardData(spec);
  const mark = spec.mark || itemType || "area";
  return (
    <div className="canvas-chart">
      <MockChart
        values={data.values}
        xField={data.xField}
        yField={data.yField}
        mark={mark}
        colorField={data.colorField}
        xType={data.xType}
        height={220}
      />
    </div>
  );
}

function LeaderboardBody({ spec }) {
  const dim = spec.dimensions && spec.dimensions[0] ? spec.dimensions[0] : "channel";
  const measure = spec.measures && spec.measures[0] ? spec.measures[0] : "total_revenue";
  const rows = useMemo(() => {
    const src = dim === "time"
      ? buildMockTimeSeries()
      : getCardData({ metrics_view: spec.metrics_view, x: { field: dim }, y: { field: measure } }).values;
    const agg = new Map();
    for (const r of (src || [])) {
      const key = r[dim];
      if (key == null) continue;
      agg.set(key, (agg.get(key) || 0) + (r[measure] || 0));
    }
    const ranked = Array.from(agg.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, spec.num_rows || 5);
    const max = ranked.length ? ranked[0].value : 1;
    return ranked.map((r) => ({ ...r, pct: (r.value / max) * 100 }));
  }, [dim, measure, spec.metrics_view, spec.num_rows]);
  return (
    <div className="canvas-leaderboard">
      {rows.map((r, i) => (
        <div key={r.label} className="canvas-leaderboard-row">
          <span className="canvas-leaderboard-rank">{i + 1}</span>
          <div className="canvas-leaderboard-main">
            <span className="canvas-leaderboard-label">{r.label}</span>
            <span className="canvas-leaderboard-bar" style={{ width: `${r.pct}%` }} />
          </div>
          <span className="canvas-leaderboard-value">{formatCanvasValue(r.value, spec.formatPreset)}</span>
        </div>
      ))}
    </div>
  );
}

function TableBody({ spec }) {
  const cols = spec.columns && spec.columns.length ? spec.columns : ["channel", "total_revenue", "order_count", "aov"];
  const rows = useMemo(() => {
    // Aggregate a few categorical rows + a totals row to keep the table bounded.
    const source = getCardData({ metrics_view: spec.metrics_view, x: { field: "channel" } }).values;
    const measures = cols.filter((c) => mockMeasures().includes(c));
    const dims = cols.filter((c) => !mockMeasures().includes(c));
    const cellFor = (row, col) => (measures.includes(col) ? Number(row[col] || 0).toLocaleString() : row[col] ?? "—");
    const body = (source || []).map((row) => cols.map((c) => cellFor(row, c)));
    if (spec.hide_totals_row) return { dims, body, total: null };
    const totals = measures.map((m) => source?.reduce((acc, r) => acc + (r[m] || 0), 0));
    const totalRow = cols.map((c) => (measures.includes(c) ? Number(totals[measures.indexOf(c)] || 0).toLocaleString() : "Total"));
    return { dims, body, total: totalRow };
  }, [spec.metrics_view, spec.columns, spec.hide_totals_row]);
  return (
    <div className="canvas-table-wrap">
      <table className="canvas-table">
        <thead>
          <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.body.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}
          {rows.total ? <tr className="canvas-table-total">{rows.total.map((cell, j) => <td key={j}>{cell}</td>)}</tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownBody({ spec }) {
  return <div className="canvas-markdown">{renderMarkdown(spec.content || "")}</div>;
}

function ImageBody({ spec }) {
  return <div className="canvas-image"><img src={spec.url} alt="" /></div>;
}

/** User-facing day-over-day % for a KPI, computed from the mock time series. */
function kpiDayOverDay(measure) {
  const rows = buildMockTimeSeries();
  const byDay = new Map();
  for (const r of rows) {
    byDay.set(r.time, (byDay.get(r.time) || 0) + (r[measure] || 0));
  }
  const days = Array.from(byDay.values());
  const last = days[days.length - 1];
  const prev = days[days.length - 2];
  if (last == null || prev == null || prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

/** Minimal markdown renderer (headings, bold, code, lists, paragraphs). */
function renderMarkdown(md) {
  const blocks = md.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (/^###\s+/.test(trimmed)) return <h4 key={i}>{trimmed.replace(/^###\s+/, "")}</h4>;
    if (/^##\s+/.test(trimmed)) return <h3 key={i}>{trimmed.replace(/^##\s+/, "")}</h3>;
    if (/^#\s+/.test(trimmed)) return <h2 key={i}>{trimmed.replace(/^#\s+/, "")}</h2>;
    if (/^[-*]\s+/.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ""));
      return <ul key={i}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
    }
    return <p key={i}>{inline(trimmed)}</p>;
  });
}

function inline(text) {
  const parts = (text || "").split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

export default CanvasCard;
