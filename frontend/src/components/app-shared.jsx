// Organization-level sidebar (shows account items + org items)
// Account items have no org in URL, org items do
export const organizationNavigationGroups = [
  {
    id: 'account-general',
    label: 'Account',
    items: [
      { id: 'home', title: 'Home', icon: 'layout-dashboard' },
      { id: 'organizations', title: 'Organizations', icon: 'briefcase' },
      { id: 'billing', title: 'Billing', icon: 'credit-card' },
    ],
  },
  {
    id: 'organization-management',
    label: 'Organization',
    items: [
      { id: 'stats', title: 'Stats', icon: 'bar-chart-3' },
      { id: 'access', title: 'Access Management', icon: 'users' },
      { id: 'settings', title: 'Settings', icon: 'settings' },
    ],
  },
];

// Project-level sidebar (chat is accessed via Chat History in sidebar, not as a nav item)
export const projectNavigationGroups = [
  {
    id: 'project',
    label: null,
    items: [
      { id: 'analytics', title: 'Analytics', icon: 'bar-chart-3' },
      { id: 'sources', title: 'Sources', icon: 'plug' },
      { id: 'destinations', title: 'Destinations', icon: 'arrow-right-from-line' },
      { id: 'storage', title: 'Storage', icon: 'database' },
      { id: 'graph', title: 'Graph', icon: 'git-branch' },
      { id: 'settings', title: 'Project Settings', icon: 'settings' },
    ],
  },
];

export const analyticsViews = [
  { id: 'servers', label: 'Servers' },
  { id: 'financial', label: 'Financial' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'web', label: 'Web' },
];

const auxiliarySections = {
  organization: [
    { id: 'create-project', title: 'Create Project', icon: 'briefcase' },
  ],
  project: [],
};

export function getNavigationGroups(scope) {
  return scope === 'project' ? projectNavigationGroups : organizationNavigationGroups;
}

export function findSectionById(scope, sectionId) {
  return (
    getNavigationGroups(scope).flatMap((g) => g.items).find((item) => item.id === sectionId) ||
    auxiliarySections[scope]?.find((item) => item.id === sectionId)
  );
}

// Account items (no org in URL): /app/home, /app/organizations, /app/billing
export const accountSections = ['home', 'organizations', 'billing'];
// Org items (with org in URL): /app/:orgSlug/stats, etc.
export const orgSections = ['stats', 'access', 'settings', 'create-project'];
export const projectSections = ['analytics', 'sources', 'destinations', 'storage', 'graph', 'settings', 'chat'];
