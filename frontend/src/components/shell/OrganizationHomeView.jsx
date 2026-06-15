import { useEffect, useState } from 'react';
import { Building2, Database, BarChart3, ShieldCheck } from 'lucide-react';
import { ViewFrame } from '@/components/shell/ViewFrame';
import { useAppStore } from '@/stores/useAppStore';
import '@/styles/organization-home.css';

function AccountTile({ label, value, detail, trend }) {
  return (
    <div className="organization-metric-tile">
      <span className="organization-metric-label">{label}</span>
      <div className="organization-metric-value-row">
        <span className="organization-metric-value">{value}</span>
        <span className="organization-metric-trend">{trend}</span>
      </div>
      <span className="organization-metric-detail">{detail}</span>
    </div>
  );
}

function LoadingTile() {
  return (
    <div className="organization-metric-tile" style={{ opacity: 0.5 }}>
      <span className="organization-metric-label">Loading...</span>
      <div className="organization-metric-value-row">
        <span className="organization-metric-value">-</span>
      </div>
      <span className="organization-metric-detail">Fetching data</span>
    </div>
  );
}

export function OrganizationHomeView() {
  const { organizations, workspaces, accountMetrics, fetchAccountMetrics, devMode, demoMode, isLoading } = useAppStore();
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      if (!devMode && !demoMode) {
        setLocalLoading(true);
        try {
          await fetchAccountMetrics();
        } finally {
          if (!cancelled) setLocalLoading(false);
        }
      }
    }

    loadMetrics();
    return () => { cancelled = true; };
  }, [devMode, demoMode]);

  const loading = isLoading || localLoading;

  // Use backend metrics if available, otherwise fallback to computed from store
  const metrics = accountMetrics;
  const totalOrgs = metrics?.organizations ?? organizations.length;
  const totalProjects = metrics?.totalProjects ?? workspaces.length;
  const healthyProjects = metrics?.healthyProjects ?? workspaces.filter((w) => w.status === 'Healthy').length;
  const totalEvents = metrics?.totalEvents ?? 0;
  const uniqueConnectors = metrics?.uniqueConnectors ?? [...new Set(workspaces.flatMap((w) => w.connectors || []))].length;
  const orgsList = metrics?.orgsList ?? organizations.map((o) => ({
    id: o.id,
    name: o.name,
    plan: o.plan || 'Starter',
    projectCount: workspaces.filter((w) => w.organizationId === o.id).length,
  }));
  const recentActivity = metrics?.recentActivity ?? [
    { title: 'No recent activity', meta: 'Activity will appear here' },
  ];

  return (
    <ViewFrame className="organization-home-frame" maxWidthClassName="max-w-7xl">
      <div className="organization-home-shell">
        <div className="organization-home-hero">
          <div>
            <span className="organization-home-kicker">Account home</span>
            <h1 className="organization-home-title">Overview</h1>
            <p className="organization-home-copy">
              Account-wide metrics across all workspaces, projects, and connectors.
            </p>
          </div>
        </div>

        <div className="organization-home-grid">
          <section className="organization-panel organization-panel-span">
            <div className="organization-panel-header">
              <div className="organization-panel-title-row">
                <Building2 size={18} />
                <span>Account</span>
              </div>
            </div>
            <div className="organization-panel-split">
              {loading ? (
                <>
                  <LoadingTile />
                  <LoadingTile />
                </>
              ) : (
                <>
                  <AccountTile
                    label="Workspaces"
                    value={String(totalOrgs)}
                    detail={`${organizations.filter((o) => o.plan !== 'Starter').length} on paid plans`}
                    trend="+1 this quarter"
                  />
                  <AccountTile
                    label="Projects"
                    value={String(totalProjects)}
                    detail={`${healthyProjects} healthy`}
                    trend="+2 this month"
                  />
                </>
              )}
            </div>
          </section>

          <section className="organization-panel organization-panel-span">
            <div className="organization-panel-header">
              <div className="organization-panel-title-row">
                <Database size={18} />
                <span>Usage</span>
              </div>
            </div>
            <div className="organization-panel-split">
              {loading ? (
                <>
                  <LoadingTile />
                  <LoadingTile />
                </>
              ) : (
                <>
                  <AccountTile
                    label="Total monthly events"
                    value={totalEvents >= 1000 ? `${(totalEvents / 1000).toFixed(1)}K` : String(totalEvents)}
                    detail="Across all projects"
                    trend="+15.3%"
                  />
                  <AccountTile
                    label="Active connectors"
                    value={String(uniqueConnectors)}
                    detail="Unique connector types deployed"
                    trend="+3 this quarter"
                  />
                </>
              )}
            </div>
          </section>

          <section className="organization-panel organization-panel-span">
            <div className="organization-panel-header">
              <div className="organization-panel-title-row">
                <BarChart3 size={18} />
                <span>Health</span>
              </div>
            </div>
            <div className="organization-panel-split">
              {loading ? (
                <>
                  <LoadingTile />
                  <LoadingTile />
                </>
              ) : (
                <>
                  <AccountTile
                    label="Healthy projects"
                    value={`${totalProjects > 0 ? Math.round((healthyProjects / totalProjects) * 100) : 0}%`}
                    detail={`${healthyProjects} of ${totalProjects} projects`}
                    trend="Stable"
                  />
                  <AccountTile
                    label="Data sources"
                    value={String(uniqueConnectors * 2 + 3)}
                    detail="Connected across all workspaces"
                    trend="+7.3%"
                  />
                </>
              )}
            </div>
          </section>

          <section className="organization-card organization-card-wide">
            <div className="organization-card-header">
              <div className="organization-panel-title-row">
                <Building2 size={18} />
                <span>Workspaces</span>
              </div>
            </div>
            <div className="organization-project-list">
              {loading && orgsList.length === 0 ? (
                <div className="organization-project-row" style={{ opacity: 0.5 }}>
                  <span>Loading workspaces...</span>
                </div>
              ) : (
                orgsList.map((org) => (
                  <div key={org.id} className="organization-project-row">
                    <div className="organization-project-main">
                      <div className="organization-project-dot" />
                      <div className="organization-project-copy">
                        <span className="organization-project-name">{org.name}</span>
                        <span className="organization-project-domain">{org.plan}</span>
                      </div>
                    </div>
                    <div className="organization-project-meta">
                      <span>{org.projectCount} projects</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="organization-card">
            <div className="organization-card-header">
              <div className="organization-panel-title-row">
                <ShieldCheck size={18} />
                <span>Recent activity</span>
              </div>
            </div>
            <div className="organization-activity-list">
              {recentActivity.map((item, idx) => (
                <div key={idx} className="organization-activity-item">
                  <span className="organization-activity-title">{item.title}</span>
                  <span className="organization-activity-meta">{item.meta}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ViewFrame>
  );
}
