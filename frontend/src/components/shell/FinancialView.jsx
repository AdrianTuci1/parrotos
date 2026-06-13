import { useMemo, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CreditCard,
  Megaphone,
  Plug,
  AlertTriangle,
  ShoppingCart,
  Wallet,
  ChevronRight,
  RefreshCw,
  ChevronDown
} from "lucide-react";
import { analyticsViews } from "@/components/app-shared";
import { useAppStore } from "@/stores/useAppStore";
import { useGeneratedViewData } from "@/components/shell/useGeneratedViewData";
import "@/styles/financial.css";

// --- Mock Data ---
const metricsData = {
  repeatPurchase: { value: "38.4%", trend: "+2.7%", isPositive: true, label: "Repeat purchase rate" },
  orders: { value: "1,842", trend: "+4.1%", isPositive: true, label: "Orders" },
  aov: { value: "$154.60", trend: "-1.3%", isPositive: false, label: "Average order value" }
};

const mrrChartData = {
  value: "$92K",
  label: "Monthly recurring revenue",
  trend: "↑ 27.4% over last 30 days",
  points: [
    { x: 0, val: 74 },
    { x: 1, val: 75 },
    { x: 2, val: 72 },
    { x: 3, val: 77 },
    { x: 4, val: 79 },
    { x: 5, val: 78 },
    { x: 6, val: 80 },
    { x: 7, val: 81 },
    { x: 8, val: 85 },
    { x: 9, val: 80 },
    { x: 10, val: 84 },
    { x: 11, val: 86 },
    { x: 12, val: 92 }
  ],
  yLabels: ["100k", "80k", "60k", "40k", "20k", "0"],
  xLabels: ["Apr 11", "Apr 16", "Apr 22", "Apr 28", "May 4", "May 10"]
};

const activeCustomersData = {
  value: "2,540",
  percentage: "78%",
  label: "Active customers"
};

const budgetUsageData = {
  value: "$50,734",
  segments: [
    { label: "50%", percentWidth: 50, status: "unused" },
    { label: "25%", percentWidth: 25, status: "used" },
    { label: "25%", percentWidth: 25, status: "reserved" }
  ]
};

const ordersBarChartData = {
  value: "1,842",
  label: "Orders in the last 30 days",
  peak: "Peak 82 on May 10",
  trend: "↑ 9.8% over last 30 days",
  bars: [
    45, 52, 49, 42, 38, 48, 55, 62, 58, 45, 50, 48, 55, 52, 59, 57, 54, 58, 62, 60, 68, 72, 70, 75, 71, 78, 82, 65, 62, 58
  ], // 30 values, peak is 82 at index 26 (May 10)
  yLabels: ["100", "75", "50", "25", "0"],
  xLabels: [
    { label: "Apr 14", index: 0 },
    { label: "Apr 19", index: 5 },
    { label: "Apr 24", index: 10 },
    { label: "Apr 29", index: 15 },
    { label: "May 4", index: 20 },
    { label: "May 9", index: 25 }
  ]
};

const orderDates = [
  "Apr 14", "Apr 15", "Apr 16", "Apr 17", "Apr 18", "Apr 19", "Apr 20", "Apr 21", "Apr 22", "Apr 23",
  "Apr 24", "Apr 25", "Apr 26", "Apr 27", "Apr 28", "Apr 29", "Apr 30", "May 1", "May 2", "May 3",
  "May 4", "May 5", "May 6", "May 7", "May 8", "May 9", "May 10", "May 11", "May 12", "May 13"
];

const needsAttentionData = [
  { id: 1, label: "Retry failed payments", count: 3, icon: CreditCard },
  { id: 2, label: "Draft campaigns", count: 5, icon: Megaphone },
  { id: 3, label: "Webhook delivery errors", count: 1, icon: Plug },
  { id: 4, label: "Low inventory SKUs", count: 2, icon: AlertTriangle },
  { id: 5, label: "Unfulfilled orders", count: 12, icon: ShoppingCart }
];

function pickRecordField(record, matchers, fallbackIndex = 0) {
  if (!record || typeof record !== "object") return undefined;
  const entries = Object.entries(record);
  for (const [key, value] of entries) {
    if (matchers.some((matcher) => matcher.test(key))) {
      return value;
    }
  }
  return entries[fallbackIndex]?.[1];
}

