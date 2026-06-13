import { useMemo } from "react";
import { ArrowRight, ChevronDown, Ellipsis, Layers3, ReceiptText, RefreshCw, Search, ShoppingCart, Sparkles, UserRoundPlus } from "lucide-react";
import { analyticsViews } from "@/components/app-shared";
import { useAppStore } from "@/stores/useAppStore";
import { useGeneratedViewData } from "@/components/shell/useGeneratedViewData";
import { SalesOverviewWidget } from "@/components/widgets/widgets/SalesOverviewWidget";
import { LeadSourcesWidget } from "@/components/widgets/widgets/LeadSourcesWidget";
import { CampaignRoiWidget } from "@/components/widgets/widgets/CampaignRoiWidget";
import { SalesTransactionsWidget } from "@/components/widgets/widgets/SalesTransactionsWidget";
import "@/styles/dashboard.css";

const salesOverviewData = {
  labels: [
    "Mar 30", "Mar 31", "Apr 1", "Apr 2", "Apr 3", "Apr 4", "Apr 5", "Apr 6", "Apr 7", "Apr 8",
    "Apr 9", "Apr 10", "Apr 11", "Apr 12", "Apr 13", "Apr 14", "Apr 15", "Apr 16", "Apr 17", "Apr 18",
    "Apr 19", "Apr 20", "Apr 21", "Apr 22", "Apr 23", "Apr 24", "Apr 25", "Apr 26", "Apr 27", "Apr 28", "Apr 29",
  ],
  tooltipLabels: [
    "Sun, Mar 30", "Mon, Mar 31", "Tue, Apr 1", "Wed, Apr 2", "Thu, Apr 3", "Fri, Apr 4", "Sat, Apr 5", "Sun, Apr 6", "Mon, Apr 7", "Tue, Apr 8",
    "Wed, Apr 9", "Thu, Apr 10", "Fri, Apr 11", "Sun, Apr 12", "Mon, Apr 13", "Tue, Apr 14", "Wed, Apr 15", "Thu, Apr 16", "Fri, Apr 17", "Sat, Apr 18",
    "Sun, Apr 19", "Mon, Apr 20", "Tue, Apr 21", "Wed, Apr 22", "Thu, Apr 23", "Fri, Apr 24", "Sat, Apr 25", "Sun, Apr 26", "Mon, Apr 27", "Tue, Apr 28", "Wed, Apr 29",
  ],
  axisTickIndexes: [0, 5, 10, 15, 20, 25, 30],
  metrics: {
    revenue: { label: "Revenue", value: "$622K", trend: "1.9", unit: "$", axisTicks: ["25k", "20k", "15k", "10k", "5k", "0"] },
    orders: { label: "Orders", value: "5.1K", trend: "46.2", unit: "", axisTicks: ["160", "128", "96", "64", "32", "0"] },
    aov: { label: "Avg. order value", value: "$121.00", trend: "-30.3", unit: "$", axisTicks: ["$140", "$120", "$100", "$80", "$60", "$0"] },
    conversion: { label: "Conversion rate", value: "2.93%", trend: "-21.7", unit: "%", axisTicks: ["4.0%", "3.2%", "2.4%", "1.6%", "0.8%", "0"] },
  },
  timeseries: {
    revenue: [23600, 24400, 20200, 21300, 22300, 21000, 21900, 22800, 21600, 19800, 20600, 21400, 20500, 21000, 22100, 19800, 20500, 18600, 19500, 17900, 18700, 19600, 20600, 19300, 17700, 18600, 17200, 18200, 19300, 18000, 19100],
    orders: [124, 131, 108, 114, 119, 111, 117, 123, 116, 105, 109, 113, 111, 115, 122, 109, 112, 101, 106, 98, 104, 109, 116, 112, 103, 108, 101, 106, 111, 107, 113],
    aov: [128, 135, 116, 118, 123, 119, 121, 127, 122, 111, 116, 120, 118, 121, 129, 117, 119, 108, 113, 109, 112, 118, 124, 120, 111, 116, 109, 112, 121, 117, 123],
    conversion: [3.48, 3.61, 3.04, 3.11, 3.22, 3.08, 3.17, 3.28, 3.19, 2.94, 3.01, 3.12, 3.06, 3.14, 3.29, 3.05, 3.09, 2.82, 2.91, 2.77, 2.88, 3.01, 3.15, 3.08, 2.84, 2.95, 2.81, 2.9, 3.04, 2.96, 3.08],
  },
};

