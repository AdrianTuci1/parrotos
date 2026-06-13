import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Clock3, Maximize2, RefreshCw } from "lucide-react";
import { analyticsViews } from "@/components/app-shared";
import { useAppStore } from "@/stores/useAppStore";
import { useGeneratedViewData } from "@/components/shell/useGeneratedViewData";
import "@/styles/dashboard.css";

const summaryMetrics = [
  {
    label: "Active Campaigns",
    value: 12,
    trend: 8.4,
    note: "2 launched this morning",
  },
  {
    label: "Posts Published",
    value: 48,
    trend: 17.1,
    note: "Scheduled across 6 channels",
  },
  {
    label: "Total Reach",
    value: 284300,
    trend: 12.9,
    note: "Paid and organic combined",
    compact: true,
  },
  {
    label: "Avg. Engagement",
    value: 6.4,
    trend: 10.3,
    note: "Based on clicks, saves and shares",
    suffix: "%",
  },
];

const revenuePoints = [
  { label: "19:00", yesterday: 3.6, today: 4.2 },
  { label: "21:00", yesterday: 5.8, today: 6.55 },
  { label: "23:00", yesterday: 4.1, today: 4.7 },
  { label: "01:00", yesterday: 5.1, today: 5.6 },
  { label: "03:00", yesterday: 3.8, today: 4.1 },
  { label: "05:00", yesterday: 4.9, today: 5.7 },
  { label: "07:00", yesterday: 6.4, today: 6.9 },
  { label: "09:00", yesterday: 5.7, today: 6.2 },
  { label: "11:00", yesterday: 7.2, today: 8.1 },
  { label: "13:00", yesterday: 5.3, today: 5.8 },
  { label: "15:00", yesterday: 5.9, today: 6.3 },
  { label: "17:00", yesterday: 6.6, today: 7.1 },
];

const peakHoursBars = [0.7, 0.5, 0.4, 0.3, 0.4, 0.7, 1.4, 2.7, 4.1, 5.3, 6.1, 6.8, 7.4, 7.0, 6.5, 6.2, 5.7, 5.1, 6.0, 6.4, 5.8, 4.5, 3.1, 1.7];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMetricValue(metric) {
  if (metric.suffix) {
    return `${metric.value.toFixed(1)}${metric.suffix}`;
  }

  if (metric.compact) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(metric.value);
  }

  return metric.value.toLocaleString("en-US");
}

function MarketingMetricCard({ metric }) {
  return (
    <article className="widget-card marketing-metric-card">
      <div className="widget-header marketing-standard-header">
        <span className="widget-title">{metric.label}</span>
      </div>
      <div className="widget-content-body marketing-metric-body">
        <div className="marketing-metric-topline">
        <span className="marketing-metric-trend">
          <ArrowUpRight size={13} />
          {metric.trend.toFixed(1)}%
        </span>
        </div>
        <div className="marketing-metric-value">{formatMetricValue(metric)}</div>
        <p className="marketing-metric-note">{metric.note}</p>
      </div>
    </article>
  );
}

function MarketingPanelShell({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`widget-card marketing-panel-shell ${className}`}>
      <header className="widget-header marketing-standard-header marketing-panel-header">
        <div className="marketing-panel-title-wrap">
          <Icon size={14} className="marketing-panel-icon" />
          <span className="widget-title marketing-panel-title">{title}</span>
        </div>
        <button className="marketing-panel-action" type="button" aria-label={`Expand ${title}`}>
          <Maximize2 size={14} />
        </button>
      </header>
      <div className="widget-content-body marketing-panel-body">{children}</div>
    </section>
  );
}

