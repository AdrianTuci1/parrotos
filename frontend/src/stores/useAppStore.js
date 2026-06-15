import { create } from 'zustand';
import { config } from '@/config';
import { organizationService } from '@/services/OrganizationService';
import { projectService } from '@/services/ProjectService';
import { agentService } from '@/services/AgentService';
import { integrationService } from '@/services/IntegrationService';
import { authService } from '@/services/AuthService';
import { serviceAccountService } from '@/services/ServiceAccountService';
import { billingService } from '@/services/BillingService';
import { alertService } from '@/services/AlertService';
import { connectorAuthService } from '@/services/ConnectorAuthService';
import { apiClient } from '@/services/ApiClient';
import connectorsData from '@/data/connectors.json';
import { analyticsService } from '@/services/AnalyticsService';
import { specService } from '@/services/SpecService';
import { storageService } from '@/services/StorageService';

const transientOrganizationSections = new Set(['create-project']);

function slugify(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeWorkspace(workspace) {
  const slug = workspace.slug || slugify(workspace.name || 'project');
  return {
    ...workspace,
    slug,
    domain: workspace.domain || `${slug}.workspace`,
    status: workspace.status || 'Healthy',
    monthlyEvents: workspace.monthlyEvents ?? String(workspace.stats?.sessionsCount ?? 0),
    dataConsumption: workspace.dataConsumption || '0 GB',
    lastUpdated: workspace.lastUpdated || 'just now',
    connectors: Array.isArray(workspace.connectors) ? workspace.connectors : [],
  };
}

const mockOrganizations = [
  { id: 'nexa-org', name: 'Nexa', slug: 'nexa', owner: 'admin@nexahub.io', plan: 'Agency' },
  { id: 'staticlabs-org', name: 'Staticlabs', slug: 'staticlabs', owner: 'ops@staticlabs.ro', plan: 'Growth' },
  { id: 'octomus-org', name: 'Octomus', slug: 'octomus', owner: 'team@octomus.dev', plan: 'Scale' },
];

const mockWorkspaces = [
  { id: 'pixtooth', organizationId: 'nexa-org', name: 'Pixtooth', slug: 'pixtooth', domain: 'pixtooth.com', status: 'Healthy', monthlyEvents: '13K', dataConsumption: '612 GB', lastUpdated: '4 min ago', connectors: ['Stripe', 'PostHog', 'HubSpot', 'GitHub', 'MongoDB'] },
  { id: 'octomus', organizationId: 'octomus-org', name: 'Octomus', slug: 'octomus', domain: 'octomus.dev', status: 'Healthy', monthlyEvents: '2.7K', dataConsumption: '421 GB', lastUpdated: '11 min ago', connectors: ['Stripe', 'Sentry', 'GA4', 'Prometheus', 'PostgreSQL'] },
  { id: 'staticlabs', organizationId: 'staticlabs-org', name: 'Staticlabs', slug: 'staticlabs', domain: 'staticlabs.ro', status: 'Monitoring', monthlyEvents: '1.9K', dataConsumption: '286 GB', lastUpdated: '18 min ago', connectors: ['Shopify', 'Klaviyo', 'PostHog', 'Meta Ads', 'TikTok Ads', 'MongoDB'] },
  { id: 'nexa', organizationId: 'nexa-org', name: 'Nexa', slug: 'nexa', domain: 'nexa.dev', status: 'Healthy', monthlyEvents: '0', dataConsumption: '0 GB', lastUpdated: 'just now', connectors: [] },
];

const mockMetrics = {
  // Account-level metrics (for OrganizationHomeView)
  organizations: 3,
  totalProjects: 4,
  healthyProjects: 3,
  totalEvents: 17600,
  totalStorage: 1319,
  uniqueConnectors: 12,
  connectors: ['Stripe', 'PostHog', 'HubSpot', 'GitHub', 'MongoDB', 'Sentry', 'GA4', 'Prometheus', 'PostgreSQL', 'Shopify', 'Klaviyo', 'Meta Ads', 'TikTok Ads'],
  orgsList: [
    { id: 'nexa-org', name: 'Nexa', slug: 'nexa', plan: 'Agency', projectCount: 2 },
    { id: 'staticlabs-org', name: 'Staticlabs', slug: 'staticlabs', plan: 'Growth', projectCount: 1 },
    { id: 'octomus-org', name: 'Octomus', slug: 'octomus', plan: 'Scale', projectCount: 1 },
  ],
  recentActivity: [
    { title: 'Project updated', meta: 'Pixtooth in Nexa' },
    { title: 'Connector active', meta: 'Stripe connected to Pixtooth' },
    { title: 'New project created', meta: 'Nexa added to Nexa' },
  ],
  // Org-level metrics (for OrganizationStatsView) - default for first org
  org: { id: 'nexa-org', name: 'Nexa', slug: 'nexa', plan: 'Agency' },
  projects: { total: 2, healthy: 1, monitoring: 1 },
  events: { total: 13000, formatted: '13K' },
  storage: { total: 612, formatted: '612 GB' },
  compute: { value: '30.6 GB', detail: 'BigQuery + orchestration', trend: '-8.1%' },
  connectedSources: { value: '5', detail: 'Stripe most used', trend: '+12%' },
  topConnector: { value: 'Stripe', detail: '2 projects', trend: '+5%' },
  connectorUsage: [
    { name: 'Stripe', count: 2, share: 100 },
    { name: 'PostHog', count: 1, share: 50 },
    { name: 'HubSpot', count: 1, share: 50 },
    { name: 'GitHub', count: 1, share: 50 },
    { name: 'MongoDB', count: 1, share: 50 },
  ],
  projectList: [
    { id: 'pixtooth', name: 'Pixtooth', slug: 'pixtooth', domain: 'pixtooth.com', status: 'Healthy', monthlyEvents: '13K', dataConsumption: '612 GB', connectors: ['Stripe', 'PostHog', 'HubSpot', 'GitHub', 'MongoDB'] },
    { id: 'nexa', name: 'Nexa', slug: 'nexa', domain: 'nexa.dev', status: 'Healthy', monthlyEvents: '0', dataConsumption: '0 GB', connectors: [] },
  ],
  recentActivity: [
    { title: 'Project updated', meta: 'Pixtooth configuration changed' },
    { title: 'Connector synced', meta: 'Stripe data refreshed' },
    { title: 'Project created', meta: 'Nexa added to organization' },
  ],
};

const emptyMetrics = {
  // Account-level
  organizations: 0,
  totalProjects: 0,
  healthyProjects: 0,
  totalEvents: 0,
  totalStorage: 0,
  uniqueConnectors: 0,
  connectors: [],
  orgsList: [],
  recentActivity: [],
  // Org-level
  org: { id: '', name: '', slug: '', plan: 'Starter' },
  projects: { total: 0, healthy: 0, monitoring: 0 },
  events: { total: 0, formatted: '0' },
  storage: { total: 0, formatted: '0 GB' },
  compute: { value: '0 GB', detail: '', trend: '' },
  connectedSources: { value: '0', detail: '', trend: '' },
  topConnector: { value: '-', detail: '', trend: '' },
  connectorUsage: [],
  projectList: [],
  recentActivity: [],
};

function getOrganizationNameFromEmail(email) {
  const domain = email.split('@')[1] || '';
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1) || 'My Org';
}

