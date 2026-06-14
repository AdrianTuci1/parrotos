import { gcpService } from './GcpService.js';
import { OrganizationService } from './OrganizationService.js';
import { ProjectService } from './ProjectService.js';

export class OrganizationMetricsService {
  constructor() {
    this.gcp = gcpService;
    this.orgService = new OrganizationService();
    this.projectService = new ProjectService();
  }

  // ═══════════════════════════════════════════════
  // ACCOUNT-LEVEL METRICS (for OrganizationHomeView)
  // ═══════════════════════════════════════════════
  async getAccountMetrics(accountId) {
    const orgs = await this.orgService.findByAccount(accountId);

    let totalProjects = 0;
    let totalEvents = 0;
    let totalStorage = 0;
    let healthyProjects = 0;
    const uniqueConnectors = new Set();
    const allProjects = [];

    for (const org of orgs) {
      const projects = await this.orgService.findProjectsByOrg(org.id);
      totalProjects += projects.length;

      for (const project of projects) {
        allProjects.push({ ...project, orgId: org.id, orgName: org.name });

        if (project.status === 'Healthy') healthyProjects++;

        const events = parseFloat(project.monthlyEvents?.replace(/[^0-9.]/g, '') || '0');
        const mult = project.monthlyEvents?.includes('K') ? 1000 : 1;
        totalEvents += isNaN(events) ? 0 : events * mult;

        const storage = parseFloat(project.dataConsumption?.replace(/[^0-9.]/g, '') || '0');
        totalStorage += isNaN(storage) ? 0 : storage;

        (project.connectors || []).forEach((c) => uniqueConnectors.add(c));
      }
    }

    return {
      organizations: orgs.length,
      totalProjects,
      healthyProjects,
      totalEvents: Math.round(totalEvents),
      totalStorage: Math.round(totalStorage),
      uniqueConnectors: uniqueConnectors.size,
      connectors: Array.from(uniqueConnectors),
      // Activity computed from real projects
      recentActivity: this._buildRecentActivity(allProjects),
      orgsList: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.plan || 'Starter',
        projectCount: allProjects.filter((p) => p.orgId === o.id).length,
      })),
    };
  }

  // ═══════════════════════════════════════════════
  // ORG-LEVEL METRICS (for OrganizationStatsView)
  // ═══════════════════════════════════════════════
  async getOrgMetrics(orgId) {
    const org = await this.orgService.findById(orgId);
    const projects = await this.orgService.findProjectsByOrg(orgId);

    let totalEvents = 0;
    let totalStorage = 0;
    let healthyCount = 0;
    const connectorCounts = {};
    const allConnectors = [];

    for (const project of projects) {
      if (project.status === 'Healthy') healthyCount++;

      const events = parseFloat(project.monthlyEvents?.replace(/[^0-9.]/g, '') || '0');
      const mult = project.monthlyEvents?.includes('K') ? 1000 : 1;
      totalEvents += isNaN(events) ? 0 : events * mult;

      const storage = parseFloat(project.dataConsumption?.replace(/[^0-9.]/g, '') || '0');
      totalStorage += isNaN(storage) ? 0 : storage;

      (project.connectors || []).forEach((c) => {
        connectorCounts[c] = (connectorCounts[c] || 0) + 1;
        allConnectors.push(c);
      });
    }

    const uniqueConnectors = Object.keys(connectorCounts);
    const topConnector = uniqueConnectors.length > 0
      ? uniqueConnectors.reduce((a, b) => connectorCounts[a] > connectorCounts[b] ? a : b)
      : null;

    const maxCount = topConnector ? connectorCounts[topConnector] : 1;
    const connectorUsage = uniqueConnectors
      .map((name) => ({
        name,
        count: connectorCounts[name],
        share: Math.round((connectorCounts[name] / maxCount) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan || 'Starter',
      },
      projects: {
        total: projects.length,
        healthy: healthyCount,
        monitoring: projects.length - healthyCount,
      },
      events: {
        total: Math.round(totalEvents),
        formatted: totalEvents >= 1000 ? `${(totalEvents / 1000).toFixed(1)}K` : String(Math.round(totalEvents)),
      },
      storage: {
        total: Math.round(totalStorage),
        formatted: `${totalStorage.toFixed(1)} GB`,
      },
      compute: {
        // Monthly compute in GB (not price)
        value: `${(totalStorage * 0.05).toFixed(1)} GB`,
        detail: 'BigQuery + orchestration',
        trend: '-8.1%',
      },
      connectedSources: {
        value: String(uniqueConnectors.length),
        detail: `${uniqueConnectors.length > 0 ? uniqueConnectors[0] : 'None'} most used`,
        trend: '+12%',
      },
      topConnector: {
        value: topConnector || 'None',
        detail: topConnector ? `${connectorCounts[topConnector]} projects` : 'No connectors',
        trend: '+5%',
      },
      connectorUsage,
      projectList: projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        domain: p.domain || p.slug + '.com',
        status: p.status || 'Healthy',
        monthlyEvents: p.monthlyEvents || '0',
        dataConsumption: p.dataConsumption || '0GB',
        connectors: p.connectors || [],
      })),
      recentActivity: this._buildProjectActivity(projects),
    };
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════
  _buildRecentActivity(allProjects) {
    // Sort by updatedAt to get most recent
    const sorted = [...allProjects].sort((a, b) => {
      const da = new Date(a.updatedAt || 0);
      const db = new Date(b.updatedAt || 0);
      return db - da;
    });

    const activity = [];

    // Most recently updated project
    if (sorted[0]) {
      activity.push({
        title: 'Project updated',
        meta: `${sorted[0].name} in ${sorted[0].orgName}`,
      });
    }

    // Connector activity
    const allConnectors = sorted.flatMap((p) => (p.connectors || []).map((c) => ({ name: c, project: p.name })));
    if (allConnectors.length > 0) {
      const first = allConnectors[0];
      activity.push({
        title: 'Connector active',
        meta: `${first.name} connected to ${first.project}`,
      });
    }

    // Newest project
    const newest = [...sorted].sort((a, b) => {
      const da = new Date(a.createdAt || 0);
      const db = new Date(b.createdAt || 0);
      return db - da;
    })[0];
    if (newest) {
      activity.push({
        title: 'New project created',
        meta: `${newest.name} added to ${newest.orgName}`,
      });
    }

    return activity.length > 0 ? activity : [
      { title: 'No recent activity', meta: 'Projects will show activity here' },
    ];
  }

  _buildProjectActivity(projects) {
    const sorted = [...projects].sort((a, b) => {
      const da = new Date(a.updatedAt || 0);
      const db = new Date(b.updatedAt || 0);
      return db - da;
    });

    const activity = [];

    if (sorted[0]) {
      activity.push({
        title: 'Project updated',
        meta: `${sorted[0].name} configuration changed`,
      });
    }

    const withConnectors = sorted.filter((p) => (p.connectors || []).length > 0);
    if (withConnectors[0]) {
      activity.push({
        title: 'Connector synced',
        meta: `${withConnectors[0].connectors[0]} data refreshed`,
      });
    }

    const newest = [...projects].sort((a, b) => {
      const da = new Date(a.createdAt || 0);
      const db = new Date(b.createdAt || 0);
      return db - da;
    })[0];
    if (newest) {
      activity.push({
        title: 'Project created',
        meta: `${newest.name} added to organization`,
      });
    }

    return activity.length > 0 ? activity : [
      { title: 'No recent activity', meta: 'Activity will appear here' },
    ];
  }
}

export const organizationMetricsService = new OrganizationMetricsService();
