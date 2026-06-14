import { Brain, ChevronDown, RefreshCw, ShieldCheck, Sigma, Sparkles, Target, Waves } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { analyticsViews } from "@/components/app-shared";
import { cn } from "@/lib/utils";
import "@/styles/dashboard.css";
import "@/styles/ml-mock.css";

const distributionBars = [
  { label: "0-20", value: 14 },
  { label: "20-40", value: 22 },
  { label: "40-60", value: 31 },
  { label: "60-80", value: 54 },
  { label: "80-100", value: 72 },
];

const linePoints = [
  { label: "Mon", predicted: 42, actual: 38 },
  { label: "Tue", predicted: 46, actual: 41 },
  { label: "Wed", predicted: 51, actual: 48 },
  { label: "Thu", predicted: 58, actual: 53 },
  { label: "Fri", predicted: 64, actual: 57 },
  { label: "Sat", predicted: 61, actual: 60 },
  { label: "Sun", predicted: 68, actual: 63 },
];

const entityRows = [
  { name: "PixelTooth EU", score: "91", segment: "High intent", source: "GA4 + Stripe", activity: "12 min ago", status: "Ready" },
  { name: "Northstar Labs", score: "87", segment: "Expansion", source: "HubSpot", activity: "27 min ago", status: "Needs email" },
  { name: "Arc Run Club", score: "84", segment: "At risk", source: "PostHog", activity: "39 min ago", status: "Ready" },
  { name: "Altwave Studio", score: "82", segment: "High intent", source: "GA4", activity: "54 min ago", status: "Mapped" },
  { name: "Kiteframe Ops", score: "79", segment: "At risk", source: "GA4 + Shopify", activity: "1h ago", status: "Ready" },
];

