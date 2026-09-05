// Organization-level sub-navbar items (workspace landing + management)
export const orgSections = ['stats', 'access', 'org-settings', 'metrics', 'invitations'];

// Project-level sub-navbar items
export const projectSections = [
  'explore',
  'dashboard',
  'analytics',
  'canvas',
  'files',
  'storage',
  'graph',
  'chat',
  'ai',
  'settings',
];

export const analyticsViews = [
  { id: 'servers', label: 'Servers' },
  { id: 'financial', label: 'Financial' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'web', label: 'Web' },
];

// Project artifact sections, ordered to mirror Rill's artifact-level navigation.
export const projectNavItems = [
  { id: 'explore', title: 'Explore', icon: 'bar-chart-3' },
  { id: 'dashboard', title: 'Dashboards', icon: 'layout-dashboard' },
  { id: 'analytics', title: 'Analytics', icon: 'briefcase' },
  { id: 'canvas', title: 'Canvas', icon: 'git-branch' },
  { id: 'files', title: 'Files', icon: 'files' },
  { id: 'storage', title: 'Storage', icon: 'database' },
  { id: 'graph', title: 'Graph', icon: 'git-branch' },
  { id: 'chat', title: 'Chat', icon: 'message-square' },
  { id: 'ai', title: 'AI', icon: 'sparkles' },
  { id: 'settings', title: 'Settings', icon: 'settings' },
];

// Organization-level navigation items.
export const orgNavItems = [
  { id: 'stats', title: 'Overview', icon: 'layout-dashboard' },
  { id: 'access', title: 'Access', icon: 'users' },
  { id: 'org-settings', title: 'Workspace Settings', icon: 'settings' },
];

/**
 * Build the sidebar navigation groups for a scope ('project' | 'organization').
 * Each group is `{ id, label, items: [{ id, title, icon }] }`, matching the shape
 * consumed by `app-sidebar.jsx` / `layout/Sidebar.jsx`.
 */
export function getNavigationGroups(scope) {
  if (scope === 'project') {
    return [{ id: 'project', label: 'Project', items: projectNavItems }];
  }
  return [{ id: 'org', label: 'Workspace', items: orgNavItems }];
}

export function findSectionById(scope, sectionId) {
  const list = scope === 'project' ? projectSections : orgSections;
  const label = sectionId === 'org-settings' ? 'Workspace Settings' : sectionId;
  return list.includes(sectionId) ? { id: sectionId, title: label } : null;
}
