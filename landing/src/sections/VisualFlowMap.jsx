import React from "react";
import "./VisualFlowMap.css";

export function VisualFlowMap({ scale = 1 }) {
  const baseHeight = 575;
  const scaledHeight = baseHeight * scale;

  return (
    <div 
      className={`flow-map-scaler-wrapper ${scale < 1 ? "is-scaled" : ""}`}
      style={scale < 1 ? { height: `${scaledHeight}px` } : {}}
    >
      <div 
        className="flow-map-scaler-content"
        style={scale < 1 ? { 
          transform: `scale(${scale})`, 
          transformOrigin: "top center",
          width: "1060px"
        } : {}}
      >
        <div className="visualizer-container-flow">
          <div className="flow-map">
            {/* --- DATA SOURCES --- */}
            <article className="flow-card source-card source-card-auth" title="Authentication Events">
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

            <article className="flow-card source-card source-card-streams" title="Real-time Streams">
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

            <article className="flow-card source-card source-card-storage" title="Data Storage">
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

            <div className="flow-label label-sources">Data Sources</div>

            {/* Mobile vertical arrow 1 (not used on scale desktop look, kept for structure) */}
            <div className="flow-arrow-vertical mobile-only" aria-hidden="true"></div>

            {/* --- DATA PLATFORM --- */}
            <div className="flow-platform" aria-label="Data platform">
              <div className="platform-frame">
                <div className="platform-panels">
                  {/* Raw Data Panel */}
                  <article className="platform-panel">
                    <div className="panel-title">Raw Data</div>
                    <div className="raw-grid" aria-hidden="true">
                      {Array.from({ length: 80 }, (_, index) => {
                        const hollowDotIndexes = new Set([2, 9, 11, 15, 21, 24, 27, 30, 31, 34, 40, 42, 43, 45, 46, 49, 57, 59, 61, 66, 70, 74]);
                        return (
                          <span key={index} className={`raw-dot${hollowDotIndexes.has(index) ? " hollow" : ""}`}></span>
                        );
                      })}
                    </div>
                  </article>

                  {/* Analysis Ready Panel */}
                  <article className="platform-panel">
                    <div className="panel-title">Analysis Ready</div>
                    <div className="tree-graph" aria-hidden="true">
                      <svg className="tree-svg-lines" viewBox="0 0 200 120" preserveAspectRatio="none">
                        <path d="M 20 60 H 60" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 60 30 V 90" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 60 30 H 100" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 60 90 H 100" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        
                        <path d="M 100 30 H 140" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 140 15 V 45" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 140 15 H 180" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 140 45 H 180" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        
                        <path d="M 100 90 H 140" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 140 75 V 105" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 140 75 H 180" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                        <path d="M 140 105 H 180" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" fill="none" />
                      </svg>

                      <div className="tree-nodes">
                        <div className="tree-node-col root-col">
                          <span className="tree-node-pill root-node is-slate"></span>
                        </div>
                        <div className="tree-node-col branch-col">
                          <span className="tree-node-pill branch-node node-b1 is-coral"></span>
                          <span className="tree-node-pill branch-node node-b2 is-violet"></span>
                        </div>
                        <div className="tree-node-col leaf-col">
                          <span className="tree-node-pill leaf-node node-l1 is-coral"></span>
                          <span className="tree-node-pill leaf-node node-l2 is-slate"></span>
                          <span className="tree-node-pill leaf-node node-l3 is-violet"></span>
                          <span className="tree-node-pill leaf-node node-l4 is-coral"></span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </div>

            <div className="flow-label label-platform">Data Platform</div>

            {/* Mobile vertical arrow 2 */}
            <div className="flow-arrow-vertical mobile-only" aria-hidden="true"></div>

            {/* --- ANALYTICS AND AI --- */}
            <article className="flow-card output-card output-card-chat" title="AI Chat Query">
              <div className="chat-shell">
                <span className="chat-bubble">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
                <span className="chat-input"></span>
                <button className="chat-button" aria-label="Send Query">
                  Enter
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px" }}>
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </article>

            <article className="flow-card output-card output-card-line" title="Performance Trends">
              <div className="line-chart">
                <svg className="line-chart-svg" viewBox="0 0 200 75" preserveAspectRatio="none">
                  <path d="M 20 60 L 70 50 L 120 20 L 180 5" stroke="var(--accent-coral)" strokeWidth="2" fill="none" />
                  <circle cx="20" cy="60" r="4.5" fill="var(--accent-coral)" stroke="#0c0c0e" strokeWidth="1.5" />
                  <circle cx="70" cy="50" r="4.5" fill="var(--accent-coral)" stroke="#0c0c0e" strokeWidth="1.5" />
                  <circle cx="120" cy="20" r="4.5" fill="var(--accent-coral)" stroke="#0c0c0e" strokeWidth="1.5" />
                  <circle cx="180" cy="5" r="4.5" fill="var(--accent-coral)" stroke="#0c0c0e" strokeWidth="1.5" />
                </svg>
              </div>
            </article>

            <article className="flow-card output-card output-card-bars" title="Data Visualizations">
              <div className="bar-chart">
                <span className="bar short"></span>
                <span className="bar mid"></span>
                <span className="bar tall accent"></span>
                <span className="bar max"></span>
              </div>
            </article>

            <div className="flow-label label-outputs">Analytics and AI</div>

            {/* --- DESKTOP HORIZONTAL ARROWS --- */}
            <div className="flow-arrow-horizontal arrow-left-1 desktop-only" aria-hidden="true"></div>
            <div className="flow-arrow-horizontal arrow-left-2 desktop-only" aria-hidden="true"></div>
            <div className="flow-arrow-horizontal arrow-left-3 desktop-only" aria-hidden="true"></div>

            <div className="flow-arrow-horizontal arrow-right-1 desktop-only" aria-hidden="true"></div>
            <div className="flow-arrow-horizontal arrow-right-2 desktop-only" aria-hidden="true"></div>
            <div className="flow-arrow-horizontal arrow-right-3 desktop-only" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