const emptyOrg = { id: '__empty__', name: 'My Organization', slug: 'my-org', plan: 'Starter' };

// ═══════════════════════════════════════════════
// MOCK CHAT SESSIONS (demo mode)
// ═══════════════════════════════════════════════

const mockChatSessions = [
  // 1. Stripe connected → approved badge in chat → widgets → suggestions
  {
    id: 'chat_stripe_revenue',
    title: 'Connect Stripe + revenue widgets',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      {
        id: 'msg_s1_1',
        role: 'user',
        content: 'Connect my Stripe account so I can see revenue data.',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: 'msg_s1_2',
        role: 'assistant',
        content: 'To pull your Stripe data, I need your **Secret Key**. It stays encrypted — I only read charges, subscriptions, and payouts.',
        timestamp: new Date(Date.now() - 3490000).toISOString(),
        toolCalls: [
          {
            id: 'tc_s1_1',
            type: 'action',
            action: 'open_integration_modal',
            connector: 'Stripe',
            status: 'approved',
          },
        ],
      },
      {
        id: 'msg_s1_3',
        role: 'user',
        content: 'Done. What insights can you show me?',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
      },
      {
        id: 'msg_s1_4',
        role: 'assistant',
        content: 'Stripe is connected. Here\u2019s your revenue overview for the last 30 days:',
        timestamp: new Date(Date.now() - 3390000).toISOString(),
toolCalls: [
          { id: 'tc_s1_2', type: 'widget', widgetType: 'metric', size: '2x1', queryRef: 'stripe_monthly_revenue', title: 'Monthly Revenue (30d)', config: { sparkline: true } },
          { id: 'tc_s1_3', type: 'widget', widgetType: 'metric', size: '2x1', queryRef: 'stripe_mrr', title: 'Current MRR', config: { sparkline: true } },
        ],
      },
      {
        id: 'msg_s1_5',
        role: 'assistant',
        content: 'You\u2019ve processed **1,247 charges** this month totaling **\u20ac84,320**. Subscriptions are up 12% vs last month.\n\nI\u2019d recommend connecting **GA4** next — correlating revenue with traffic sources tells you which channels actually convert.',
        timestamp: new Date(Date.now() - 3380000).toISOString(),
        toolCalls: [
          {
            id: 'tc_s1_4',
            type: 'suggestion',
            reason: 'See which traffic channels and landing pages drive the most revenue.',
            connectors: ['GA4', 'Search Console', 'Google Ads'],
          },
        ],
      },
    ],
  },

  // 2. Sales data query → Shopify pending (key input)
  {
    id: 'chat_sales_csv',
    title: 'Export sales data + connect Shopify',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    messages: [
      {
        id: 'msg_s2_1',
        role: 'user',
        content: 'I need to export Q2 sales data for a board meeting. Show me the raw numbers.',
        timestamp: new Date(Date.now() - 86300000).toISOString(),
      },
      {
        id: 'msg_s2_2',
        role: 'assistant',
        content: 'Here\u2019s your Q2 2026 sales report:',
        timestamp: new Date(Date.now() - 86200000).toISOString(),
        toolCalls: [
          {
            id: 'tc_s2_1',
            type: 'query_result',
            question: 'Sales report Q2 2026',
            result: {
              columns: ['Date', 'Revenue', 'Orders', 'AOV', 'Channel'],
              rows: [
                ['2026-04-01', '\u20ac12,450', '218', '\u20ac57.11', 'Shopify'],
                ['2026-05-01', '\u20ac14,820', '256', '\u20ac57.89', 'Shopify'],
                ['2026-06-01', '\u20ac13,900', '241', '\u20ac57.68', 'Shopify'],
                ['2026-04-01', '\u20ac8,200', '94', '\u20ac87.23', 'Stripe'],
                ['2026-05-01', '\u20ac9,650', '112', '\u20ac86.16', 'Stripe'],
                ['2026-06-01', '\u20ac10,100', '118', '\u20ac85.59', 'Stripe'],
              ],
              total: { revenue: '\u20ac69,120', orders: '1,039', aov: '\u20ac66.53' },
            },
          },
        ],
      },
      {
        id: 'msg_s2_3',
        role: 'assistant',
        content: 'You\u2019re missing Shopify order tracking — we can see revenue through Stripe, but not product SKUs, order status, or inventory levels. Connect Shopify to get the full picture.',
        timestamp: new Date(Date.now() - 86100000).toISOString(),
        toolCalls: [
          {
            id: 'tc_s2_2',
            type: 'action',
            action: 'open_integration_modal',
            connector: 'Shopify',
          },
        ],
      },
    ],
  },

  // 3. CRM choice — which system? (choice pending)
  {
    id: 'chat_choice_pending',
    title: 'Sales pipeline — choose CRM',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    messages: [
      {
        id: 'msg_c1_1',
        role: 'user',
        content: 'I want to build a sales pipeline dashboard. We use a CRM but I\u2019m not sure which integration fits best.',
        timestamp: new Date(Date.now() - 1700000).toISOString(),
      },
      {
        id: 'msg_c1_2',
        role: 'assistant',
        content: 'I can pull pipeline data from any of these CRMs. **Which one does your team use?**',
        timestamp: new Date(Date.now() - 1690000).toISOString(),
        toolCalls: [
          {
            id: 'tc_c1_1',
            type: 'choice',
            title: 'Which CRM does your team use?',
            choices: [
              { label: 'HubSpot', description: 'Deals, contacts, companies — full CRM suite' },
              { label: 'Salesforce', description: 'Opportunities, accounts, leads — enterprise CRM' },
            ],
          },
        ],
      },
    ],
  },

  // 4. HubSpot credentials (key-input pending)
  {
    id: 'chat_hubspot_pending',
    title: 'Connect HubSpot — enter token',
    createdAt: new Date(Date.now() - 1600000).toISOString(),
    messages: [
      {
        id: 'msg_s3_1',
        role: 'user',
        content: 'We use HubSpot. Connect it so I can see our deal pipeline and contacts.',
        timestamp: new Date(Date.now() - 1500000).toISOString(),
      },
      {
        id: 'msg_s3_2',
        role: 'assistant',
        content: 'HubSpot is a great fit for pipeline analytics. I\u2019ll sync your deals, contacts, and companies into the warehouse automatically.\n\nI need your **Private App Token** — it\u2019s read-only and scoped to CRM objects only. No passwords involved.',
        timestamp: new Date(Date.now() - 1490000).toISOString(),
        toolCalls: [
          {
            id: 'tc_s3_1',
            type: 'action',
            action: 'open_integration_modal',
            connector: 'HubSpot',
          },
        ],
      },
    ],
  },

  // 5. Analytics deep-dive — advanced widgets (marketing, financial, sales)
  {
    id: 'chat_analytics_deep',
    title: 'Marketing & financial analytics',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    messages: [
      {
        id: 'msg_s4_1',
        role: 'user',
        content: 'Show me a full financial picture — revenue, campaigns, transactions. I want to understand where the money is coming from.',
        timestamp: new Date(Date.now() - 7100000).toISOString(),
      },
      {
        id: 'msg_s4_2',
        role: 'assistant',
        content: 'Here\u2019s your marketing performance overview — active campaigns, reach, engagement, and gross revenue:',
        timestamp: new Date(Date.now() - 7090000).toISOString(),
        toolCalls: [
          { id: 'tc_s4_1', type: 'widget', widgetType: 'metric', size: '1x1', queryRef: 'active-campaigns-total', title: 'Active Campaigns', config: { sparkline: true } },
          { id: 'tc_s4_2', type: 'widget', widgetType: 'metric', size: '1x1', queryRef: 'posts-published', title: 'Posts Published', config: { sparkline: true } },
          { id: 'tc_s4_3', type: 'widget', widgetType: 'metric', size: '1x1', queryRef: 'total-reach', title: 'Total Reach', config: { compact: true } },
          { id: 'tc_s4_4', type: 'widget', widgetType: 'metric', size: '1x1', queryRef: 'avg-engagement', title: 'Avg. Engagement', config: { unit: '%' } },
          { id: 'tc_s4_5', type: 'widget', widgetType: 'stacked-bar-chart', size: '4x2', queryRef: 'gross-revenue', title: 'Gross Revenue', config: { mode: 'overlay' } },
          { id: 'tc_s4_6', type: 'widget', widgetType: 'budget-gauge', size: '4x1', queryRef: 'todays-budget', title: "Today's Budget" },
        ],
      },
      {
        id: 'msg_s4_3',
        role: 'assistant',
        content: 'And here\u2019s your revenue breakdown with a daily trend chart and recent transactions:',
        timestamp: new Date(Date.now() - 7080000).toISOString(),
        toolCalls: [
          { id: 'tc_s4_7', type: 'widget', widgetType: 'sales-overview', size: '4x2', queryRef: 'sales-revenue-overview', title: 'Revenue Overview' },
          { id: 'tc_s4_8', type: 'widget', widgetType: 'sales-transactions', size: '4x2', queryRef: 'sales-transactions-table', title: 'Recent Transactions' },
        ],
      },
      {
        id: 'msg_s4_4',
        role: 'assistant',
        content: '**Summary:** Gross revenue is trending **+17%** vs yesterday. Your budget is at 46% utilization with 14h left in the day. Most active campaigns are driving healthy ROAS across channels.\n\nRevenue per transaction averages **\u20ac67.58** with a 3.2% conversion rate. The Enterprise plan accounts for the highest single-transaction value at \u20ac2,400.\n\nI recommend connecting **HubSpot** to layer your CRM pipeline on top — you\u2019ll be able to forecast deal-stage revenue directly.',
        timestamp: new Date(Date.now() - 7070000).toISOString(),
        toolCalls: [
          {
            id: 'tc_s4_9',
            type: 'suggestion',
            reason: 'Combine financial analytics with CRM pipeline forecasting.',
            connectors: ['HubSpot', 'Salesforce'],
          },
        ],
      },
    ],
  },
];

