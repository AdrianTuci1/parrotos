// Organization-level sub-navbar items (workspace landing + management)
export const orgSections = ['stats', 'access', 'org-settings'];

// Project-level sub-navbar items
export const projectSections = ['analytics', 'sources', 'destinations', 'storage', 'graph', 'chat', 'settings'];

export const analyticsViews = [
  { id: 'servers', label: 'Servers' },
  { id: 'financial', label: 'Financial' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'web', label: 'Web' },
];

export function findSectionById(scope, sectionId) {
  const list = scope === 'project' ? projectSections : orgSections;
  const label = sectionId === 'org-settings' ? 'Workspace Settings' : sectionId;
  return list.includes(sectionId) ? { id: sectionId, title: label } : null;
}