function buildLinePath(values, width, height, padding) {
  const max = Math.max(...values, 1);
  const step = (width - padding * 2) / Math.max(values.length - 1, 1);
  return values.map((value, index) => {
    const x = padding + index * step;
    const y = height - padding - ((value / max) * (height - padding * 2));
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}

export function MlModelsMockView() {
  const { activeAnalyticsView, setActiveAnalyticsView, timeRange, setTimeRange } = useAppStore();

  const predictedPath = buildLinePath(linePoints.map((point) => point.predicted), 640, 220, 20);
  const actualPath = buildLinePath(linePoints.map((point) => point.actual), 640, 220, 20);

  return (
    <div className="dashboard-layout-container flat ml-mock-view">
      <div className="dashboard-layout-header flat-header">
        <div className="dashboard-menu-tabs">
          {analyticsViews.map((tab) => {
            const isSelected = activeAnalyticsView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAnalyticsView(tab.id)}
                className={cn("dashboard-menu-tab-btn", isSelected ? "active" : "inactive")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="dashboard-header-controls">
          <div className="dashboard-time-select-wrapper">
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value)}
              className="dashboard-time-select"
            >
              {["24h", "7d", "30d", "90d"].map((option) => (
                <option key={option} value={option}>
                  Last {option}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="dashboard-time-select-icon" />
          </div>
          <button className="dashboard-refresh-btn" type="button">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="dashboard-grid-wrapper flat-grid">
        <div className="ml-mock-grid">
          <section className="widget-card ml-mock-card ml-mock-hero">
            <header className="widget-header">
              <span className="widget-title">Predicted Segment Lift</span>
              <span className="ml-mock-badge">Mock</span>
            </header>
            <div className="ml-mock-card-body">
              <div className="ml-mock-hero-topline">
                <Brain size={18} />
                <span>High-intent cohort built from GA4, Stripe, and HubSpot signals</span>
              </div>
              <div className="ml-mock-hero-metric">12,430 profiles</div>
              <div className="ml-mock-hero-meta">
                <span>+18.6% vs prior run</span>
                <span>window: next 30 days</span>
              </div>
            </div>
          </section>

          <section className="widget-card ml-mock-card ml-mock-hero">
            <header className="widget-header">
              <span className="widget-title">Model Operating Window</span>
              <span className="ml-mock-badge cool">v0.3</span>
            </header>
            <div className="ml-mock-card-body">
              <div className="ml-mock-hero-topline">
                <Sparkles size={18} />
                <span>Forecast is stable enough for outbound actions without hard override</span>
              </div>
              <div className="ml-mock-hero-metric">92% confidence</div>
              <div className="ml-mock-hero-meta">
                <span>last train: 2h ago</span>
                <span>drift: low</span>
              </div>
            </div>
          </section>

          <section className="widget-card ml-mock-card">
            <header className="widget-header">
              <span className="widget-title">Score Distribution</span>
            </header>
            <div className="ml-mock-card-body">
              <div className="ml-mock-bar-chart">
                {distributionBars.map((bar) => (
                  <div key={bar.label} className="ml-mock-bar-column">
                    <span className="ml-mock-bar-value">{bar.value}%</span>
                    <div className="ml-mock-bar-track">
                      <div className="ml-mock-bar-fill" style={{ height: `${bar.value}%` }} />
                    </div>
                    <span className="ml-mock-bar-label">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="widget-card ml-mock-card">
            <header className="widget-header">
              <span className="widget-title">Predicted vs Actual</span>
            </header>
            <div className="ml-mock-card-body">
              <div className="ml-mock-line-legend">
                <span><i className="ml-line-swatch predicted" />Predicted</span>
                <span><i className="ml-line-swatch actual" />Actual</span>
              </div>
              <svg viewBox="0 0 640 220" className="ml-mock-line-chart" preserveAspectRatio="none">
                {[40, 90, 140, 190].map((y) => (
                  <line key={y} x1="20" x2="620" y1={y} y2={y} className="ml-grid-line" />
                ))}
                <path d={predictedPath} className="ml-line-path predicted" />
                <path d={actualPath} className="ml-line-path actual" />
              </svg>
              <div className="ml-mock-line-labels">
                {linePoints.map((point) => <span key={point.label}>{point.label}</span>)}
              </div>
            </div>
          </section>

          <section className="widget-card ml-mock-card ml-mock-kpi">
            <header className="widget-header">
              <span className="widget-title">Precision</span>
            </header>
            <div className="ml-mock-kpi-body">
              <ShieldCheck size={18} />
              <strong>0.84</strong>
              <span>validated against last 14 days</span>
            </div>
          </section>

          <section className="widget-card ml-mock-card ml-mock-kpi">
            <header className="widget-header">
              <span className="widget-title">Revenue at Risk</span>
            </header>
            <div className="ml-mock-kpi-body">
              <Sigma size={18} />
              <strong>$184k</strong>
              <span>projected 30d churn exposure</span>
            </div>
          </section>

          <section className="widget-card ml-mock-card ml-mock-kpi">
            <header className="widget-header">
              <span className="widget-title">Reachable Profiles</span>
            </header>
            <div className="ml-mock-kpi-body">
              <Target size={18} />
              <strong>9,860</strong>
              <span>have consent + destination mapping</span>
            </div>
          </section>

          <section className="widget-card ml-mock-card ml-mock-kpi">
            <header className="widget-header">
              <span className="widget-title">Action Readiness</span>
            </header>
            <div className="ml-mock-kpi-body">
              <Waves size={18} />
              <strong>73%</strong>
              <span>eligible for Meta / SendGrid push</span>
            </div>
          </section>

          <section className="widget-card ml-mock-card ml-mock-table-card">
            <header className="widget-header">
              <span className="widget-title">Top Predicted Entities</span>
            </header>
            <div className="ml-mock-card-body">
              <table className="ml-mock-table">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Score</th>
                    <th>Segment</th>
                    <th>Source</th>
                    <th>Last activity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entityRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.score}</td>
                      <td>{row.segment}</td>
                      <td>{row.source}</td>
                      <td>{row.activity}</td>
                      <td><span className="ml-mock-status">{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