function RevenueChart({ pointsData = revenuePoints, totals = { today: 243.65, yesterday: 208.19, growth: 17.0 } }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const max = Math.max(...pointsData.map((point) => point.today + point.yesterday));
  const highlightIndex = hoveredIndex ?? 1;
  const highlightPoint = pointsData[highlightIndex];
  const tooltipOffset = ((highlightIndex + 0.5) / pointsData.length) * 100;

  return (
    <div className="marketing-revenue-card">
      <div className="marketing-revenue-summary">
        <div className="marketing-revenue-summary-group">
          <div className="marketing-revenue-legend">
            <span className="marketing-revenue-dot today" />
            Today
          </div>
          <div className="marketing-revenue-amount">{formatCurrency(totals.today)}</div>
        </div>

        <div className="marketing-revenue-summary-group">
          <div className="marketing-revenue-legend">
            <span className="marketing-revenue-dot yesterday" />
            Yesterday
          </div>
          <div className="marketing-revenue-amount">{formatCurrency(totals.yesterday)}</div>
        </div>

        <div className="marketing-revenue-growth">
          <span className="marketing-revenue-growth-pill">
            <ArrowUpRight size={12} />
          </span>
          {totals.growth.toFixed(1)}%
        </div>
      </div>

      <div className="marketing-revenue-chart">
        {hoveredIndex !== null ? (
          <div className="marketing-revenue-tooltip" style={{ left: `${tooltipOffset}%` }}>
            <div className="marketing-revenue-tooltip-head">
              <div className="marketing-revenue-tooltip-time">
                <Clock3 size={13} />
                {highlightPoint.label}
              </div>
              <div className="marketing-revenue-tooltip-delta">
                <ArrowUpRight size={13} />
                +${(highlightPoint.today - highlightPoint.yesterday).toFixed(2)}
              </div>
            </div>
            <div className="marketing-revenue-tooltip-row">
              <div className="marketing-revenue-tooltip-label">
                <span className="marketing-revenue-dot yesterday" />
                Yesterday
              </div>
              <span>{formatCurrency(highlightPoint.yesterday)}</span>
            </div>
            <div className="marketing-revenue-tooltip-row">
              <div className="marketing-revenue-tooltip-label">
                <span className="marketing-revenue-dot today" />
                Today
              </div>
              <span>{formatCurrency(highlightPoint.today)}</span>
            </div>
          </div>
        ) : null}

        <div
          className="marketing-revenue-bars-grid"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {pointsData.map((point, index) => (
            <button
              key={point.label}
              type="button"
              className={`marketing-revenue-slot ${highlightIndex === index ? "is-active" : ""}`}
              onMouseEnter={() => setHoveredIndex(index)}
              aria-label={`${point.label}: Today ${formatCurrency(point.today)}, Yesterday ${formatCurrency(point.yesterday)}`}
            >
              <div className="marketing-revenue-gridline" />
              <div
                className="marketing-revenue-bar-stack"
                style={{ height: `${((point.today + point.yesterday) / max) * 100}%` }}
              >
                <div
                  className="marketing-revenue-bar yesterday"
                  style={{
                    height: `${(point.yesterday / (point.today + point.yesterday)) * 100}%`,
                  }}
                />
                <div
                  className="marketing-revenue-bar today"
                  style={{
                    height: `${(point.today / (point.today + point.yesterday)) * 100}%`,
                  }}
                />
              </div>
              <span className="marketing-revenue-label">{point.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetCard({ usedValue = 223.65, allowanceValue = 480, percentUsed = 47 }) {

  return (
    <div className="marketing-budget-card">
      <div className="marketing-budget-metrics">
        <div className="marketing-budget-metric">
          <span className="marketing-budget-label">Used today</span>
          <span className="marketing-budget-value">{formatCurrency(usedValue)}</span>
        </div>
        <div className="marketing-budget-divider" />
        <div className="marketing-budget-metric align-right">
          <span className="marketing-budget-label">Today's allowance</span>
          <span className="marketing-budget-value">{formatCurrency(allowanceValue)}</span>
        </div>
      </div>

      <div className="marketing-budget-visual">
        <div className="marketing-budget-progress" style={{ left: `${percentUsed}%` }}>
          <span className="marketing-budget-progress-value">{percentUsed}%</span>
          <span className="marketing-budget-progress-label">used</span>
        </div>
        <div className="marketing-budget-marker" style={{ left: `${percentUsed}%` }} />
        <div className="marketing-budget-track">
          <div className="marketing-budget-fill" style={{ width: `${percentUsed}%` }} />
        </div>
      </div>
    </div>
  );
}

function PeakHoursCard({ bars = peakHoursBars, title = "11 AM – 1 PM", subtitle = "~8% of orders in the busiest hour" }) {
  const max = Math.max(...bars);

  return (
    <div className="marketing-peak-card">
      <div className="marketing-peak-copy">
        <div className="marketing-peak-title">{title}</div>
        <div className="marketing-peak-subtitle">{subtitle}</div>
      </div>

      <div className="marketing-peak-chart">
        {bars.map((value, index) => (
          <div key={index} className="marketing-peak-slot">
            <div className="marketing-peak-gridline" />
            <div
              className="marketing-peak-bar"
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketingView() {
  const { activeAnalyticsView, setActiveAnalyticsView, timeRange, setTimeRange } = useAppStore();
  const { widgetMap, widgetDataMap } = useGeneratedViewData("marketing");
  const marketingTimeRange = ["24h", "7d", "30d", "90d"].includes(timeRange) ? timeRange : "24h";

  const resolvedSummaryMetrics = useMemo(() => {
    const widgetIds = ["active-campaigns-total", "posts-published", "total-reach", "avg-engagement"];
    return summaryMetrics.map((fallbackMetric, index) => {
      const widgetId = widgetIds[index];
      const widget = widgetMap.get(widgetId);
      const data = widgetDataMap[widgetId] || {};
      const rawValue = Number(data.value);
      return {
        ...fallbackMetric,
        label: widget?.title || fallbackMetric.label,
        value: Number.isFinite(rawValue) ? rawValue : fallbackMetric.value,
        trend: Number.isFinite(Number(data.trend)) ? Number(data.trend) : fallbackMetric.trend,
      };
    });
  }, [widgetDataMap, widgetMap]);

  const resolvedRevenueChart = useMemo(() => {
    const items = widgetDataMap["gross-revenue"]?.items || [];
    if (!items.length) {
      return {
        points: revenuePoints,
        totals: { today: 243.65, yesterday: 208.19, growth: 17.0 },
      };
    }

    const points = items.slice(0, 12).map((item, index) => {
      const value = Number(item.value) || 0;
      return {
        label: item.label || `T${index + 1}`,
        today: value,
        yesterday: value * 0.84,
      };
    });
    const todayTotal = points.reduce((sum, point) => sum + point.today, 0);
    const yesterdayTotal = points.reduce((sum, point) => sum + point.yesterday, 0);
    const growth = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;
    return {
      points,
      totals: { today: todayTotal, yesterday: yesterdayTotal, growth },
    };
  }, [widgetDataMap]);

  const resolvedBudget = useMemo(() => {
    const items = widgetDataMap["todays-budget"]?.items || [];
    const [used, allowance] = items;
    const usedValue = Number(used?.value) || 223.65;
    const allowanceValue = Number(allowance?.value) || 480;
    const percentUsed = allowanceValue > 0 ? Math.min(100, Math.round((usedValue / allowanceValue) * 100)) : 47;
    return { usedValue, allowanceValue, percentUsed };
  }, [widgetDataMap]);

  const resolvedPeakHours = useMemo(() => {
    const items = widgetDataMap["peak-hours"]?.items || [];
    if (!items.length) {
      return {
        bars: peakHoursBars,
        title: "11 AM – 1 PM",
        subtitle: "~8% of orders in the busiest hour",
      };
    }
    const bars = items.map((item) => Number(item.value) || 0);
    const maxValue = Math.max(...bars);
    const peakIndex = bars.findIndex((value) => value === maxValue);
    return {
      bars,
      title: items[peakIndex]?.label || "Peak hour",
      subtitle: `${Math.round((maxValue / Math.max(bars.reduce((sum, value) => sum + value, 0), 1)) * 100)}% of activity in the busiest interval`,
    };
  }, [widgetDataMap]);

  return (
    <div className="marketing-dashboard">
      <div className="dashboard-layout-header flat-header">
        <div className="dashboard-menu-tabs">
          {analyticsViews.map((tab) => {
            const isSelected = activeAnalyticsView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAnalyticsView(tab.id)}
                className={`dashboard-menu-tab-btn ${isSelected ? "active" : "inactive"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="dashboard-header-controls">
          <div className="dashboard-time-select-wrapper">
            <select
              value={marketingTimeRange}
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
          <button className="dashboard-refresh-btn" type="button" aria-label="Refresh marketing dashboard">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="marketing-dashboard-body">
        <div className="marketing-metrics-grid">
          {resolvedSummaryMetrics.map((metric) => (
            <MarketingMetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="marketing-feature-grid">
          <MarketingPanelShell title={widgetMap.get("gross-revenue")?.title || "Gross Revenue"} icon={ArrowUpRight} className="marketing-panel-revenue">
            <RevenueChart pointsData={resolvedRevenueChart.points} totals={resolvedRevenueChart.totals} />
          </MarketingPanelShell>

          <MarketingPanelShell title={widgetMap.get("todays-budget")?.title || "Today's budget"} icon={Clock3} className="marketing-panel-budget">
            <BudgetCard {...resolvedBudget} />
          </MarketingPanelShell>

          <MarketingPanelShell title={widgetMap.get("peak-hours")?.title || "Peak hours"} icon={Clock3} className="marketing-panel-peak">
            <PeakHoursCard {...resolvedPeakHours} />
          </MarketingPanelShell>
        </div>
      </div>
    </div>
  );
}
