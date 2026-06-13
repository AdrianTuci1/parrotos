import { useEffect } from 'react';
import { Building2, BarChart3, Database, ShieldCheck } from 'lucide-react';
import { ViewFrame } from '@/components/shell/ViewFrame';
import { useAppStore } from '@/stores/useAppStore';
import '@/styles/organization-home.css';

function MetricTile({ label, value, detail, trend }) {
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

const emptyOrg = { id: '__empty__', name: 'My Organization', slug: 'my-org', plan: 'Starter' };

export function OrganizationStatsView() {
  const { currentOrganization, workspaces, organizationMetrics, fetchDashboardMetrics, demoMode, devMode } = useAppStore();
  const org = currentOrganization || emptyOrg;
  const orgProjects = workspaces.filter(
    (w) => w.organizationId === org.id
  );

  // Fetch real metrics from backend when not in demo mode
  useEffect(() => {
    if (!devMode && !demoMode && org.id && orgProjects.length > 0) {
      // Fetch metrics for the first project as org-level aggregate
      fetchDashboardMetrics(org.id, orgProjects[0].id);
    }
  }, [devMode, demoMode, org.id, orgProjects.length]);

  const totalEvents = orgProjects.reduce((sum, w) => {
    const num = parseInt(w.monthlyEvents.replace(/[^0-9.]/g, ''));
    const mult = w.monthlyEvents.includes('K') ? 1000 : 1;
    return sum + (isNaN(num) ? 0 : num * mult);
  }, 0);
  const totalConsumption = orgProjects.reduce((sum, w) => {
    const num = parseInt(w.dataConsumption.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <ViewFrame className="organization-home-frame" maxWidthClassName="max-w-7xl">
      <div className="organization-home-shell">
        <div className="organization-home-hero">
          <div>
            <span className="organization-home-kicker">{org.name}</span>
            <h1 className="organization-home-title">Stats</h1>
            <p className="organization-home-copy">
              Usage, consumption, and activity metrics for this organization.
            </p>
          </div>
        </div>

        <div className="organization-home-grid">
          <section className="organization-panel organization-panel-span">
            <div className="organization-panel-header">
              <div className="organization-panel-title-row">
                <Building2 size={18} />
                <span>Projects</span>
              </div>
            </div>
            <div className="organization-panel-split">
              <MetricTile
                label="Active projects"
                value={String(orgProjects.length)}
                detail={`${orgProjects.filter((w) => w.status === 'Healthy').length} healthy, ${orgProjects.filter((w) => w.status !== 'Healthy').length} monitoring`}
                trend="+2 this month"
              />
              <MetricTile
                label="Monthly events"
                value={totalEvents >= 1000 ? `${(totalEvents / 1000).toFixed(1)}K` : String(totalEvents)}
                detail="Across all projects"
                trend="+12.4%"
              />
            </div>
          </section>

          <section className="organization-panel organization-panel-span">
            <div className="organization-panel-header">
              <div className="organization-panel-title-row">
                <Database size={18} />
                <span>Consumption</span>
              </div>
            </div>
            <div className="organization-panel-split">
              <MetricTile
                label="Warehouse consumption"
                value={`${totalConsumption} GB`}
                detail="Raw + modeled layers"
                trend="+8.1%"
              />
              <MetricTile
                label="Monthly compute"
                value="$2.4k"
                detail="BigQuery + orchestration"
                trend="-8.1%"
              />
            </div>
          </section>

          <section className="organization-panel organization-panel-span">
            <div className="organization-panel-header">
              <div className="organization-panel-title-row">
                <BarChart3 size={18} />
                <span>Activity</span>
              </div>
            </div>
            <div className="organization-panel-split">
              <MetricTile
                label="Connected sources"
                value={organizationMetrics.connectedSources.value}
                detail={organizationMetrics.connectedSources.detail}
                trend={organizationMetrics.connectedSources.trend}
              />
              <MetricTile
                label="Top connector"
                value={organizationMetrics.topConnector.value}
                detail={organizationMetrics.topConnector.detail}
                trend={organizationMetrics.topConnector.trend}
              />
            </div>
          </section>

          <section className="organization-card">
            <div className="organization-card-header">
              <div className="organization-panel-title-row">
                <Database size={18} />
                <span>Consumption breakdown</span>
              </div>
            </div>
            <div className="organization-project-list">
              {orgProjects.map((w) => (
                <div key={w.id} className="organization-project-row">
                  <div className="organization-project-main">
                    <div className="organization-project-dot" />
                    <div className="organization-project-copy">
                      <span className="organization-project-name">{w.name}</span>
                      <span className="organization-project-domain">{w.domain}</span>
                    </div>
                  </div>
                  <div className="organization-project-meta">
                    <span>{w.monthlyEvents}</span>
                    <span>{w.dataConsumption}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="organization-card">
            <div className="organization-card-header">
              <div className="organization-panel-title-row">
                <BarChart3 size={18} />
                <span>Connector adoption</span>
              </div>
            </div>
            <div className="organization-connector-list">
              {organizationMetrics.connectorUsage.map((c) => (
                <div key={c.name} className="organization-connector-row">
                  <div className="organization-connector-copy">
                    <span className="organization-connector-name">{c.name}</span>
                    <span className="organization-connector-meta">{c.count} projects</span>
                  </div>
                  <div className="organization-connector-bar-track">
                    <div
                      className="organization-connector-bar-fill"
                      style={{ width: `${c.share}%` }}
                    />
                  </div>
                </div>
              ))}
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
              {organizationMetrics.recentActivity.map((item) => (
                <div key={item.title} className="organization-activity-item">
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