const leadSourcesData = {
  totalLeads: 3521,
  sources: [
    { label: "Website", value: 1445, color: "#E5E5E5" },
    { label: "Paid Ads", value: 903, color: "#9C9CA1" },
    { label: "Emails", value: 722, color: "#75757A" },
    { label: "Referral", value: 451, color: "#4F4F53" },
  ],
};

const campaignRoiData = {
  spend: 43000,
  revenue: 212000,
  roas: 4.94,
  spendPercent: 20,
  returnPercent: 80,
  retained: 169000,
};

const newLeadsSeries = [126, 132, 98, 91, 95, 121, 129, 118, 149, 123, 102, 108, 142, 145, 130, 136, 93, 108, 144, 121, 110, 123, 111, 116, 119, 117];

const recentTransactionsData = {
  transactions: [
    { id: "#04910", customer: "Ryan Korsgaard", product: "Ergo Office Chair", status: "success", qty: 12, unitPrice: "$3,450.00", totalRevenue: "$41,400.00" },
    { id: "#04911", customer: "Madelyn Lubin", product: "Sunset Desk 02", status: "success", qty: 20, unitPrice: "$2,180.00", totalRevenue: "$43,600.00" },
    { id: "#04912", customer: "Abram Bergson", product: "Eco Bookshelf", status: "pending", qty: 22, unitPrice: "$1,750.00", totalRevenue: "$38,500.00" },
    { id: "#04913", customer: "Phillip Mango", product: "Green Leaf Desk", status: "refunded", qty: 6, unitPrice: "$3,250.00", totalRevenue: "$19,500.00" },
    { id: "#04914", customer: "Sophie Martins", product: "Flex Monitor Arm", status: "success", qty: 15, unitPrice: "$890.00", totalRevenue: "$13,350.00" },
    { id: "#04915", customer: "James Caldwell", product: "Walnut Standing Desk", status: "pending", qty: 8, unitPrice: "$4,200.00", totalRevenue: "$33,600.00" },
    { id: "#04916", customer: "Elena Vasquez", product: "Mesh Task Chair Pro", status: "success", qty: 4, unitPrice: "$520.00", totalRevenue: "$2,080.00" },
    { id: "#04917", customer: "Marcus Chen", product: "Cable Management Tray", status: "success", qty: 30, unitPrice: "$45.00", totalRevenue: "$1,350.00" },
    { id: "#04918", customer: "Noah Bartlett", product: "Standing Desk Converter", status: "success", qty: 9, unitPrice: "$1,240.00", totalRevenue: "$11,160.00" },
    { id: "#04919", customer: "Celine Moore", product: "Oak Storage Unit", status: "pending", qty: 11, unitPrice: "$980.00", totalRevenue: "$10,780.00" },
    { id: "#04920", customer: "Oliver Evans", product: "Minimal Lamp Set", status: "success", qty: 24, unitPrice: "$210.00", totalRevenue: "$5,040.00" },
    { id: "#04921", customer: "Avery Novak", product: "Curved Desk Screen", status: "refunded", qty: 5, unitPrice: "$640.00", totalRevenue: "$3,200.00" },
    { id: "#04922", customer: "Mia Fischer", product: "Acoustic Divider Panel", status: "success", qty: 16, unitPrice: "$760.00", totalRevenue: "$12,160.00" },
    { id: "#04923", customer: "Jonas Perry", product: "Executive Leather Chair", status: "pending", qty: 7, unitPrice: "$2,950.00", totalRevenue: "$20,650.00" },
    { id: "#04924", customer: "Layla Brooks", product: "Conference Table XL", status: "success", qty: 3, unitPrice: "$6,800.00", totalRevenue: "$20,400.00" },
    { id: "#04925", customer: "Theo Ramirez", product: "Dual Monitor Mount", status: "success", qty: 28, unitPrice: "$180.00", totalRevenue: "$5,040.00" },
    { id: "#04926", customer: "Nina Cole", product: "Wireless Charging Tray", status: "pending", qty: 18, unitPrice: "$145.00", totalRevenue: "$2,610.00" },
    { id: "#04927", customer: "Ethan Sullivan", product: "Cable Spine Pro", status: "success", qty: 42, unitPrice: "$92.00", totalRevenue: "$3,864.00" },
    { id: "#04928", customer: "Marta Leone", product: "Nordic Bookshelf", status: "success", qty: 6, unitPrice: "$1,540.00", totalRevenue: "$9,240.00" },
    { id: "#04929", customer: "Zoe Turner", product: "Premium Foot Rest", status: "refunded", qty: 10, unitPrice: "$130.00", totalRevenue: "$1,300.00" },
  ],
};

