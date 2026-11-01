import { AreaChart } from "./Chart";

type TokenType = "kw" | "fn" | "str" | "num" | "comment" | "value";

const SQL_LINES: { tokens: { text: string; type?: TokenType }[] }[] = [
  { tokens: [{ text: "-- revenue, last 12 weeks", type: "comment" }] },
  {
    tokens: [
      { text: "SELECT", type: "kw" },
      { text: " date_trunc", type: "fn" },
      { text: "(" },
      { text: "'week'", type: "str" },
      { text: ", created_at) " },
      { text: "AS", type: "kw" },
      { text: " week," },
    ],
  },
  {
    tokens: [
      { text: "       sum", type: "fn" },
      { text: "(" },
      { text: "revenue", type: "value" },
      { text: ") " },
      { text: "AS", type: "kw" },
      { text: " revenue" },
    ],
  },
  {
    tokens: [
      { text: "FROM", type: "kw" },
      { text: " metrics.orders" },
    ],
  },
  {
    tokens: [
      { text: "WHERE", type: "kw" },
      { text: " plan = " },
      { text: "'enterprise'", type: "str" },
    ],
  },
  { tokens: [{ text: "GROUP BY", type: "kw" }, { text: " 1" }] },
  {
    tokens: [
      { text: "ORDER BY", type: "kw" },
      { text: " 1 " },
      { text: "DESC", type: "kw" },
      { text: ";" },
    ],
  },
];

const REVENUE = [62, 66, 64, 71, 74, 72, 79, 83, 81, 88, 95, 102.7];

export function QueriesSection() {
  return (
    <section className="queries" id="queries">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">
            <span className="display-line">Your questions run queries.</span>
            <span className="display-line is-muted">And explain themselves.</span>
          </h2>
          <p className="section-note">
            Every answer is a query over your metrics layer, and every chart has the SQL behind it
            one click away. The agent never hides the work.
          </p>
        </div>

        <div className="mock-panel">
          <div className="mock-top">
            <div className="mock-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="mock-tabs">
              <span className="mock-tab is-active">SQL</span>
              <span className="mock-tab">Chart</span>
              <span className="mock-tab">Agent</span>
            </div>
          </div>

          <div className="mock-body">
            <div className="mock-sql">
              <pre>
                <code>
                  {SQL_LINES.map((line, i) => (
                    <span className="sql-line" key={i}>
                      <span className="sql-gutter">{i + 1}</span>
                      <span className="sql-code">
                        {line.tokens.map((token, j) => (
                          <span
                            key={j}
                            className={token.type ? `sql-${token.type}` : undefined}
                          >
                            {token.text}
                          </span>
                        ))}
                      </span>
                    </span>
                  ))}
                </code>
              </pre>
              <div className="mock-sql-meta">
                <span>1,284 rows</span>
                <span>38 ms</span>
              </div>
            </div>

            <div className="mock-chart">
              <div className="mock-chart-head">
                <div>
                  <span className="kpi-label">Revenue · enterprise</span>
                  <span className="kpi-value">$102.7k</span>
                </div>
                <span className="kpi-delta">
                  <span aria-hidden="true">↑</span> 18.4% week over week
                </span>
              </div>
              <AreaChart values={REVENUE} className="mock-chart-svg" height={200} />
              <div className="mock-axis">
                <span>Aug 10</span>
                <span>Sep 07</span>
                <span>Oct 05</span>
                <span>Nov 01</span>
              </div>
            </div>
          </div>

          <div className="mock-answer">
            <span className="answer-tag">
              <span className="answer-dot" aria-hidden="true" />
              Agent
            </span>
            <p>Revenue grew 18.4% week over week; the jump is all Enterprise.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
