import React, { useEffect, useState } from "react";
import { ViewFrame } from "@/components/shell/ViewFrame";
import FeatureMindMap from "@/components/mindmap/DetachedMindMap";
import { ProjectEmptyState, isProjectEmpty } from "@/components/shell/ProjectEmptyState";
import { useAppStore } from "@/stores/useAppStore";

// --- Combined Topology Data for All Domains ---
const combinedMindMapData = {
  connector: [
    // Servers & Web Connectors
    { id: "srv-db-1", name: "PostgreSQL Production DB", type: "db" },
    { id: "srv-ga4-1", name: "Google Analytics Stream", type: "ga4" },
    { id: "web-lighthouse", name: "Lighthouse Performance Audit", type: "stream" },
    { id: "web-vercel", name: "Vercel Deployments Log", type: "stream" },
    
    // Financial & Sales Connectors
    { id: "fin-stripe", name: "Stripe Billing API", type: "stripe" },
    { id: "fin-bank", name: "Silicon Valley Bank ACH", type: "db" },
    { id: "fin-quickbooks", name: "QuickBooks Ledger", type: "api" },
    { id: "sal-salesforce", name: "Salesforce Sales CRM", type: "crm" },
    { id: "sal-shopify", name: "Shopify Storefront API", type: "shopify" },
    
    // Marketing Connectors
    { id: "mkt-google", name: "Google Ads Campaigns", type: "api" },
    { id: "mkt-facebook", name: "Meta Business Ads Manager", type: "api" }
  ],
  adjustedData: [
    // Servers & Web Categories
    {
      id: "cat-db-users",
      origin_id: "srv-db-1",
      name: "Core Users",
      title: "Core Users",
      columns: [
        { id: "col-db-u1", name: "user_id", type: "string", status: "ok" },
        { id: "col-db-u2", name: "email", type: "string", status: "ok" },
        { id: "col-db-u3", name: "created_at", type: "timestamp", status: "ok" }
      ]
    },
    {
      id: "cat-ga4-events",
      origin_id: "srv-ga4-1",
      name: "Web Sessions Stream",
      title: "Web Sessions Stream",
      columns: [
        { id: "col-ga-s1", name: "session_id", type: "string", status: "ok" },
        { id: "col-ga-s2", name: "bounce_rate", type: "float", status: "error" }
      ]
    },
    {
      id: "cat-web-vitals",
      origin_id: "web-lighthouse",
      name: "Core Web Vitals Metric",
      title: "Core Web Vitals Metric",
      columns: [
        { id: "col-w-lcp", name: "lcp_seconds", type: "float", status: "ok" },
        { id: "col-w-cls", name: "cls_value", type: "float", status: "ok" },
        { id: "col-w-inp", name: "inp_milliseconds", type: "float", status: "warning" }
      ]
    },
    {
      id: "cat-web-latency",
      origin_id: "web-vercel",
      name: "Server Latency Logs",
      title: "Server Latency Logs",
      columns: [
        { id: "col-w-p50", name: "p50_ms", type: "float", status: "ok" },
        { id: "col-w-p95", name: "p95_ms", type: "float", status: "ok" },
        { id: "col-w-p99", name: "p99_ms", type: "float", status: "error" }
      ]
    },
    
    // Financial & Sales Categories
    {
      id: "cat-fin-recurring",
      origin_id: "fin-stripe",
      name: "Subscription Revenue",
      title: "Subscription Revenue",
      columns: [
        { id: "col-f-mrr", name: "mrr_usd", type: "float", status: "ok" },
        { id: "col-f-churn", name: "churn_rate", type: "float", status: "warning" },
        { id: "col-f-subscribers", name: "active_subscribers", type: "integer", status: "ok" }
      ]
    },
    {
      id: "cat-fin-ledger",
      origin_id: "fin-quickbooks",
      name: "Tax Liability & Ledger",
      title: "Tax Liability & Ledger",
      columns: [
        { id: "col-f-tax", name: "tax_liability", type: "float", status: "ok" },
        { id: "col-f-invoice", name: "invoice_count", type: "integer", status: "ok" }
      ]
    },
    {
      id: "cat-fin-treasury",
      origin_id: "fin-bank",
      name: "Corporate Budget Runway",
      title: "Corporate Budget Runway",
      columns: [
        { id: "col-f-allowance", name: "budget_allowance", type: "float", status: "ok" },
        { id: "col-f-spent", name: "spent_today", type: "float", status: "warning" },
        { id: "col-f-reserved", name: "reserved_funds", type: "float", status: "ok" }
      ]
    },
    {
      id: "cat-sal-deals",
      origin_id: "sal-salesforce",
      name: "Deals & Pipelines",
      title: "Deals & Pipelines",
      columns: [
        { id: "col-s-deal", name: "deal_id", type: "string", status: "ok" },
        { id: "col-s-stage", name: "pipeline_stage", type: "string", status: "ok" },
        { id: "col-s-value", name: "deal_value_usd", type: "float", status: "ok" }
      ]
    },
    {
      id: "cat-sal-orders",
      origin_id: "sal-shopify",
      name: "E-Commerce Transactions",
      title: "E-Commerce Transactions",
      columns: [
        { id: "col-s-order", name: "order_id", type: "string", status: "ok" },
        { id: "col-s-qty", name: "quantity", type: "integer", status: "warning" },
        { id: "col-s-total", name: "total_price_usd", type: "float", status: "ok" }
      ]
    },

    // Marketing Categories
    {
      id: "cat-mkt-campaigns",
      origin_id: "mkt-google",
      name: "Google Ad Reach",
      title: "Google Ad Reach",
      columns: [
        { id: "col-m-camp", name: "campaign_id", type: "string", status: "ok" },
        { id: "col-m-impressions", name: "impressions", type: "integer", status: "ok" },
        { id: "col-m-spend", name: "spend_usd", type: "float", status: "warning" }
      ]
    },
    {
      id: "cat-mkt-social",
      origin_id: "mkt-facebook",
      name: "Meta Campaign Performance",
      title: "Meta Campaign Performance",
      columns: [
        { id: "col-m-clicks", name: "clicks", type: "integer", status: "ok" },
        { id: "col-m-conversions", name: "conversions", type: "integer", status: "ok" }
      ]
    }
  ],
  group: [
    { id: "servers", title: "Servers", name: "Servers", activationMode: "automatic" },
    { id: "financial", title: "Financial", name: "Financial", activationMode: "automatic" },
    { id: "sales", title: "Sales", name: "Sales", activationMode: "automatic" },
    { id: "marketing", title: "Marketing", name: "Marketing", activationMode: "automatic" },
    { id: "web", title: "Web", name: "Web", activationMode: "automatic" }
  ],
  insight: [
    // --- Servers Insights (Server Monitor) ---
    {
      id: "ins-srv-requests",
      title: "Requests",
      name: "Requests",
      group_id: "servers",
      adjusted_data_columns: ["session_id"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },
    {
      id: "ins-srv-errors",
      title: "Errors",
      name: "Errors",
      group_id: "servers",
      adjusted_data_columns: ["bounce_rate"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },
    {
      id: "ins-srv-cpu",
      title: "CPU Time",
      name: "CPU Time",
      group_id: "servers",
      adjusted_data_columns: ["p50_ms"],
      lineage: { source_keys: ["cat-web-latency"] }
    },
    {
      id: "ins-srv-wall",
      title: "Wall Time",
      name: "Wall Time",
      group_id: "servers",
      adjusted_data_columns: ["p95_ms"],
      lineage: { source_keys: ["cat-web-latency"] }
    },
    {
      id: "ins-srv-exec-duration",
      title: "Execution Duration",
      name: "Execution Duration",
      group_id: "servers",
      adjusted_data_columns: ["p99_ms"],
      lineage: { source_keys: ["cat-web-latency"] }
    },
    {
      id: "ins-srv-req-duration",
      title: "Request Duration",
      name: "Request Duration",
      group_id: "servers",
      adjusted_data_columns: ["p50_ms", "p95_ms"],
      lineage: { source_keys: ["cat-web-latency"] }
    },
    {
      id: "ins-srv-ai-insight",
      title: "AI Insight",
      name: "AI Insight",
      group_id: "servers",
      adjusted_data_columns: ["user_id", "email"],
      lineage: { source_keys: ["cat-db-users"] }
    },
    {
      id: "ins-srv-latency-dist",
      title: "Latency Distribution",
      name: "Latency Distribution",
      group_id: "servers",
      adjusted_data_columns: ["p99_ms"],
      lineage: { source_keys: ["cat-web-latency"] }
    },
    {
      id: "ins-srv-deployments",
      title: "Active Deployments",
      name: "Active Deployments",
      group_id: "servers",
      adjusted_data_columns: ["created_at"],
      lineage: { source_keys: ["cat-db-users"] }
    },

    // --- Web Insights (Web Analytics) ---
    {
      id: "ins-web-visitors",
      title: "Total Visitors",
      name: "Total Visitors",
      group_id: "web",
      adjusted_data_columns: ["user_id"],
      lineage: { source_keys: ["cat-db-users"] }
    },
    {
      id: "ins-web-online",
      title: "Visitors Online",
      name: "Visitors Online",
      group_id: "web",
      adjusted_data_columns: ["session_id"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },
    {
      id: "ins-web-pages",
      title: "Top Pages (Routes)",
      name: "Top Pages (Routes)",
      group_id: "web",
      adjusted_data_columns: ["session_id"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },
    {
      id: "ins-web-countries",
      title: "Top Countries",
      name: "Top Countries",
      group_id: "web",
      adjusted_data_columns: ["session_id"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },
    {
      id: "ins-web-sources",
      title: "Sessions by Source",
      name: "Sessions by Source",
      group_id: "web",
      adjusted_data_columns: ["session_id"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },
    {
      id: "ins-web-audience",
      title: "Audience Mix",
      name: "Audience Mix",
      group_id: "web",
      adjusted_data_columns: ["session_id"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },
    {
      id: "ins-web-browsers",
      title: "Browsers",
      name: "Browsers",
      group_id: "web",
      adjusted_data_columns: ["bounce_rate"],
      lineage: { source_keys: ["cat-ga4-events"] }
    },

    // --- Financial Insights ---
    {
      id: "ins-fin-repeat-purchase",
      title: "Repeat Purchase Rate",
      name: "Repeat Purchase Rate",
      group_id: "financial",
      adjusted_data_columns: ["churn_rate"],
      lineage: { source_keys: ["cat-fin-recurring"] }
    },
    {
      id: "ins-fin-orders",
      title: "Orders",
      name: "Orders",
      group_id: "financial",
      adjusted_data_columns: ["invoice_count"],
      lineage: { source_keys: ["cat-fin-ledger"] }
    },
    {
      id: "ins-fin-aov",
      title: "AOV",
      name: "AOV",
      group_id: "financial",
      adjusted_data_columns: ["mrr_usd", "active_subscribers"],
      lineage: { source_keys: ["cat-fin-recurring"] }
    },
    {
      id: "ins-fin-mrr",
      title: "MRR Overview",
      name: "MRR Overview",
      group_id: "financial",
      adjusted_data_columns: ["mrr_usd", "churn_rate"],
      lineage: { source_keys: ["cat-fin-recurring"] }
    },
    {
      id: "ins-fin-revenue",
      title: "Total Revenue",
      name: "Total Revenue",
      group_id: "financial",
      adjusted_data_columns: ["mrr_usd"],
      lineage: { source_keys: ["cat-fin-recurring"] }
    },
    {
      id: "ins-fin-active-customers",
      title: "Active Customers",
      name: "Active Customers",
      group_id: "financial",
      adjusted_data_columns: ["active_subscribers"],
      lineage: { source_keys: ["cat-fin-recurring"] }
    },
    {
      id: "ins-fin-budget",
      title: "Budget Usage",
      name: "Budget Usage",
      group_id: "financial",
      adjusted_data_columns: ["budget_allowance", "spent_today"],
      lineage: { source_keys: ["cat-fin-treasury"] }
    },
    {
      id: "ins-fin-ai-insights",
      title: "AI Insights",
      name: "AI Insights",
      group_id: "financial",
      adjusted_data_columns: ["reserved_funds"],
      lineage: { source_keys: ["cat-fin-treasury"] }
    },

    // --- Sales Insights ---
    {
      id: "ins-sal-revenue",
      title: "Revenue",
      name: "Revenue",
      group_id: "sales",
      adjusted_data_columns: ["total_price_usd"],
      lineage: { source_keys: ["cat-sal-orders"] }
    },
    {
      id: "ins-sal-orders",
      title: "Orders",
      name: "Orders",
      group_id: "sales",
      adjusted_data_columns: ["order_id"],
      lineage: { source_keys: ["cat-sal-orders"] }
    },
    {
      id: "ins-sal-aov",
      title: "Avg. Order Value",
      name: "Avg. Order Value",
      group_id: "sales",
      adjusted_data_columns: ["total_price_usd", "quantity"],
      lineage: { source_keys: ["cat-sal-orders"] }
    },
    {
      id: "ins-sal-conversion",
      title: "Conversion Rate",
      name: "Conversion Rate",
      group_id: "sales",
      adjusted_data_columns: ["pipeline_stage"],
      lineage: { source_keys: ["cat-sal-deals"] }
    },
    {
      id: "ins-sal-lead-sources",
      title: "Lead Sources",
      name: "Lead Sources",
      group_id: "sales",
      adjusted_data_columns: ["deal_id"],
      lineage: { source_keys: ["cat-sal-deals"] }
    },
    {
      id: "ins-sal-campaign-roi",
      title: "Campaign ROI",
      name: "Campaign ROI",
      group_id: "sales",
      adjusted_data_columns: ["deal_value_usd"],
      lineage: { source_keys: ["cat-sal-deals"] }
    },
    {
      id: "ins-sal-unfulfilled",
      title: "Unfulfilled Orders",
      name: "Unfulfilled Orders",
      group_id: "sales",
      adjusted_data_columns: ["order_id", "quantity"],
      lineage: { source_keys: ["cat-sal-orders"] }
    },

    // --- Marketing Insights ---
    {
      id: "ins-mkt-campaigns",
      title: "Active Campaigns",
      name: "Active Campaigns",
      group_id: "marketing",
      adjusted_data_columns: ["campaign_id"],
      lineage: { source_keys: ["cat-mkt-campaigns"] }
    },
    {
      id: "ins-mkt-posts",
      title: "Posts Published",
      name: "Posts Published",
      group_id: "marketing",
      adjusted_data_columns: ["clicks"],
      lineage: { source_keys: ["cat-mkt-social"] }
    },
    {
      id: "ins-mkt-reach",
      title: "Total Reach",
      name: "Total Reach",
      group_id: "marketing",
      adjusted_data_columns: ["impressions"],
      lineage: { source_keys: ["cat-mkt-campaigns"] }
    },
    {
      id: "ins-mkt-engagement",
      title: "Avg. Engagement",
      name: "Avg. Engagement",
      group_id: "marketing",
      adjusted_data_columns: ["clicks", "conversions"],
      lineage: { source_keys: ["cat-mkt-social"] }
    },
    {
      id: "ins-mkt-roi",
      title: "Campaign ROI Snapshot",
      name: "Campaign ROI Snapshot",
      group_id: "marketing",
      adjusted_data_columns: ["spend_usd"],
      lineage: { source_keys: ["cat-mkt-campaigns"] }
    }
  ]
};

export function GraphView() {
  const { currentWorkspace, currentOrganization, fetchMindmap, demoMode, devMode } = useAppStore();
  const [mindmapData, setMindmapData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!devMode && !demoMode && currentOrganization?.id && currentWorkspace?.id) {
      setLoading(true);
      fetchMindmap(currentOrganization.id, currentWorkspace.id)
        .then((data) => {
          if (data) setMindmapData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [devMode, demoMode, currentOrganization?.id, currentWorkspace?.id, fetchMindmap]);

  if (isProjectEmpty(currentWorkspace)) {
    return (
      <ViewFrame>
        <ProjectEmptyState mode="graph" />
      </ViewFrame>
    );
  }

  return (
    <div className="flex-1 w-full min-h-0 relative flex flex-col overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-white text-sm">Loading graph artifact...</div>
        </div>
      )}
      <FeatureMindMap customData={mindmapData || combinedMindMapData} />
    </div>
  );
}