function SalesCardShell({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`widget-card sales-card-shell ${className}`}>
      <header className="widget-header sales-standard-header">
        <div className="sales-card-title-wrap">
          <Icon size={14} className="sales-card-title-icon" />
          <span className="widget-title sales-card-title">{title}</span>
        </div>
        {action ? (
          <button className="sales-card-action" type="button">
            <span>{action}</span>
            <ArrowRight size={14} />
          </button>
        ) : null}
      </header>
      <div className="widget-content-body sales-card-body">{children}</div>
    </section>
  );
}

function formatCurrencyValue(value) {
  const normalized = typeof value === "string" ? Number(value.replace(/[^0-9.-]/g, "")) : Number(value || 0);
  return `$${normalized.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

function normalizeTransactionStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("refund") || normalized.includes("failed")) return "refunded";
  if (normalized.includes("pending") || normalized.includes("processing")) return "pending";
  return "success";
}

function NewLeadsCard({ data }) {
  const series = data?.series?.length ? data.series : newLeadsSeries;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;

  const points = series.map((value, index) => {
    const x = (index / (series.length - 1)) * 100;
    const y = 88 - ((value - min) / range) * 48;
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `0,100 ${points} 100,100`;

  return (
    <div className="sales-new-leads-card">
      <div className="sales-new-leads-copy">
        <div className="sales-new-leads-header">
          <div>
            <div className="sales-new-leads-value">{Number(data?.total || 3381).toLocaleString("en-US")}</div>
            <div className="sales-new-leads-subtitle">{data?.subtitle || "leads in last 30 days"}</div>
          </div>
          <div className="sales-new-leads-trend">
            <Sparkles size={12} />
            {Number(data?.trend || 1.2).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="sales-new-leads-chart">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="sales-new-leads-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
            </linearGradient>
          </defs>
          <line x1="0" y1="38" x2="100" y2="38" stroke="#25282C" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1="0" y1="68" x2="100" y2="68" stroke="#25282C" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1="0" y1="98" x2="100" y2="98" stroke="#25282C" strokeWidth="0.5" strokeDasharray="3,3" />
          <polygon points={fillPoints} fill="url(#sales-new-leads-fill)" />
          <polyline
            points={points}
            fill="none"
            stroke="rgba(197,197,201,0.72)"
            strokeWidth="1.15"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

export function SalesView() {
  const { activeAnalyticsView, setActiveAnalyticsView, timeRange, setTimeRange } = useAppStore();
  const { widgetMap, widgetDataMap } = useGeneratedViewData("sales");
  const salesTimeRange = ["24h", "7d", "30d", "90d"].includes(timeRange) ? timeRange : "30d";

  const resolvedSalesOverviewData = useMemo(() => {
    const metricDefs = [
      ["revenue", "revenue"],
      ["orders-total", "orders"],
      ["avg-order-value", "aov"],
      ["conversion-rate", "conversion"],
    ];

    const metrics = { ...salesOverviewData.metrics };
    for (const [widgetId, metricKey] of metricDefs) {
      const widget = widgetMap.get(widgetId);
      const data = widgetDataMap[widgetId] || {};
      if (widget) metrics[metricKey] = { ...metrics[metricKey], label: widget.title };
      if (data.value !== undefined && data.value !== null) {
        const numericValue = Number(data.value);
        if (Number.isFinite(numericValue)) {
          if (metricKey === "revenue" || metricKey === "aov") {
            metrics[metricKey].value = `$${metricKey === "revenue" ? `${Math.round(numericValue / 1000)}K` : numericValue.toFixed(2)}`;
          } else if (metricKey === "conversion") {
            metrics[metricKey].value = `${numericValue.toFixed(2)}%`;
          } else {
            metrics[metricKey].value = `${numericValue.toFixed(1)}K`;
          }
        }
      }
    }

    const seriesWidgets = {
      revenue: "sales-overview",
      orders: "orders-series",
      aov: "aov-series",
      conversion: "conversion-series",
    };

    const buildSeries = (widgetId, fallback) => {
      const items = widgetDataMap[widgetId]?.items || [];
      return items.length
        ? items.slice(0, salesOverviewData.labels.length).map((item) => Number(item.value) || 0)
        : fallback;
    };

    const labelItems = widgetDataMap["sales-overview"]?.items
      || widgetDataMap["orders-series"]?.items
      || widgetDataMap["aov-series"]?.items
      || widgetDataMap["conversion-series"]?.items
      || [];

    return {
      ...salesOverviewData,
      metrics,
      labels: labelItems.length
        ? labelItems.slice(0, salesOverviewData.labels.length).map((item) => item.label || "")
        : salesOverviewData.labels,
      tooltipLabels: labelItems.length
        ? labelItems.slice(0, salesOverviewData.tooltipLabels.length).map((item) => item.label || "")
        : salesOverviewData.tooltipLabels,
      timeseries: {
        revenue: buildSeries(seriesWidgets.revenue, salesOverviewData.timeseries.revenue),
        orders: buildSeries(seriesWidgets.orders, salesOverviewData.timeseries.orders),
        aov: buildSeries(seriesWidgets.aov, salesOverviewData.timeseries.aov),
        conversion: buildSeries(seriesWidgets.conversion, salesOverviewData.timeseries.conversion),
      },
    };
  }, [widgetDataMap, widgetMap]);

  const resolvedLeadSourcesData = useMemo(() => {
    const widget = widgetMap.get("lead-sources");
    const items = widgetDataMap["lead-sources"]?.items || [];
    if (!items.length) return leadSourcesData;
    const colors = ["#E5E5E5", "#9C9CA1", "#75757A", "#4F4F53", "#313236"];
    const sources = items.slice(0, 5).map((item, index) => ({
      label: item.label || `${widget?.title || "Source"} ${index + 1}`,
      value: Number(item.value) || 0,
      color: colors[index % colors.length],
    }));
    return {
      totalLeads: sources.reduce((sum, source) => sum + source.value, 0),
      sources,
    };
  }, [widgetDataMap, widgetMap]);

  const resolvedCampaignRoiData = useMemo(() => {
    const items = widgetDataMap["campaign-roi"]?.items || [];
    const revenueMetric = Number(widgetDataMap["revenue"]?.value) || campaignRoiData.revenue;
    const spendItem = items.find((item) => /spend|cost|budget/i.test(String(item.label || "")));
    const revenueItem = items.find((item) => /revenue|return|sales/i.test(String(item.label || "")));
    const spend = Number(spendItem?.value) || Number(items[0]?.value) || campaignRoiData.spend;
    const revenue = Number(revenueItem?.value) || revenueMetric;
    const roas = spend > 0 ? revenue / spend : campaignRoiData.roas;
    const spendPercent = revenue > 0 ? Math.round((spend / revenue) * 100) : campaignRoiData.spendPercent;
    return {
      spend,
      revenue,
      roas,
      spendPercent,
      returnPercent: Math.max(0, 100 - spendPercent),
      retained: Math.max(0, revenue - spend),
    };
  }, [widgetDataMap]);

  const resolvedNewLeadsData = useMemo(() => {
    const items = widgetDataMap["new-leads"]?.items || [];
    if (!items.length) {
      return {
        series: newLeadsSeries,
        total: newLeadsSeries.reduce((sum, value) => sum + value, 0),
        trend: 1.2,
        subtitle: "leads in last 30 days",
      };
    }

    const series = items.map((item) => Number(item.value) || 0);
    const total = series.reduce((sum, value) => sum + value, 0);
    const firstValue = series[0] || 0;
    const lastValue = series[series.length - 1] || 0;
    const trend = firstValue === 0 ? (lastValue === 0 ? 0 : 100) : ((lastValue - firstValue) / Math.abs(firstValue)) * 100;

    return {
      series,
      total,
      trend,
      subtitle: `${widgetMap.get("new-leads")?.title || "New leads"} in selected range`,
    };
  }, [widgetDataMap, widgetMap]);

  const resolvedTransactionsData = useMemo(() => {
    const rows = widgetDataMap["sales-transactions"]?.rows || [];
    if (!rows.length) return recentTransactionsData;
    return {
      transactions: rows.slice(0, 10).map((row, index) => {
        const totalValue = Number(pickRecordField(row, [/total/i, /revenue/i, /amount/i, /value/i], 1)) || 0;
        const qtyValue = Number(pickRecordField(row, [/qty/i, /quantity/i, /units/i, /count/i], 2)) || index + 1;
        const unitValue = Number(pickRecordField(row, [/unit.*price/i, /price/i], 3)) || Math.max(1, Math.round(totalValue / Math.max(qtyValue, 1)));
        return {
          id: String(pickRecordField(row, [/^id$/i, /transaction/i, /order/i], 0) || `#${String(5000 + index).padStart(5, "0")}`),
          customer: String(pickRecordField(row, [/customer/i, /user/i, /account/i, /name/i], 0) || `Customer ${index + 1}`),
          product: String(pickRecordField(row, [/product/i, /item/i, /sku/i, /service/i, /description/i], 1) || "Generated Transaction"),
          status: normalizeTransactionStatus(pickRecordField(row, [/status/i, /state/i], 2)),
          qty: Math.max(1, Math.round(qtyValue)),
          unitPrice: formatCurrencyValue(unitValue),
          totalRevenue: formatCurrencyValue(totalValue || unitValue * Math.max(1, Math.round(qtyValue))),
        };
      }),
    };
  }, [widgetDataMap]);

  return (
    <div className="sales-dashboard">
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
              value={salesTimeRange}
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
          <button className="dashboard-refresh-btn" type="button" aria-label="Refresh sales dashboard">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="sales-dashboard-body">
        <section className="widget-card sales-hero-card">
          <div className="widget-content-body sales-hero-card-body">
            <SalesOverviewWidget data={resolvedSalesOverviewData} />
          </div>
        </section>

        <div className="sales-detail-grid">
          <SalesCardShell title={widgetMap.get("lead-sources")?.title || "Lead Sources Breakdown"} icon={Layers3} action="More details">
            <LeadSourcesWidget data={resolvedLeadSourcesData} />
          </SalesCardShell>

          <SalesCardShell title={widgetMap.get("new-leads")?.title || "New Leads / Day"} icon={UserRoundPlus} action="View leads">
            <NewLeadsCard data={resolvedNewLeadsData} />
          </SalesCardShell>

          <SalesCardShell title={widgetMap.get("campaign-roi")?.title || "Campaign ROI Snapshot"} icon={ShoppingCart} action="Full Snapshot">
            <CampaignRoiWidget data={resolvedCampaignRoiData} />
          </SalesCardShell>
        </div>

        <section className="widget-card sales-transactions-shell">
          <header className="sales-transactions-shell-header">
            <div className="sales-transactions-shell-title">
              <ReceiptText size={16} />
              <span>{widgetMap.get("sales-transactions")?.title || "Recent Transactions"}</span>
            </div>

            <div className="sales-transactions-shell-tools">
              <div className="sales-transactions-search">
                <Search size={18} />
                <span>Search transactions...</span>
              </div>
              <button type="button" className="sales-transactions-tools-button" aria-label="More transaction options">
                <Ellipsis size={18} />
              </button>
            </div>
          </header>

          <div className="widget-content-body sales-transactions-shell-body">
            <SalesTransactionsWidget data={resolvedTransactionsData} />
          </div>
        </section>
      </div>
    </div>
  );
}
