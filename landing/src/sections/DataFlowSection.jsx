const hollowDotIndexes = new Set([2, 9, 11, 15, 21, 24, 27, 30, 31, 34, 40, 42, 43, 45, 46, 49, 57, 59, 61, 66, 70, 74]);

function DataSourcesColumn() {
  return (
    <div className="flow-column flow-sources" aria-label="Data sources">
      <article className="flow-card source-card source-card-auth">
        <div className="shape-row">
          <span className="mini-square"></span>
          <span className="icon-frame">
            <span className="key-icon">
              <span className="key-ring"></span>
              <span className="key-shaft"></span>
              <span className="key-tooth"></span>
            </span>
          </span>
          <span className="mini-square is-accent"></span>
          <span className="mini-square"></span>
        </div>
      </article>

      <div className="flow-arrow" aria-hidden="true"></div>

      <article className="flow-card source-card source-card-streams">
        <div className="shape-row is-stacked">
          <div className="mini-folder"></div>
          <div className="mini-bars">
            <span className="mini-bar"><span className="mini-fill is-coral short"></span></span>
            <span className="mini-bar"><span className="mini-fill is-violet long"></span></span>
            <span className="mini-bar"><span className="mini-fill is-coral mid"></span></span>
            <span className="mini-bar"><span className="mini-fill is-slate short"></span></span>
          </div>
        </div>
      </article>

      <div className="flow-arrow" aria-hidden="true"></div>

      <article className="flow-card source-card source-card-storage">
        <div className="shape-row">
          <div className="database-stack">
            <span className="db-disc"></span>
            <span className="db-disc"></span>
            <span className="db-disc"></span>
            <span className="db-disc"></span>
            <span className="db-dot is-coral top"></span>
            <span className="db-dot is-coral lower"></span>
            <span className="db-dot is-slate mid"></span>
          </div>
        </div>
      </article>

      <div className="flow-label">Data Sources</div>
    </div>
  );
}

function RawDataPanel() {
  return (
    <article className="platform-panel">
      <div className="panel-title">Raw Data</div>
      <div className="raw-grid" aria-hidden="true">
        {Array.from({ length: 80 }, (_, index) => (
          <span key={index} className={`raw-dot${hollowDotIndexes.has(index) ? " hollow" : ""}`}></span>
        ))}
      </div>
    </article>
  );
}

function AnalysisReadyPanel() {
  return (
    <article className="platform-panel">
      <div className="panel-title">Analysis Ready</div>
      <div className="branch-stack" aria-hidden="true">
        <div className="branch-group">
          <span className="branch-pill is-slate"></span>
          <span className="branch-line elbow"></span>
          <span className="branch-pill is-coral"></span>
          <span className="branch-pill is-coral"></span>
          <span className="branch-line mid"></span>
          <span className="branch-pill is-slate short"></span>
        </div>
        <div className="branch-group is-wide">
          <span className="branch-pill is-slate"></span>
          <span className="branch-line elbow"></span>
          <div className="branch-column">
            <span className="branch-pill is-coral"></span>
            <span className="branch-pill is-coral"></span>
            <span className="branch-pill is-coral"></span>
          </div>
          <span className="branch-line down"></span>
          <span className="branch-pill is-violet short"></span>
        </div>
        <div className="branch-group">
          <span className="branch-pill is-slate"></span>
          <span className="branch-line elbow"></span>
          <div className="branch-column short-gap">
            <span className="branch-pill is-coral"></span>
            <span className="branch-pill is-coral"></span>
          </div>
        </div>
      </div>
    </article>
  );
}

function DataPlatformColumn() {
  return (
    <div className="flow-platform" aria-label="Data platform">
      <div className="platform-frame">
        <div className="platform-panels">
          <RawDataPanel />
          <AnalysisReadyPanel />
        </div>
      </div>

      <div className="flow-label">Data Platform</div>
    </div>
  );
}

function OutputsColumn() {
  return (
    <div className="flow-column flow-outputs" aria-label="Analytics and AI">
      <article className="flow-card output-card output-card-chat">
        <div className="chat-shell">
          <span className="chat-bubble"></span>
          <span className="chat-input"></span>
          <span className="chat-button">Enter</span>
        </div>
      </article>

      <div className="flow-arrow" aria-hidden="true"></div>

      <article className="flow-card output-card output-card-line">
        <div className="line-chart">
          <span className="line-segment seg-1"></span>
          <span className="line-segment seg-2"></span>
          <span className="line-segment seg-3"></span>
          <span className="line-dot dot-1"></span>
          <span className="line-dot dot-2"></span>
          <span className="line-dot dot-3"></span>
          <span className="line-dot dot-4"></span>
        </div>
      </article>

      <div className="flow-arrow" aria-hidden="true"></div>

      <article className="flow-card output-card output-card-bars">
        <div className="bar-chart">
          <span className="bar short"></span>
          <span className="bar mid"></span>
          <span className="bar tall accent"></span>
          <span className="bar max"></span>
        </div>
      </article>

      <div className="flow-label">Analytics and AI</div>
    </div>
  );
}

export function DataFlowSection() {
  return (
    <section className="data-flow-section" id="architecture">
      <div className="data-flow-intro">
        <span className="eyebrow">How the data moves</span>
        <h2>What users see after the hero: the path into the dashboard.</h2>
      </div>

      <div className="flow-map-shell">
        <div className="flow-map">
          <DataSourcesColumn />
          <DataPlatformColumn />
          <OutputsColumn />
        </div>
      </div>
    </section>
  );
}
