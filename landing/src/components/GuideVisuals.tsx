import { AreaChart } from "./Chart";

/* 01 — a miniature dashboard */
const KPIS = [
  {
    label: "Revenue",
    value: "102.7k",
    delta: "+12.4%",
    series: [58, 61, 60, 66, 69, 67, 73, 76, 74, 81, 88, 96],
  },
  {
    label: "Activation",
    value: "46.7%",
    delta: "+6.7pp",
    series: [38, 40, 39, 42, 41, 44, 43, 45, 44, 46, 45, 46.7],
  },
  {
    label: "Churn",
    value: "2.1%",
    delta: "−0.4pp",
    series: [3.2, 3.1, 3.0, 2.9, 2.8, 2.9, 2.6, 2.5, 2.4, 2.3, 2.2, 2.1],
  },
];

export function MovedPanel() {
  return (
    <div className="guide-panel">
      <div className="guide-panel-head">
        <span className="panel-title">Product health</span>
        <span className="panel-chip">Last 12 weeks</span>
      </div>
      <div className="kpi-grid">
        {KPIS.map((kpi) => (
          <div className="kpi-tile" key={kpi.label}>
            <span className="kpi-label">{kpi.label}</span>
            <span className="kpi-value">{kpi.value}</span>
            <span className="kpi-delta">{kpi.delta}</span>
            <AreaChart values={kpi.series} height={90} grid={false} className="spark" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 02 — a chat thread with a small chart */
export function ChatPanel() {
  return (
    <div className="guide-panel chat-panel">
      <div className="chat-row chat-row-user">
        <div className="chat-bubble chat-bubble-user">Why did activation drop in March?</div>
      </div>
      <div className="chat-row">
        <div className="chat-answer">
          <span className="chat-agent-head">
            <span className="agent-dot" aria-hidden="true" />
            Agent
          </span>
          <p>
            Activation fell 4.1pp after the March 8 build shipped without the onboarding step. It
            recovered once the step was restored on March 22.
          </p>
          <div className="chat-chart">
            <AreaChart
              values={[52, 54, 51, 47, 43, 40, 42, 47, 50, 53]}
              height={80}
              grid={false}
              strokeWidth={1.5}
              endDot={false}
            />
            <div className="chat-chart-axis">
              <span>Feb 22</span>
              <span>Mar 15</span>
              <span>Apr 05</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 03 — the project as files */
export function FilesPanel() {
  const lines = [
    { text: "project/", depth: 0, kind: "root" },
    { text: "models/", depth: 1, kind: "dir" },
    { text: "orders.sql", depth: 2, kind: "file" },
    { text: "metrics/", depth: 1, kind: "dir" },
    { text: "revenue.yaml", depth: 2, kind: "file" },
    { text: "dashboards/", depth: 1, kind: "dir" },
    { text: "product_health.yaml", depth: 2, kind: "file" },
  ];

  return (
    <div className="guide-panel">
      <div className="guide-panel-head">
        <span className="panel-title">project</span>
        <span className="panel-chip">main</span>
      </div>
      <ul className="file-tree">
        {lines.map((line) => (
          <li
            key={line.text}
            className={`file-row file-${line.kind}`}
            style={{ paddingLeft: line.depth * 20 }}
          >
            <span className="file-name">{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* 04 — connectors */
const SOURCES = ["Snowflake", "BigQuery", "Postgres", "ClickHouse", "S3", "GCS", "DuckDB", "Parquet"];

export function SourcesPanel() {
  return (
    <div className="guide-panel">
      <div className="source-grid">
        {SOURCES.map((source) => (
          <span className="source-chip" key={source}>
            <span className="source-mark" aria-hidden="true" />
            {source}
          </span>
        ))}
      </div>
    </div>
  );
}

/* 05 — role table */
const ROLE_COLUMNS = ["View", "Explore", "Edit metric", "Manage access"];
const ROLES = [
  { name: "Analyst", allowed: [true, true, false, false] },
  { name: "Admin", allowed: [true, true, true, true] },
];

export function GovernancePanel() {
  return (
    <div className="guide-panel">
      <table className="role-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Role</span>
            </th>
            {ROLE_COLUMNS.map((column) => (
              <th scope="col" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLES.map((role) => (
            <tr key={role.name}>
              <th scope="row">{role.name}</th>
              {role.allowed.map((allowed, i) => (
                <td key={ROLE_COLUMNS[i]}>
                  {allowed ? (
                    <span className="tick" aria-label="allowed">
                      ✓
                    </span>
                  ) : (
                    <span className="tick tick-off" aria-label="not allowed">
                      —
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* 06 — license */
export function LicensePanel() {
  return (
    <div className="guide-panel">
      <div className="license-rows">
        <div className="license-row">
          <span className="license-key">license</span>
          <code className="license-value">Apache-2.0</code>
        </div>
        <div className="license-row">
          <span className="license-key">notice</span>
          <code className="license-value">NOTICE</code>
        </div>
      </div>
      <p className="license-note">Apache-2.0, with the license and notice files kept in the repository.</p>
    </div>
  );
}

/* 07 — questions */
const FAQ = [
  {
    question: "Can I point it at my own Postgres?",
    answer:
      "Yes. Add the connection, and models and metrics run against it. Nothing is copied out of your warehouse.",
  },
  {
    question: "Do I have to write YAML by hand?",
    answer:
      "No. Ask the agent for a metric and it writes the file for you; the file is yours to edit afterwards.",
  },
];

export function FaqPanel() {
  return (
    <div className="guide-panel faq-panel">
      {FAQ.map((item) => (
        <div className="faq-item" key={item.question}>
          <h3 className="faq-question">{item.question}</h3>
          <p className="faq-answer">{item.answer}</p>
        </div>
      ))}
      <a className="faq-docs-link" href="/docs">
        Read the docs →
      </a>
    </div>
  );
}