function formatCurrencyValue(value) {
  const normalized = typeof value === "string" ? Number(value.replace(/[^0-9.-]/g, "")) : Number(value || 0);
  return `$${normalized.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateValue(value) {
  if (!value) return "June 15, 2026";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function attentionIconForLabel(label) {
  const value = String(label || "").toLowerCase();
  if (value.includes("payment") || value.includes("invoice")) return CreditCard;
  if (value.includes("campaign") || value.includes("ad")) return Megaphone;
  if (value.includes("webhook") || value.includes("integration")) return Plug;
  if (value.includes("inventory") || value.includes("stock")) return AlertTriangle;
  if (value.includes("order") || value.includes("shipment")) return ShoppingCart;
  return AlertTriangle;
}

// --- Custom Gauge Generator ---
function TotalRevenueGauge({ title = "Total Revenue", value }) {
  const startAngle = -215;
  const endAngle = 35;
  const totalDashes = 46;
  const fillPercent = 0.72; // matching the visual gauge fill

  const dashes = [];
  for (let i = 0; i < totalDashes; i++) {
    const ratio = i / (totalDashes - 1);
    const angleDeg = startAngle + ratio * (endAngle - startAngle);
    const angleRad = (angleDeg * Math.PI) / 180;

    const isActive = ratio <= fillPercent;
    const r1 = 82;
    const r2 = 94;
    const x1 = 120 + r1 * Math.cos(angleRad);
    const y1 = 110 + r1 * Math.sin(angleRad);
    const x2 = 120 + r2 * Math.cos(angleRad);
    const y2 = 110 + r2 * Math.sin(angleRad);

    dashes.push({
      x1,
      y1,
      x2,
      y2,
      color: isActive ? "#A8C7FA" : "#25282C"
    });
  }

  return (
    <div className="financial-card financial-revenue-gauge-card">
      <div className="financial-revenue-gauge-container">
        <svg width="240" height="190" viewBox="0 0 240 190" className="mx-auto">
          {dashes.map((dash, i) => (
            <line
              key={i}
              x1={dash.x1}
              y1={dash.y1}
              x2={dash.x2}
              y2={dash.y2}
              stroke={dash.color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="financial-revenue-gauge-center">
          <div className="financial-revenue-gauge-icon-circle">
            <Wallet size={16} />
          </div>
          <span className="financial-revenue-gauge-center-label">{title}</span>
          <span className="financial-revenue-gauge-center-value">{value}</span>
        </div>
      </div>

      <div className="financial-revenue-gauge-legend">
        <div className="financial-revenue-legend-item">
          <span className="financial-revenue-legend-dot bg-subscriptions" />
          <span>Subscriptions</span>
        </div>
        <div className="financial-revenue-legend-item">
          <span className="financial-revenue-legend-dot bg-usage" />
          <span>Usage & services</span>
        </div>
      </div>

      <button className="financial-capsule-action-btn" type="button">
        <span>View Detail</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

export function FinancialView() {
  const { activeAnalyticsView, setActiveAnalyticsView, timeRange, setTimeRange } = useAppStore();
  const { widgetMap, widgetDataMap } = useGeneratedViewData("financial");
  const financialTimeRange = ["24h", "7d", "30d", "90d"].includes(timeRange) ? timeRange : "30d";

  const resolvedMetricsData = {
    repeatPurchase: {
      ...metricsData.repeatPurchase,
      label: widgetMap.get("repeat-purchase-rate")?.title || metricsData.repeatPurchase.label,
      value: widgetDataMap["repeat-purchase-rate"]?.value !== undefined
        ? `${Number(widgetDataMap["repeat-purchase-rate"].value).toFixed(1)}%`
        : metricsData.repeatPurchase.value,
      trend: widgetDataMap["repeat-purchase-rate"]?.trend || metricsData.repeatPurchase.trend,
    },
    orders: {
      ...metricsData.orders,
      label: widgetMap.get("orders")?.title || metricsData.orders.label,
      value: widgetDataMap["orders"]?.value !== undefined
        ? Number(widgetDataMap["orders"].value).toLocaleString("en-US")
        : metricsData.orders.value,
      trend: widgetDataMap["orders"]?.trend || metricsData.orders.trend,
    },
    aov: {
      ...metricsData.aov,
      label: widgetMap.get("aov")?.title || metricsData.aov.label,
      value: widgetDataMap["aov"]?.value !== undefined
        ? `$${Number(widgetDataMap["aov"].value).toFixed(2)}`
        : metricsData.aov.value,
      trend: widgetDataMap["aov"]?.trend || metricsData.aov.trend,
    },
  };

  const mrrItems = widgetDataMap["mrr-overview"]?.items || [];
  const resolvedMrrChartData = {
    ...mrrChartData,
    value: mrrItems.length
      ? `$${Math.round((Number(mrrItems[mrrItems.length - 1]?.value) || 0) / 1000)}K`
      : mrrChartData.value,
    label: widgetMap.get("mrr-overview")?.title || mrrChartData.label,
    trend: mrrItems.length
      ? (() => {
        const firstValue = Number(mrrItems[0]?.value) || 0;
        const lastValue = Number(mrrItems[mrrItems.length - 1]?.value) || 0;
        const trend = firstValue === 0 ? (lastValue === 0 ? 0 : 100) : ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
        return `${trend >= 0 ? "↑" : "↓"} ${Math.abs(trend).toFixed(1)}% over selected range`;
      })()
      : mrrChartData.trend,
    points: mrrItems.length
      ? Array.from({ length: 13 }).map((_, index) => {
        const item = mrrItems[index];
        const fallbackPoint = mrrChartData.points[index] || mrrChartData.points[mrrChartData.points.length - 1];
        return item
          ? { x: index, val: Math.max(1, Math.round((Number(item.value) || 0) / 1000)) }
          : fallbackPoint;
      })
      : mrrChartData.points,
    pointLabels: mrrItems.length
      ? Array.from({ length: 13 }).map((_, index) => mrrItems[index]?.label || mrrChartData.xLabels[Math.min(index, mrrChartData.xLabels.length - 1)])
      : mrrChartData.xLabels,
  };

  const resolvedBudgetUsageData = (() => {
    const items = widgetDataMap["budget-usage"]?.items || [];
    if (!items.length) return budgetUsageData;
    const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0) || 1;
    const labels = ["unused", "used", "reserved"];
    return {
      value: `$${Math.round(total).toLocaleString("en-US")}`,
      segments: items.slice(0, 3).map((item, index) => ({
        label: `${Math.round(((Number(item.value) || 0) / total) * 100)}%`,
        percentWidth: Math.round(((Number(item.value) || 0) / total) * 100),
        status: labels[index] || "used",
      })),
    };
  })();

  const resolvedTotalRevenueValue = widgetDataMap["total-revenue"]?.value !== undefined
    ? `$${Number(widgetDataMap["total-revenue"].value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "$284,920.00";

  const resolvedActiveCustomersData = {
    ...activeCustomersData,
    label: widgetMap.get("active-customers")?.title || activeCustomersData.label,
    value: widgetDataMap["active-customers"]?.value !== undefined
      ? Number(widgetDataMap["active-customers"].value).toLocaleString("en-US")
      : activeCustomersData.value,
    percentage: widgetDataMap["active-customers"]?.value !== undefined
      ? `${Math.min(99, Math.max(1, Math.round((Number(widgetDataMap["active-customers"].value) / 3250) * 100)))}%`
      : activeCustomersData.percentage,
  };

  const resolvedOrdersBarChartData = useMemo(() => {
    const items = widgetDataMap["orders-timeseries"]?.items || [];
    if (!items.length) return ordersBarChartData;

    const bars = items.map((item) => Number(item.value) || 0);
    const labels = items.map((item) => item.label || "");
    const peakValue = Math.max(...bars, 0);
    const peakIndex = bars.findIndex((value) => value === peakValue);
    const firstValue = bars[0] || 0;
    const lastValue = bars[bars.length - 1] || 0;
    const trend = firstValue === 0 ? (lastValue === 0 ? 0 : 100) : ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
    const tickIndexes = Array.from({ length: Math.min(6, labels.length) }).map((_, index) => (
      Math.min(labels.length - 1, Math.round((index / Math.max(Math.min(6, labels.length) - 1, 1)) * (labels.length - 1)))
    ));

    return {
      value: Number(widgetDataMap["orders"]?.value || bars.reduce((sum, value) => sum + value, 0)).toLocaleString("en-US"),
      label: widgetMap.get("orders-timeseries")?.title || "Orders in selected range",
      peak: `Peak ${peakValue} on ${labels[peakIndex] || "latest period"}`,
      trend: `${trend >= 0 ? "↑" : "↓"} ${Math.abs(trend).toFixed(1)}% over selected range`,
      bars,
      yLabels: Array.from({ length: 5 }).map((_, index) => String(Math.round((Math.max(peakValue, 1) * (4 - index)) / 4))),
      xLabels: tickIndexes.map((index) => ({
        label: labels[index],
        index,
      })),
      dates: labels,
    };
  }, [widgetDataMap, widgetMap]);

  const resolvedTaxEstimate = useMemo(() => {
    const rows = widgetDataMap["tax-estimate"]?.rows || [];
    if (!rows.length) {
      return {
        title: widgetMap.get("tax-estimate")?.title || "Corporate Tax Estimate",
        dueDate: "June 15, 2026",
        amount: "$18,450.00",
        paymentMethod: "ACH Auto-Pay (SVB)",
        status: "Scheduled",
      };
    }

    const primaryRow = rows[0];
    return {
      title: widgetMap.get("tax-estimate")?.title || "Corporate Tax Estimate",
      dueDate: formatDateValue(pickRecordField(primaryRow, [/due/i, /date/i], 0)),
      amount: formatCurrencyValue(pickRecordField(primaryRow, [/amount/i, /tax/i, /payment/i], 1)),
      paymentMethod: String(pickRecordField(primaryRow, [/method/i, /account/i, /bank/i, /source/i], 2) || "Auto-pay"),
      status: String(pickRecordField(primaryRow, [/status/i, /state/i], 3) || "Scheduled"),
    };
  }, [widgetDataMap, widgetMap]);

  const resolvedNeedsAttentionData = useMemo(() => {
    const rows = widgetDataMap["needs-attention"]?.rows || [];
    if (!rows.length) return needsAttentionData;
    return rows.slice(0, 5).map((row, index) => {
      const label = String(pickRecordField(row, [/label/i, /name/i, /title/i, /issue/i, /alert/i, /type/i], 0) || `Action item ${index + 1}`);
      return {
        id: index + 1,
        label,
        count: Math.max(0, Number(pickRecordField(row, [/count/i, /value/i, /total/i, /errors?/i, /issues?/i], 1)) || 0),
        icon: attentionIconForLabel(label),
      };
    });
  }, [widgetDataMap]);

  const resolvedAiInsightText = widgetDataMap["financial-ai-insight"]?.text || "Unused budget runway improved by 3.5% this month vs. trailing burn.";

  // States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mrrHoverIdx, setMrrHoverIdx] = useState(null);
  const [ordersHoverIdx, setOrdersHoverIdx] = useState(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // --- MRR Chart Sizing & Vector Points ---
  const mrrW = 600;
  const mrrH = 200;
  const mrrPadL = 50;
  const mrrPadR = 20;
  const mrrPadT = 15;
  const mrrPadB = 25;
  const mrrDrawW = mrrW - mrrPadL - mrrPadR;
  const mrrDrawH = mrrH - mrrPadT - mrrPadB;

  const mrrPoints = resolvedMrrChartData.points.map((p) => {
    const x = mrrPadL + (p.x / 12) * mrrDrawW;
    const y = mrrPadT + (1 - (p.val / 100)) * mrrDrawH;
    return { x, y };
  });

  // Smooth Bezier Curve Path
  let mrrLinePath = "";
  if (mrrPoints.length > 0) {
    mrrLinePath = `M ${mrrPoints[0].x} ${mrrPoints[0].y}`;
    for (let i = 0; i < mrrPoints.length - 1; i++) {
      const p0 = mrrPoints[i];
      const p1 = mrrPoints[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      mrrLinePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const mrrAreaPath = mrrPoints.length > 0
    ? `${mrrLinePath} L ${mrrPoints[mrrPoints.length - 1].x} ${mrrPadT + mrrDrawH} L ${mrrPoints[0].x} ${mrrPadT + mrrDrawH} Z`
    : "";

  // Mouse move handler for MRR hover
  const handleMrrMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = clientX / rect.width;
    const idx = Math.round(ratio * 12);
    if (idx >= 0 && idx <= 12) {
      setMrrHoverIdx(idx);
    }
  };

  // --- Orders Bar Chart Sizing ---
  const ordW = 600;
  const ordH = 200;
  const ordPadL = 40;
  const ordPadR = 20;
  const ordPadT = 25;
  const ordPadB = 25;
  const ordDrawW = ordW - ordPadL - ordPadR;
  const ordDrawH = ordH - ordPadT - ordPadB;

  const barCount = resolvedOrdersBarChartData.bars.length;
  const barGap = 4;
  const totalGapsW = (barCount - 1) * barGap;
  const barW = (ordDrawW - totalGapsW) / barCount;
  const peakIndex = resolvedOrdersBarChartData.bars.findIndex((value) => value === Math.max(...resolvedOrdersBarChartData.bars, 0));
  const maxOrderValue = Math.max(...resolvedOrdersBarChartData.bars, 1);

  const bars = resolvedOrdersBarChartData.bars.map((val, idx) => {
    const x = ordPadL + idx * (barW + barGap);
    const height = (val / maxOrderValue) * ordDrawH;
    const y = ordPadT + ordDrawH - height;
    return { x, y, w: barW, h: height, val, isPeak: idx === peakIndex };
  });

  return (
    <div className="financial-dashboard">
      {/* Dashboard Header Selector */}
      <div className="dashboard-layout-header flat-header">
        <div className="dashboard-menu-tabs">
          {analyticsViews.map((tab) => {
            const isSelected = activeAnalyticsView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAnalyticsView(tab.id)}
                className={`dashboard-menu-tab-btn ${isSelected ? "active" : "inactive"}`}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="dashboard-header-controls">
          <div className="dashboard-time-select-wrapper">
            <select
              value={financialTimeRange}
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
          <button
            className={`dashboard-refresh-btn ${isRefreshing ? "animate-spin" : ""}`}
            type="button"
            aria-label="Refresh financial dashboard"
            onClick={handleRefresh}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="financial-dashboard-body">
        {/* Left Wide Column */}
        <div className="financial-left-column">
          {/* Row 1: KPI Metrics Card */}
          <div className="financial-metrics-card">
            {/* Metric 1 */}
            <div className="financial-metric-col">
              <span className="financial-metric-label">{resolvedMetricsData.repeatPurchase.label}</span>
              <span className="financial-metric-value">{resolvedMetricsData.repeatPurchase.value}</span>
              <span className="financial-metric-trend trend-up">
                <TrendingUp size={12} />
                {resolvedMetricsData.repeatPurchase.trend} <span style={{ color: "#8E918F", fontWeight: 400 }}>vs prior 30 days</span>
              </span>
            </div>
            {/* Metric 2 */}
            <div className="financial-metric-col">
              <span className="financial-metric-label">{resolvedMetricsData.orders.label}</span>
              <span className="financial-metric-value">{resolvedMetricsData.orders.value}</span>
              <span className="financial-metric-trend trend-up">
                <TrendingUp size={12} />
                {resolvedMetricsData.orders.trend} <span style={{ color: "#8E918F", fontWeight: 400 }}>vs prior 30 days</span>
              </span>
            </div>
            {/* Metric 3 */}
            <div className="financial-metric-col">
              <span className="financial-metric-label">{resolvedMetricsData.aov.label}</span>
              <span className="financial-metric-value">{resolvedMetricsData.aov.value}</span>
              <span className="financial-metric-trend trend-down">
                <TrendingDown size={12} />
                {resolvedMetricsData.aov.trend} <span style={{ color: "#8E918F", fontWeight: 400 }}>vs prior 30 days</span>
              </span>
            </div>
          </div>

          {/* Row 2: MRR Chart Card */}
          <div className="financial-card financial-mrr-card" style={{ position: "relative" }}>
            <div className="financial-mrr-header-block">
              <div className="financial-mrr-title-area">
                <span className="financial-mrr-value">
                  {mrrHoverIdx !== null ? `$${resolvedMrrChartData.points[mrrHoverIdx].val}K` : resolvedMrrChartData.value}
                </span>
                <span className="financial-mrr-label">
                  {mrrHoverIdx !== null ? `Monthly Recurring Revenue (${resolvedMrrChartData.pointLabels[mrrHoverIdx]})` : resolvedMrrChartData.label}
                </span>
              </div>
              <span className="financial-mrr-trend trend-up">
                <TrendingUp size={13} />
                {resolvedMrrChartData.trend}
              </span>
            </div>

            <div className="financial-mrr-chart-container" style={{ position: "relative" }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${mrrW} ${mrrH}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mrr-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.08)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.00)" />
                  </linearGradient>
                </defs>

                {/* Y-axis grid lines */}
                {mrrChartData.yLabels.map((lbl, idx) => {
                  const y = mrrPadT + (idx / 5) * mrrDrawH;
                  return (
                    <g key={idx}>
                      <line
                        x1={mrrPadL}
                        y1={y}
                        x2={mrrW - mrrPadR}
                        y2={y}
                        stroke="#25282C"
                        strokeWidth="0.75"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={mrrPadL - 8}
                        y={y + 4}
                        fill="#8E918F"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {lbl}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill */}
                <path d={mrrAreaPath} fill="url(#mrr-area-gradient)" pointerEvents="none" />

                {/* Main Line */}
                <path
                  d={mrrLinePath}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />

                {/* Hover line and details */}
                {mrrHoverIdx !== null && (
                  <g pointerEvents="none">
                    <line
                      x1={mrrPoints[mrrHoverIdx].x}
                      y1={mrrPadT}
                      x2={mrrPoints[mrrHoverIdx].x}
                      y2={mrrPadT + mrrDrawH}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <circle
                      cx={mrrPoints[mrrHoverIdx].x}
                      cy={mrrPoints[mrrHoverIdx].y}
                      r="5"
                      fill="#A8C7FA"
                    />
                    <circle
                      cx={mrrPoints[mrrHoverIdx].x}
                      cy={mrrPoints[mrrHoverIdx].y}
                      r="2"
                      fill="#FFFFFF"
                    />
                  </g>
                )}

                {/* X-axis labels */}
                {resolvedMrrChartData.pointLabels.filter((_, index) => index % 2 === 0).map((lbl, idx, labels) => {
                  const ratio = labels.length > 1 ? idx / (labels.length - 1) : 0;
                  const x = mrrPadL + ratio * mrrDrawW;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={mrrH - 8}
                      fill="#8E918F"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {lbl}
                    </text>
                  );
                })}

                {/* Hover Capture Overlay Rect */}
                <rect
                  x={mrrPadL}
                  y={mrrPadT}
                  width={mrrDrawW}
                  height={mrrDrawH}
                  fill="transparent"
                  onMouseMove={handleMrrMouseMove}
                  onMouseLeave={() => setMrrHoverIdx(null)}
                  style={{ cursor: "crosshair" }}
                />
              </svg>

              {/* Tooltip Overlay */}
              {mrrHoverIdx !== null && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(mrrPoints[mrrHoverIdx].x / mrrW) * 100}%`,
                    top: `${(mrrPoints[mrrHoverIdx].y / mrrH) * 100 - 20}%`,
                    transform: "translate(-50%, -100%)",
                    backgroundColor: "#1C1D1F",
                    border: "1px solid #25282C",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    pointerEvents: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px"
                  }}
                >
                  <span style={{ fontSize: "10px", color: "#8E918F", fontWeight: 500 }}>
                    {resolvedMrrChartData.pointLabels[mrrHoverIdx]}
                  </span>
                  <span style={{ fontSize: "12px", color: "#FFFFFF", fontWeight: 700 }}>
                    ${resolvedMrrChartData.points[mrrHoverIdx].val}K
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: AI Insights & Budget Usage Row */}
          <div className="financial-middle-row">
            {/* AI Insights Card */}
            <div className="financial-card financial-ai-insights-card">
              <header className="financial-card-header">
                <div className="financial-card-title-wrap">
                  <Sparkles size={14} className="financial-card-title-icon" />
                  <span className="financial-card-title">{widgetMap.get("financial-ai-insight")?.title || "AI Insights"}</span>
                </div>
                <button className="financial-card-action-btn" type="button">
                  <MessageSquare size={13} />
                  <span>Ask AI</span>
                </button>
              </header>
              <div className="financial-ai-insights-body">
                <p className="financial-ai-insights-text">
                  {resolvedAiInsightText}
                </p>
              </div>
            </div>

            {/* Budget Usage Card */}
            <div className="financial-card financial-budget-card">
              <header className="financial-card-header">
                <div className="financial-card-title-wrap">
                  <span className="financial-card-title">{widgetMap.get("budget-usage")?.title || "Budget Usage"}</span>
                </div>
                <button className="financial-card-action-btn" type="button">
                  <Layers size={13} />
                  <span>Manage Budget</span>
                </button>
              </header>
              <span className="financial-budget-value">{resolvedBudgetUsageData.value}</span>
              <div className="financial-budget-bar-section">
                <div className="financial-budget-bar-row">
                  {resolvedBudgetUsageData.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="financial-budget-bar-col"
                      style={{ width: `${seg.percentWidth}%` }}
                    >
                      <span className="financial-budget-bar-label">{seg.label}</span>
                      <div className={`financial-budget-bar-fill bg-${seg.status}`} />
                    </div>
                  ))}
                </div>
                <div className="financial-budget-legend">
                  <div className="financial-budget-legend-item">
                    <span className="legend-dot legend-unused" />
                    <span>Unused</span>
                  </div>
                  <div className="financial-budget-legend-item">
                    <span className="legend-dot legend-used" />
                    <span>Used</span>
                  </div>
                  <div className="financial-budget-legend-item">
                    <span className="legend-dot legend-reserved" />
                    <span>Reserved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Orders Bar Chart Card */}
          <div className="financial-card financial-orders-card" style={{ position: "relative" }}>
            <div className="financial-orders-header-block">
              <div className="financial-orders-title-area">
                <span className="financial-orders-value">
                  {ordersHoverIdx !== null ? resolvedOrdersBarChartData.bars[ordersHoverIdx] : resolvedOrdersBarChartData.value}
                </span>
                <span className="financial-orders-label">
                  {ordersHoverIdx !== null ? `Orders on ${resolvedOrdersBarChartData.dates?.[ordersHoverIdx] || orderDates[ordersHoverIdx]}` : resolvedOrdersBarChartData.label}
                </span>
              </div>
              <div className="financial-orders-stats-area">
                <span className="financial-orders-peak">
                  {resolvedOrdersBarChartData.peak}
                </span>
                <span className="financial-orders-trend">
                  <TrendingUp size={13} />
                  {resolvedOrdersBarChartData.trend}
                </span>
              </div>
            </div>

            <div className="financial-orders-chart-container" style={{ position: "relative" }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${ordW} ${ordH}`} preserveAspectRatio="none">
                {/* Y-axis grid lines */}
                {resolvedOrdersBarChartData.yLabels.map((lbl, idx) => {
                  const y = ordPadT + (idx / 4) * ordDrawH;
                  return (
                    <g key={idx}>
                      <line
                        x1={ordPadL}
                        y1={y}
                        x2={ordW - ordPadR}
                        y2={y}
                        stroke="#25282C"
                        strokeWidth="0.75"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={ordPadL - 8}
                        y={y + 4}
                        fill="#8E918F"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {lbl}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {bars.map((bar, idx) => {
                  const isHovered = idx === ordersHoverIdx;
                  // If nothing is hovered, highlight the peak (May 10 / index 26).
                  // If something is hovered, highlight only the hovered one.
                  const isHighlighted = ordersHoverIdx !== null ? isHovered : bar.isPeak;

                  return (
                    <g key={idx}>
                      {/* Render peak label dynamically only if not hovered by another label */}
                      {bar.isPeak && ordersHoverIdx === null && (
                        <text
                          x={bar.x + bar.w / 2}
                          y={bar.y - 6}
                          fill="#FFFFFF"
                          fontSize="9"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {resolvedOrdersBarChartData.dates?.[idx] || "Peak"}
                        </text>
                      )}
                      <rect
                        x={bar.x}
                        y={bar.y}
                        width={bar.w}
                        height={bar.h}
                        fill={isHighlighted ? "#FFFFFF" : "rgba(228, 228, 231, 0.16)"}
                        rx="1"
                        ry="1"
                        style={{ transition: "fill 0.15s ease" }}
                      />
                      {/* Transparent Hover-Capture Overlay Column for easier mouse targeting */}
                      <rect
                        x={bar.x - barGap / 2}
                        y={ordPadT}
                        width={bar.w + barGap}
                        height={ordDrawH}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setOrdersHoverIdx(idx)}
                        onMouseLeave={() => setOrdersHoverIdx(null)}
                      />
                    </g>
                  );
                })}

                {/* X-axis labels */}
                {resolvedOrdersBarChartData.xLabels.map((item, idx) => {
                  const targetBar = bars[item.index];
                  if (!targetBar) return null;
                  return (
                    <text
                      key={idx}
                      x={targetBar.x + targetBar.w / 2}
                      y={ordH - 8}
                      fill="#8E918F"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {item.label}
                    </text>
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {ordersHoverIdx !== null && (
                <div
                  style={{
                    position: "absolute",
                    left: `${((bars[ordersHoverIdx].x + bars[ordersHoverIdx].w / 2) / ordW) * 100}%`,
                    top: `${(bars[ordersHoverIdx].y / ordH) * 100 - 15}%`,
                    transform: "translate(-50%, -100%)",
                    backgroundColor: "#1C1D1F",
                    border: "1px solid #25282C",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    pointerEvents: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    whiteSpace: "nowrap"
                  }}
                >
                  <span style={{ fontSize: "10px", color: "#8E918F", fontWeight: 500 }}>
                    {resolvedOrdersBarChartData.dates?.[ordersHoverIdx] || orderDates[ordersHoverIdx]}
                  </span>
                  <span style={{ fontSize: "12px", color: "#FFFFFF", fontWeight: 700 }}>
                    {bars[ordersHoverIdx].val} orders
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Narrow Column */}
        <div className="financial-right-column">
          {/* Widget 1: Total Revenue Semicircle Gauge */}
          <TotalRevenueGauge title={widgetMap.get("total-revenue")?.title || "Total Revenue"} value={resolvedTotalRevenueValue} />

          {/* Widget 2: Active Customers Card */}
          <div className="financial-card financial-active-customers-card">
            <div className="financial-active-customers-header">
              <div>
                <div className="financial-active-customers-label">{resolvedActiveCustomersData.label}</div>
                <div className="financial-active-customers-value">{resolvedActiveCustomersData.value}</div>
              </div>
              <div className="financial-active-customers-percentage">{resolvedActiveCustomersData.percentage}</div>
            </div>

            <div className="financial-active-customers-bar-row">
              {Array.from({ length: 42 }).map((_, idx) => {
                const activeRatio = Number.parseInt(resolvedActiveCustomersData.percentage, 10) / 100;
                const isActive = idx / 41 <= activeRatio;
                return (
                  <div
                    key={idx}
                    className={`financial-active-customers-tick ${isActive ? "bg-tick-active" : "bg-tick-inactive"}`}
                  />
                );
              })}
            </div>

            <div className="financial-active-customers-legend">
              <div className="financial-active-customers-legend-item">
                <span className="legend-dot dot-paid" />
                <span>Paid</span>
              </div>
              <div className="financial-active-customers-legend-item">
                <span className="legend-dot dot-free" />
                <span>Free</span>
              </div>
            </div>
          </div>

          {/* Widget 3: Quarterly Tax Estimate (Modified from Federal Income Tax) */}
          <div className="financial-card financial-tax-card">
            <header className="financial-card-header">
              <div className="financial-card-title-wrap">
                <span className="financial-card-title">{resolvedTaxEstimate.title}</span>
              </div>
            </header>
            <div className="financial-tax-card-body">
              <div className="financial-tax-row">
                <span className="financial-tax-key">Due Date:</span>
                <span className="financial-tax-val">{resolvedTaxEstimate.dueDate}</span>
              </div>
              <div className="financial-tax-row">
                <span className="financial-tax-key">Amount:</span>
                <span className="financial-tax-val">{resolvedTaxEstimate.amount}</span>
              </div>
              <div className="financial-tax-row">
                <span className="financial-tax-key">Payment method:</span>
                <span className="financial-tax-val">{resolvedTaxEstimate.paymentMethod}</span>
              </div>
              <div className="financial-tax-row">
                <span className="financial-tax-key">Status:</span>
                <span className="financial-tax-badge">{resolvedTaxEstimate.status}</span>
              </div>
              <div className="financial-tax-action-row">
                <button className="financial-capsule-action-btn" type="button">
                  <span>View Details</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Widget 4: Needs Attention Card */}
          <div className="financial-card financial-needs-attention-card">
            <header className="financial-card-header">
              <div className="financial-card-title-wrap">
                <span className="financial-card-title">{widgetMap.get("needs-attention")?.title || "Needs attention"}</span>
              </div>
            </header>
            <div className="financial-needs-attention-list">
              {resolvedNeedsAttentionData.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="financial-needs-attention-item">
                    <div className="financial-needs-attention-left">
                      <Icon size={16} className="financial-needs-attention-icon" />
                      <span className="financial-needs-attention-text">{item.label}</span>
                    </div>
                    <div className="financial-needs-attention-right">
                      <span className="financial-needs-attention-badge">{item.count}</span>
                      <ChevronRight size={14} className="financial-needs-attention-chevron" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