export const useAppStore = create((set, get) => ({
  devMode: config.devMode,
  demoMode: config.devMode,

  organizations: config.devMode ? mockOrganizations : [emptyOrg],
  currentOrganization: config.devMode ? mockOrganizations[0] : emptyOrg,
  currentWorkspace: null,
  workspaces: config.devMode ? mockWorkspaces.map(normalizeWorkspace) : [],

  // Only two visual scopes: 'organization' and 'project'
  activeScope: 'organization',
  activeSection: 'home',
  activeOrganizationSection: 'stats',
  activeProjectSection: 'analytics',

  activeAnalyticsView: 'servers',
  timeRange: '1h',
  sidebarCollapsed: false,

  chatSessions: config.devMode ? mockChatSessions : [], activeChatId: null, isChatPanelOpen: true,
  organizationsData: [], projectsData: [], agentsData: [],
  integrationsData: [], analyticsData: null, currentUser: null,
  serviceAccounts: [],
  subscription: null,
  accountMetrics: null,
  storageVolumes: [],
  isLoading: false, error: null,
  organizationMetrics: config.devMode ? mockMetrics : emptyMetrics,

  shouldShowMockData: () => get().devMode && get().demoMode,
  shouldFetchApi: () => !get().devMode,

  setActiveSection: (section) =>
    set((state) => ({
      activeSection: section,
      activeOrganizationSection:
        state.activeScope === 'organization' && !transientOrganizationSections.has(section)
          ? section
          : state.activeOrganizationSection,
      activeProjectSection: state.activeScope === 'project' ? section : state.activeProjectSection,
    })),

  setActiveAnalyticsView: (view) => set({ activeAnalyticsView: view }),
  setTimeRange: (timeRange) => set({ timeRange }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  toggleDemoMode: () => {
    const newDemoMode = !get().demoMode;
    set((state) => ({
      demoMode: newDemoMode,
      organizations: newDemoMode ? mockOrganizations : state.organizationsData.length > 0 ? state.organizationsData : [emptyOrg],
      workspaces: newDemoMode
        ? mockWorkspaces.map(normalizeWorkspace)
        : state.projectsData.length > 0
          ? state.projectsData.map(normalizeWorkspace)
          : [],
      currentOrganization: newDemoMode ? mockOrganizations[0] : state.organizationsData[0] || emptyOrg,
      currentWorkspace: null, activeScope: 'organization',
      organizationMetrics: newDemoMode ? mockMetrics : emptyMetrics,
    }));
  },

  login: async (dto) => {
    if (get().devMode) {
      const orgName = getOrganizationNameFromEmail(dto.email);
      const org = { id: `org_${Date.now()}`, name: orgName, slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), owner: dto.email, plan: 'Starter', isDefault: true };
      const workspace = { id: `project_${Date.now()}`, organizationId: org.id, name: `${orgName} Default`, slug: `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-default`, domain: `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.workspace`, status: 'Healthy', monthlyEvents: '0', dataConsumption: '0 GB', lastUpdated: 'just now', connectors: [] };
      set({ currentUser: { id: `user_${Date.now()}`, email: dto.email, roles: ['user'] }, organizations: [org], workspaces: [workspace], currentOrganization: org, currentWorkspace: null, activeScope: 'organization', activeSection: 'home', isLoading: false, error: null });
      return { user: { email: dto.email } };
    }
    set({ isLoading: true, error: null });
    try { const result = await authService.login(dto); set({ currentUser: result.user, isLoading: false }); await get().fetchOrganizations(); return result; }
    catch (err) { set({ error: err.message, isLoading: false }); throw err; }
  },

  register: async (dto) => {
    if (get().devMode) return get().login(dto);
    set({ isLoading: true, error: null });
    try { const result = await authService.register(dto); set({ currentUser: result.user, isLoading: false }); return result; }
    catch (err) { set({ error: err.message, isLoading: false }); throw err; }
  },

  logout: () => {
    authService.logout();
    set({
      currentUser: null,
      organizationsData: [],
      projectsData: [],
      agentsData: [],
      integrationsData: [],
      analyticsData: null,
      serviceAccounts: [],
      subscription: null,
      accountMetrics: null,
      organizations: get().devMode ? mockOrganizations : [emptyOrg],
      workspaces: get().devMode ? mockWorkspaces.map(normalizeWorkspace) : [],
      currentOrganization: get().devMode ? mockOrganizations[0] : emptyOrg,
      currentWorkspace: null,
      activeScope: 'organization',
    });
  },

  fetchOrganizations: async () => { if (get().devMode) return; set({ isLoading: true }); try { const orgs = await organizationService.list(); set({ organizationsData: orgs, organizations: orgs, isLoading: false }); if (orgs.length > 0 && !get().currentOrganization) set({ currentOrganization: orgs[0] }); } catch (err) { set({ error: err.message, isLoading: false }); } },
  fetchProjects: async (orgId) => { if (get().devMode) return; set({ isLoading: true }); try { const projects = (await projectService.list(orgId)).map(normalizeWorkspace); set({ projectsData: projects, workspaces: projects, isLoading: false }); } catch (err) { set({ error: err.message, isLoading: false }); } },
  fetchAgents: async (orgId, projectId) => { if (get().devMode) return; try { set({ agentsData: await agentService.listSessions(orgId, projectId) }); } catch (err) { set({ error: err.message }); } },
  fetchIntegrations: async (orgId, projectId) => { if (get().devMode) return; try { set({ integrationsData: await integrationService.list(orgId, projectId) }); } catch (err) { set({ error: err.message }); } },

  selectOrganization: (organizationId) => {
    const organization = get().organizations.find((item) => item.id === organizationId);
    if (!organization) return;
    set((state) => ({ currentOrganization: organization, currentWorkspace: null, activeScope: 'organization', activeSection: state.activeOrganizationSection || 'stats' }));
    if (!get().devMode) get().fetchProjects(organizationId);
  },

  selectWorkspace: (workspaceId) => {
    const workspace = get().workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;
    const organization = get().organizations.find((item) => item.id === workspace.organizationId);
    set((state) => ({ currentOrganization: organization || state.currentOrganization, currentWorkspace: workspace, activeScope: 'project', activeSection: state.activeProjectSection || 'analytics' }));
    if (!get().devMode && organization) { get().fetchAgents(organization.id, workspaceId); get().fetchIntegrations(organization.id, workspaceId); }
  },

  goToOrganizationHome: () => set((state) => ({ activeScope: 'organization', activeSection: state.activeOrganizationSection || 'stats', currentWorkspace: null })),
  openOrganizationSection: (section) => set({ activeScope: 'organization', activeSection: section, activeOrganizationSection: section }),

  createOrganization: async (name) => {
    if (get().devMode) {
      const id = `org_${Date.now()}`, slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newOrg = { id, name, slug, owner: 'you@example.com', plan: 'Starter' };
      const newWorkspace = { id: `project_${Date.now()}`, organizationId: id, name: `${name} Default`, slug: `${slug}-default`, domain: `${slug}.workspace`, status: 'Healthy', monthlyEvents: '0', dataConsumption: '0 GB', lastUpdated: 'just now', connectors: [] };
      set((state) => ({ organizations: [...state.organizations, newOrg], workspaces: [...state.workspaces, newWorkspace], currentOrganization: newOrg, currentWorkspace: null, activeScope: 'organization', activeSection: 'stats' }));
      return newOrg;
    }
    set({ isLoading: true });
    try { const org = await organizationService.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }); set((state) => ({ organizationsData: [...state.organizationsData, org], organizations: [...state.organizations, org], currentOrganization: org, isLoading: false })); return org; }
    catch (err) { set({ error: err.message, isLoading: false }); throw err; }
  },

  createWorkspace: async (input) => {
    const payload = typeof input === 'string' ? { name: input } : (input || {});
    const name = payload.name?.trim();
    if (!name) {
      throw new Error('Project name is required');
    }
    const slug = payload.slug?.trim() || slugify(name);
    const modules = payload.modules || {
      onboarding: false,
      analytics: true,
      integrations: true,
      graph: true,
      chat: true,
    };

    if (get().devMode) {
      const id = `project_${Date.now()}`;
      const newWorkspace = normalizeWorkspace({
        id,
        slug,
        organizationId: get().currentOrganization.id,
        name,
        description: payload.description || '',
        modules,
      });
      set((state) => ({ workspaces: [...state.workspaces, newWorkspace], currentWorkspace: newWorkspace, activeScope: 'project', activeSection: state.activeProjectSection || 'analytics' }));
      return newWorkspace;
    }
    set({ isLoading: true });
    try {
      const project = normalizeWorkspace(
        await projectService.create(get().currentOrganization.id, {
          name,
          slug,
          description: payload.description || '',
          modules,
        })
      );
      set((state) => ({ projectsData: [...state.projectsData, project], workspaces: [...state.workspaces, project], currentWorkspace: project, isLoading: false }));
      return project;
    }
    catch (err) { set({ error: err.message, isLoading: false }); throw err; }
  },

  deleteOrganization: async (orgId) => {
    if (get().devMode) {
      set((state) => ({
        organizations: state.organizations.filter((o) => o.id !== orgId),
        workspaces: state.workspaces.filter((w) => w.organizationId !== orgId),
        currentOrganization: state.currentOrganization?.id === orgId
          ? (state.organizations.find((o) => o.id !== orgId) || emptyOrg)
          : state.currentOrganization,
      }));
      return;
    }
    set({ isLoading: true });
    try {
      await organizationService.delete(orgId);
      set((state) => ({
        organizationsData: state.organizationsData.filter((o) => o.id !== orgId),
        organizations: state.organizations.filter((o) => o.id !== orgId),
        workspaces: state.workspaces.filter((w) => w.organizationId !== orgId),
        projectsData: state.projectsData.filter((p) => p.organizationId !== orgId),
        currentOrganization: state.currentOrganization?.id === orgId
          ? (state.organizationsData.find((o) => o.id !== orgId) || emptyOrg)
          : state.currentOrganization,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteAccount: async () => {
    if (get().devMode) {
      get().logout();
      return { deleted: true };
    }

    set({ isLoading: true });
    try {
      const result = await authService.deleteAccount();
      get().logout();
      set({ isLoading: false });
      return result;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateOrganization: async (orgId, dto) => {
    if (get().devMode) {
      set((state) => ({
        organizations: state.organizations.map((o) =>
          o.id === orgId ? { ...o, ...dto } : o
        ),
        currentOrganization: state.currentOrganization?.id === orgId
          ? { ...state.currentOrganization, ...dto }
          : state.currentOrganization,
      }));
      return;
    }
    set({ isLoading: true });
    try {
      const updated = await organizationService.update(orgId, dto);
      set((state) => ({
        organizationsData: state.organizationsData.map((o) =>
          o.id === orgId ? { ...o, ...updated } : o
        ),
        organizations: state.organizations.map((o) =>
          o.id === orgId ? { ...o, ...updated } : o
        ),
        currentOrganization: state.currentOrganization?.id === orgId
          ? { ...state.currentOrganization, ...updated }
          : state.currentOrganization,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteProject: async (orgId, projectId) => {
    if (get().devMode) {
      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.id !== projectId),
        currentWorkspace: state.currentWorkspace?.id === projectId ? null : state.currentWorkspace,
        activeScope: state.currentWorkspace?.id === projectId ? 'organization' : state.activeScope,
      }));
      return;
    }
    set({ isLoading: true });
    try {
      await projectService.delete(orgId, projectId);
      set((state) => ({
        projectsData: state.projectsData.filter((p) => p.id !== projectId),
        workspaces: state.workspaces.filter((w) => w.id !== projectId),
        currentWorkspace: state.currentWorkspace?.id === projectId ? null : state.currentWorkspace,
        activeScope: state.currentWorkspace?.id === projectId ? 'organization' : state.activeScope,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  createIntegration: async (orgId, projectId, dto) => {
    if (get().devMode) {
      const integration = { id: `int_${Date.now()}`, ...dto, createdAt: new Date().toISOString() };
      set((state) => ({ integrationsData: [...state.integrationsData, integration] }));
      return integration;
    }
    set({ isLoading: true });
    try {
      const integration = await integrationService.create(orgId, projectId, dto);
      set((state) => ({ integrationsData: [...state.integrationsData, integration], isLoading: false }));
      return integration;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteIntegration: async (orgId, projectId, integrationId) => {
    if (get().devMode) {
      set((state) => ({ integrationsData: state.integrationsData.filter((i) => i.id !== integrationId) }));
      return;
    }
    set({ isLoading: true });
    try {
      await integrationService.delete(orgId, projectId, integrationId);
      set((state) => ({ integrationsData: state.integrationsData.filter((i) => i.id !== integrationId), isLoading: false }));
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateIntegration: async (orgId, projectId, integrationId, dto) => {
    if (get().devMode) {
      set((state) => ({
        integrationsData: state.integrationsData.map((i) =>
          i.id === integrationId ? { ...i, ...dto } : i
        ),
      }));
      return;
    }
    set({ isLoading: true });
    try {
      const updated = await integrationService.update(orgId, projectId, integrationId, dto);
      set((state) => ({
        integrationsData: state.integrationsData.map((i) =>
          i.id === integrationId ? { ...i, ...updated } : i
        ),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════

  fetchStorageVolumes: async (orgId, projectId) => {
    if (get().devMode || get().demoMode) return;
    set({ isLoading: true });
    try {
      const volumes = await storageService.listVolumes(orgId, projectId);
      set({ storageVolumes: volumes, isLoading: false });
      return volumes;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteStorageVolume: async (orgId, projectId, volumeName) => {
    if (get().devMode || get().demoMode) {
      set((state) => ({
        storageVolumes: (state.storageVolumes || []).filter((v) => v.name !== volumeName),
      }));
      return;
    }
    set({ isLoading: true });
    try {
      await storageService.deleteVolume(orgId, projectId, volumeName);
      set((state) => ({
        storageVolumes: (state.storageVolumes || []).filter((v) => v.name !== volumeName),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteStorageFile: async (orgId, projectId, volumeName, filePath) => {
    if (get().devMode || get().demoMode) return;
    set({ isLoading: true });
    try {
      await storageService.deleteFile(orgId, projectId, volumeName, filePath);
      set({ isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  createStorageFolder: async (orgId, projectId, volumeName, folderPath) => {
    if (get().devMode || get().demoMode) return;
    set({ isLoading: true });
    try {
      await storageService.createFolder(orgId, projectId, volumeName, folderPath);
      set({ isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  getStorageUploadUrl: async (orgId, projectId, volumeName, filePath) => {
    if (get().devMode || get().demoMode) return { url: null };
    return storageService.getUploadUrl(orgId, projectId, volumeName, filePath);
  },

  getStorageDownloadUrl: async (orgId, projectId, volumeName, filePath) => {
    if (get().devMode || get().demoMode) return { url: null };
    return storageService.getDownloadUrl(orgId, projectId, volumeName, filePath);
  },

  // ═══════════════════════════════════════════════
  // CONNECTOR SYNC
  // ═══════════════════════════════════════════════

  triggerConnectorSync: async (orgId, projectId, integrationId) => {
    if (get().devMode || get().demoMode) {
      return { status: 'triggered', message: 'Mock sync triggered' };
    }
    set({ isLoading: true });
    try {
      const result = await integrationService.triggerSync(orgId, projectId, integrationId);
      set({ isLoading: false });
      return result;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // SERVICE ACCOUNTS
  // ═══════════════════════════════════════════════

  fetchServiceAccounts: async (orgId) => {
    if (get().devMode) return;
    set({ isLoading: true });
    try {
      const accounts = await serviceAccountService.list(orgId);
      set({ serviceAccounts: accounts, isLoading: false });
      return accounts;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  createServiceAccount: async (orgId, dto) => {
    if (get().devMode) {
      const id = `sa_${Date.now()}`;
      const sa = { id, saId: `sa_${dto.name}_${Math.random().toString(36).substring(2, 6)}`, ...dto, status: 'Active', clientSecret: `sec_live_${Math.random().toString(36).substring(2, 14)}` };
      set((state) => ({ serviceAccounts: [...(state.serviceAccounts || []), sa] }));
      return sa;
    }
    set({ isLoading: true });
    try {
      const sa = await serviceAccountService.create(orgId, dto);
      set((state) => ({ serviceAccounts: [...(state.serviceAccounts || []), sa], isLoading: false }));
      return sa;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateServiceAccount: async (orgId, saId, dto) => {
    if (get().devMode) {
      set((state) => ({
        serviceAccounts: (state.serviceAccounts || []).map((sa) => sa.id === saId ? { ...sa, ...dto } : sa),
      }));
      return;
    }
    set({ isLoading: true });
    try {
      const updated = await serviceAccountService.update(orgId, saId, dto);
      set((state) => ({
        serviceAccounts: (state.serviceAccounts || []).map((sa) => sa.id === saId ? { ...sa, ...updated } : sa),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteServiceAccount: async (orgId, saId) => {
    if (get().devMode) {
      set((state) => ({
        serviceAccounts: (state.serviceAccounts || []).filter((sa) => sa.id !== saId),
      }));
      return;
    }
    set({ isLoading: true });
    try {
      await serviceAccountService.delete(orgId, saId);
      set((state) => ({
        serviceAccounts: (state.serviceAccounts || []).filter((sa) => sa.id !== saId),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // ACCOUNT METRICS
  // ═══════════════════════════════════════════════

  fetchAccountMetrics: async () => {
    if (get().devMode) return get().organizationMetrics;
    set({ isLoading: true });
    try {
      const metrics = await analyticsService.getAccountMetrics();
      set({ accountMetrics: metrics, isLoading: false });
      return metrics;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  fetchOrgMetrics: async (orgId) => {
    if (get().devMode) return get().organizationMetrics;
    set({ isLoading: true });
    try {
      const metrics = await analyticsService.getOrgMetrics(orgId);
      set({ organizationMetrics: metrics, isLoading: false });
      return metrics;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  // ═══════════════════════════════════════════════
  // BILLING
  // ═══════════════════════════════════════════════

  fetchSubscription: async (orgId) => {
    if (get().devMode) return { plan: 'free', status: 'active' };
    try {
      const sub = await billingService.getSubscription(orgId);
      set({ subscription: sub });
      return sub;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  checkoutPlan: async (orgId, plan) => {
    const successUrl = `${window.location.origin}/organizations/${orgId}/billing?success=true`;
    const cancelUrl = `${window.location.origin}/organizations/${orgId}/billing?canceled=true`;
    const result = await billingService.createCheckoutSession(orgId, plan, successUrl, cancelUrl);
    window.location.href = result.url;
  },

  manageBilling: async (orgId) => {
    const returnUrl = `${window.location.origin}/organizations/${orgId}/billing`;
    const result = await billingService.createPortalSession(orgId, returnUrl);
    window.location.href = result.url;
  },

  // ═══════════════════════════════════════════════
  // ALERTS
  // ═══════════════════════════════════════════════

  fetchAlerts: async (orgId, projectId, limit = 20) => {
    if (get().devMode) return [];
    set({ isLoading: true });
    try {
      const alerts = await alertService.list(orgId, projectId, limit);
      set({ alertsData: alerts, isLoading: false });
      return alerts;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  acknowledgeAlert: async (orgId, projectId, alertId) => {
    if (get().devMode) return { acknowledged: true };
    try {
      const result = await alertService.acknowledge(orgId, projectId, alertId);
      set((state) => ({
        alertsData: (state.alertsData || []).map((a) =>
          a.id === alertId ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() } : a
        ),
      }));
      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchHealthReport: async (orgId, projectId) => {
    if (get().devMode) return { status: 'unknown', message: 'No health report yet.' };
    try {
      const report = await alertService.getHealthReport(orgId, projectId);
      set({ healthReport: report });
      return report;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // PROJECT SETTINGS & GCS
  // ═══════════════════════════════════════════════

  fetchProjectSettings: async (orgId, projectId) => {
    if (get().devMode) return {};
    set({ isLoading: true });
    try {
      const settings = await projectService.getSettings(orgId, projectId);
      set({ projectSettings: settings, isLoading: false });
      return settings;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateProjectSettings: async (orgId, projectId, settings) => {
    if (get().devMode) {
      set({ projectSettings: { ...(get().projectSettings || {}), ...settings } });
      return get().projectSettings;
    }
    set({ isLoading: true });
    try {
      const updated = await projectService.updateSettings(orgId, projectId, settings);
      set({ projectSettings: updated, isLoading: false });
      return updated;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  getGcsSignedUrl: async (orgId, projectId, filename, action = 'read') => {
    if (get().devMode) return `https://storage.googleapis.com/mock-bucket/${filename}`;
    try {
      const url = await projectService.getGcsSignedUrl(orgId, projectId, filename, action);
      return url;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  generatePublicLink: async (orgId, projectId) => {
    if (get().devMode) {
      const mockToken = 'mock_' + Math.random().toString(36).substring(2, 10);
      const mockUrl = `${window.location.origin}/p/${mockToken}`;
      const mockLink = { token: mockToken, url: mockUrl, createdAt: new Date().toISOString() };
      set({
        workspaces: get().workspaces.map(w =>
          w.id === projectId ? { ...w, publicLink: mockLink } : w
        ),
        currentWorkspace: get().currentWorkspace?.id === projectId
          ? { ...get().currentWorkspace, publicLink: mockLink }
          : get().currentWorkspace,
      });
      return mockLink;
    }
    set({ isLoading: true });
    try {
      const result = await projectService.generatePublicLink(orgId, projectId);
      set({
        workspaces: get().workspaces.map(w =>
          w.id === projectId ? { ...w, publicLink: result } : w
        ),
        currentWorkspace: get().currentWorkspace?.id === projectId
          ? { ...get().currentWorkspace, publicLink: result }
          : get().currentWorkspace,
        isLoading: false,
      });
      return result;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  revokePublicLink: async (orgId, projectId) => {
    if (get().devMode) {
      set({
        workspaces: get().workspaces.map(w =>
          w.id === projectId ? { ...w, publicLink: null } : w
        ),
        currentWorkspace: get().currentWorkspace?.id === projectId
          ? { ...get().currentWorkspace, publicLink: null }
          : get().currentWorkspace,
      });
      return { revoked: true };
    }
    set({ isLoading: true });
    try {
      const result = await projectService.revokePublicLink(orgId, projectId);
      set({
        workspaces: get().workspaces.map(w =>
          w.id === projectId ? { ...w, publicLink: null } : w
        ),
        currentWorkspace: get().currentWorkspace?.id === projectId
          ? { ...get().currentWorkspace, publicLink: null }
          : get().currentWorkspace,
        isLoading: false,
      });
      return result;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  regeneratePublicLink: async (orgId, projectId) => {
    if (get().devMode) {
      const mockToken = 'mock_' + Math.random().toString(36).substring(2, 10);
      const mockUrl = `${window.location.origin}/p/${mockToken}`;
      const mockLink = { token: mockToken, url: mockUrl, createdAt: new Date().toISOString() };
      set({
        workspaces: get().workspaces.map(w =>
          w.id === projectId ? { ...w, publicLink: mockLink } : w
        ),
        currentWorkspace: get().currentWorkspace?.id === projectId
          ? { ...get().currentWorkspace, publicLink: mockLink }
          : get().currentWorkspace,
      });
      return mockLink;
    }
    set({ isLoading: true });
    try {
      const result = await projectService.regeneratePublicLink(orgId, projectId);
      set({
        workspaces: get().workspaces.map(w =>
          w.id === projectId ? { ...w, publicLink: result } : w
        ),
        currentWorkspace: get().currentWorkspace?.id === projectId
          ? { ...get().currentWorkspace, publicLink: result }
          : get().currentWorkspace,
        isLoading: false,
      });
      return result;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // INTEGRATION AUTH & DEPLOY
  // ═══════════════════════════════════════════════

  fetchIntegrationCatalog: async (orgId, projectId) => {
    if (get().devMode) return connectorsData;
    try {
      return await integrationService.getCatalog(orgId, projectId);
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  fetchConnectorAuthConfig: async (orgId, projectId, connectorName) => {
    if (get().devMode) {
      const mockConfigs = {
        Stripe: { method: 'API Key', fields: [{ key: 'apiKey', label: 'Secret Key', type: 'password' }] },
        GA4: { method: 'OAuth 2.0', fields: [{ key: 'propertyId', label: 'Property ID', type: 'text' }] },
        'Search Console': { method: 'OAuth 2.0', fields: [{ key: 'siteUrl', label: 'Site URL', type: 'text' }] },
        'Google Ads': { method: 'OAuth 2.0', fields: [{ key: 'customerId', label: 'Customer ID', type: 'text' }] },
        'Meta Ads': { method: 'OAuth 2.0', fields: [{ key: 'adAccountId', label: 'Ad Account ID', type: 'text' }, { key: 'accessToken', label: 'Access Token', type: 'password' }] },
        'TikTok Ads': { method: 'OAuth 2.0', fields: [{ key: 'advertiserId', label: 'Advertiser ID', type: 'text' }, { key: 'accessToken', label: 'Access Token', type: 'password' }] },
        Shopify: { method: 'API Key', fields: [{ key: 'shopDomain', label: 'Shop Domain', type: 'text' }, { key: 'apiKey', label: 'API Key', type: 'password' }] },
        WooCommerce: { method: 'API Key', fields: [{ key: 'storeUrl', label: 'Store URL', type: 'text' }, { key: 'consumerKey', label: 'Consumer Key', type: 'password' }, { key: 'consumerSecret', label: 'Consumer Secret', type: 'password' }] },
        HubSpot: { method: 'API Key', fields: [{ key: 'apiKey', label: 'Private App Token', type: 'password' }] },
        Salesforce: { method: 'OAuth 2.0', fields: [{ key: 'clientId', label: 'Client ID', type: 'text' }, { key: 'clientSecret', label: 'Client Secret', type: 'password' }, { key: 'instanceUrl', label: 'Instance URL', type: 'text' }] },
        PostHog: { method: 'API Key', fields: [{ key: 'apiKey', label: 'Personal API Key', type: 'password' }, { key: 'projectId', label: 'Project ID', type: 'text' }] },
        Klaviyo: { method: 'API Key', fields: [{ key: 'apiKey', label: 'Private API Key', type: 'password' }] },
        Sentry: { method: 'API Key', fields: [{ key: 'authToken', label: 'Auth Token', type: 'password' }, { key: 'organizationSlug', label: 'Organization Slug', type: 'text' }] },
        PostgreSQL: { method: 'Database Credentials', fields: [{ key: 'host', label: 'Host', type: 'text' }, { key: 'port', label: 'Port', type: 'text' }, { key: 'database', label: 'Database', type: 'text' }, { key: 'username', label: 'Username', type: 'text' }, { key: 'password', label: 'Password', type: 'password' }] },
        MySQL: { method: 'Database Credentials', fields: [{ key: 'host', label: 'Host', type: 'text' }, { key: 'port', label: 'Port', type: 'text' }, { key: 'database', label: 'Database', type: 'text' }, { key: 'username', label: 'Username', type: 'text' }, { key: 'password', label: 'Password', type: 'password' }] },
        MongoDB: { method: 'Database Credentials', fields: [{ key: 'uri', label: 'Connection URI', type: 'text' }, { key: 'database', label: 'Database', type: 'text' }] },
        Prometheus: { method: 'None', fields: [{ key: 'url', label: 'Prometheus URL', type: 'text' }] },
        BigQuery: { method: 'Service Account', fields: [{ key: 'serviceAccountKey', label: 'Service Account JSON', type: 'textarea' }] },
      };
      return mockConfigs[connectorName] || { method: 'API Key', fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }] };
    }
    try {
      return await connectorAuthService.getAuthConfig(orgId, projectId, connectorName);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  deployConnector: async (orgId, projectId, connectorName, credentials) => {
    if (get().devMode) return { deployed: true, connectorName };
    set({ isLoading: true });
    try {
      const result = await connectorAuthService.deployConnector(orgId, projectId, connectorName, credentials);
      set({ isLoading: false });
      return result;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // AGENT CREDENTIALS
  // ═══════════════════════════════════════════════

  fetchAgentCredentials: async (orgId, projectId) => {
    if (get().devMode) return { bucket: 'mock-bucket', prefix: `specs/${orgId}/${projectId}` };
    try {
      return await agentService.getCredentials(orgId, projectId);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════

  fetchDashboardMetrics: async (orgId, projectId) => {
    if (get().devMode) return get().organizationMetrics;
    set({ isLoading: true });
    try {
      const metrics = await analyticsService.getDashboardMetrics(orgId, projectId);
      set({ analyticsData: metrics, isLoading: false });
      return metrics;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  runAnalyticsQuery: async (orgId, projectId, sql) => {
    if (get().devMode) return { rows: [], columns: [] };
    try {
      return await analyticsService.query(orgId, projectId, sql);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // SPECS / DATA CATALOG
  // ═══════════════════════════════════════════════

  fetchSpec: async (orgId, projectId, viewId = 'servers') => {
    if (get().devMode) return null;
    try {
      return await specService.getSpec(orgId, projectId, viewId);
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  generateSpec: async (orgId, projectId) => {
    if (get().devMode) return { message: 'Demo mode — spec generation simulated' };
    try {
      return await specService.generateSpec(orgId, projectId);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchDataCatalog: async (orgId, projectId) => {
    if (get().devMode) return null;
    try {
      return await specService.getDataCatalog(orgId, projectId);
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  fetchMindmap: async (orgId, projectId) => {
    if (get().devMode) return null;
    try {
      return await specService.getMindmap(orgId, projectId);
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  fetchViewBindings: async (orgId, projectId) => {
    if (get().devMode) return null;
    try {
      return await specService.getBindings(orgId, projectId);
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  updateViewBindings: async (orgId, projectId, patch) => {
    if (get().devMode) return { updated: true };
    try {
      return await specService.updateBindings(orgId, projectId, patch);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  invalidateSpec: async (orgId, projectId) => {
    if (get().devMode) return { invalidated: true };
    try {
      return await specService.invalidateSpec(orgId, projectId);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // SERVICE ACCOUNTS (extra methods)
  // ═══════════════════════════════════════════════

  getServiceAccount: async (orgId, saId) => {
    if (get().devMode) return (get().serviceAccounts || []).find((sa) => sa.id === saId);
    try {
      return await serviceAccountService.get(orgId, saId);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  regenerateServiceAccountSecret: async (orgId, saId) => {
    if (get().devMode) {
      const newSecret = `sec_live_${Math.random().toString(36).substring(2, 14)}`;
      set((state) => ({
        serviceAccounts: (state.serviceAccounts || []).map((sa) =>
          sa.id === saId ? { ...sa, clientSecret: newSecret } : sa
        ),
      }));
      return { clientSecret: newSecret };
    }
    try {
      const result = await serviceAccountService.regenerateSecret(orgId, saId);
      set((state) => ({
        serviceAccounts: (state.serviceAccounts || []).map((sa) =>
          sa.id === saId ? { ...sa, clientSecret: result.clientSecret || result.secret } : sa
        ),
      }));
      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // ═══════════════════════════════════════════════
  // CHAT TOOL RESPONSE
  // ═══════════════════════════════════════════════

  submitToolResponse: async (orgId, projectId, toolCallId, toolName, payload) => {
    if (get().devMode) {
      return { success: true, data: { toolCallId, result: { type: 'mock', message: 'Demo mode — tool response simulated' } } };
    }
    const response = await apiClient.post(`/organizations/${orgId}/projects/${projectId}/chat/tool-response`, {
      toolCallId,
      toolName,
      payload,
    });
    return response.data;
  },

  createChatSession: (title = 'New Chat') => { const session = { id: `chat_${Date.now()}`, title, messages: [], createdAt: new Date().toISOString() }; set((state) => ({ chatSessions: [...state.chatSessions, session], activeChatId: session.id })); return session; },
  selectChat: (chatId) => set({ activeChatId: chatId }),
  deleteChatSession: (chatId) => set((state) => { const filtered = state.chatSessions.filter((chat) => chat.id !== chatId); return { chatSessions: filtered, activeChatId: state.activeChatId === chatId ? filtered[0]?.id || null : state.activeChatId }; }),
  addMessage: (chatId, message) => set((state) => ({ chatSessions: state.chatSessions.map((chat) => chat.id === chatId ? { ...chat, messages: [...chat.messages, { id: `msg_${Date.now()}`, ...message, timestamp: new Date().toISOString() }] } : chat) })),
  updateToolStatus: (chatId, messageId, toolIdx, status) => set((state) => ({ chatSessions: state.chatSessions.map((chat) => {
    if (chat.id !== chatId) return chat;
    return { ...chat, messages: chat.messages.map((msg) => {
      if (msg.id !== messageId || !msg.toolCalls) return msg;
      const newToolCalls = [...msg.toolCalls];
      if (newToolCalls[toolIdx]) newToolCalls[toolIdx] = { ...newToolCalls[toolIdx], status };
      return { ...msg, toolCalls: newToolCalls };
    })};
  }) })),
}));
