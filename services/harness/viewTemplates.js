export const VIEW_TEMPLATES = {
  servers: {
    layout: 'server-monitor',
    title: 'Server Monitor',
    timeRange: {
      default: '1h',
      options: ['15m', '1h', '6h', '24h', '7d'],
    },
    groupId: 'servers',
    widgets: [
      { id: 'requests', type: 'metric', size: '1x1', title: 'Requests', intent: 'request volume', preferNumeric: false },
      { id: 'errors', type: 'metric', size: '1x1', title: 'Errors', intent: 'error volume', preferNumeric: false },
      { id: 'cpu-time', type: 'metric', size: '1x1', title: 'CPU Time', intent: 'compute usage' },
      { id: 'wall-time', type: 'metric', size: '1x1', title: 'Wall Time', intent: 'latency or duration' },
      { id: 'execution-duration', type: 'sparkline', size: '2x2', title: 'Execution Duration', intent: 'execution duration over time' },
      { id: 'request-duration', type: 'sparkline', size: '2x2', title: 'Request Duration', intent: 'request duration over time' },
      { id: 'server-ai-insight', type: 'text-insight', size: '2x2', title: 'AI Insight', intent: 'summary insight' },
      { id: 'latency-percentiles', type: 'segmented-bar', size: '2x2', title: 'Latency Distribution', intent: 'latency distribution' },
      { id: 'active-deployments', type: 'status-list', size: '4x2', title: 'Active Deployments', intent: 'active services or deployments' },
    ],
  },
  web: {
    layout: 'analytics',
    title: 'Web Analytics',
    timeRange: {
      default: '24h',
      options: ['1h', '24h', '7d', '30d', '90d'],
    },
    groupId: 'web',
    widgets: [
      { id: 'total-visitors', type: 'metric', size: '2x1', title: 'Total Visitors', intent: 'unique visitors over time' },
      { id: 'visitors-online', type: 'metric', size: '2x1', title: 'Visitors Online', intent: 'active or current sessions' },
      { id: 'top-pages', type: 'progress-list', size: '2x2', title: 'Top Pages', intent: 'top pages by visits' },
      { id: 'top-countries', type: 'progress-list', size: '2x2', title: 'Top Countries', intent: 'top countries by visits' },
      { id: 'sessions-by-source', type: 'progress-list', size: '1x2', title: 'Sessions by Source', intent: 'sessions grouped by source' },
      { id: 'audience-mix', type: 'pie-chart', size: '1x2', title: 'Audience Mix', intent: 'distribution by audience segment' },
      { id: 'browsers', type: 'progress-list', size: '1x2', title: 'Browsers', intent: 'browser distribution' },
      { id: 'referrers', type: 'progress-list', size: '1x2', title: 'Top Referrers', intent: 'top referrers' },
      { id: 'core-web-vitals', type: 'status-list', size: '4x1', title: 'Core Web Vitals', intent: 'site performance metrics' },
    ],
  },
  financial: {
    layout: 'campaign-sales',
    title: 'Financial',
    timeRange: {
      default: '30d',
      options: ['24h', '7d', '30d', '90d'],
    },
    groupId: 'financial',
    widgets: [
      { id: 'repeat-purchase-rate', type: 'metric', size: '1x1', title: 'Repeat Purchase Rate', intent: 'repeat purchase rate' },
      { id: 'orders', type: 'metric', size: '1x1', title: 'Orders', intent: 'order count' },
      { id: 'aov', type: 'metric', size: '1x1', title: 'AOV', intent: 'average order value' },
      { id: 'mrr-overview', type: 'sparkline', size: '4x2', title: 'MRR Overview', intent: 'monthly recurring revenue over time' },
      { id: 'active-customers', type: 'metric', size: '2x2', title: 'Active Customers', intent: 'active customers' },
      { id: 'budget-usage', type: 'bar-chart', size: '2x2', title: 'Budget Usage', intent: 'budget usage or spend breakdown' },
      { id: 'total-revenue', type: 'metric', size: '2x2', title: 'Total Revenue', intent: 'total revenue' },
      { id: 'financial-ai-insight', type: 'text-insight', size: '2x2', title: 'AI Insight', intent: 'financial summary insight' },
    ],
  },
  sales: {
    layout: 'campaign-sales',
    title: 'Sales',
    timeRange: {
      default: '30d',
      options: ['24h', '7d', '30d', '90d'],
    },
    groupId: 'sales',
    widgets: [
      { id: 'revenue', type: 'metric', size: '1x1', title: 'Revenue', intent: 'sales revenue' },
      { id: 'orders-total', type: 'metric', size: '1x1', title: 'Orders', intent: 'sales order count' },
      { id: 'avg-order-value', type: 'metric', size: '1x1', title: 'Avg. Order Value', intent: 'average order value' },
      { id: 'conversion-rate', type: 'metric', size: '1x1', title: 'Conversion Rate', intent: 'conversion rate' },
      { id: 'sales-overview', type: 'bar-chart', size: '4x2', title: 'Sales Overview', intent: 'sales trend overview' },
      { id: 'lead-sources', type: 'pie-chart', size: '2x2', title: 'Lead Sources', intent: 'lead source distribution' },
      { id: 'campaign-roi', type: 'bar-chart', size: '2x2', title: 'Campaign ROI', intent: 'campaign return on ad spend' },
      { id: 'sales-transactions', type: 'status-list', size: '4x2', title: 'Recent Transactions', intent: 'recent transactions' },
    ],
  },
  marketing: {
    layout: 'marketing-performance',
    title: 'Marketing Performance',
    timeRange: {
      default: '24h',
      options: ['24h', '7d', '30d', '90d'],
    },
    groupId: 'marketing',
    widgets: [
      { id: 'active-campaigns-total', type: 'metric', size: '1x1', title: 'Active Campaigns', intent: 'active campaign count' },
      { id: 'posts-published', type: 'metric', size: '1x1', title: 'Posts Published', intent: 'content posts published' },
      { id: 'total-reach', type: 'metric', size: '1x1', title: 'Total Reach', intent: 'total reach' },
      { id: 'avg-engagement', type: 'metric', size: '1x1', title: 'Avg. Engagement', intent: 'average engagement' },
      { id: 'gross-revenue', type: 'bar-chart', size: '4x2', title: 'Gross Revenue', intent: 'marketing-attributed revenue over time' },
      { id: 'todays-budget', type: 'bar-chart', size: '4x1', title: "Today's Budget", intent: 'today budget and spend' },
    ],
  },
};

export const VIEW_ORDER = ['servers', 'financial', 'sales', 'marketing', 'web'];

export const LAYOUT_TO_VIEW = {
  'server-monitor': 'servers',
  analytics: 'web',
  'campaign-sales': 'sales',
  'marketing-performance': 'marketing',
};
