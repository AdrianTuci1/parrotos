import { useEffect, useState } from 'react';
import { Building2, BarChart3, Database, ShieldCheck } from 'lucide-react';
import { ViewFrame } from '@/components/shell/ViewFrame';
import { useAppStore } from '@/stores/useAppStore';
import '@/styles/organization-home.css';

function getTrendTone(trend) {
  if (String(trend).startsWith('+')) return 'positive';
  if (String(trend).startsWith('-')) return 'negative';
  return 'neutral';
}

function MetricTile({ label, value, detail, trend }) {
  return (
    <div className="organization-metric-tile">
      <span className="organization-metric-label">{label}</span>
      <div className="organization-metric-value-row">
        <span className="organization-metric-value">{value}</span>
        <span className={`organization-metric-trend is-${getTrendTone(trend)}`}>{trend}</span>
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

const emptyOrg = { id: '__empty__', name: 'My Organization', slug: 'my-org', plan: 'Starter' };

export function OrganizationStatsView() {
  const { currentOrganization, fetchOrgMetrics, organizationMetrics, devMode, demoMode, isLoading } = useAppStore();
  const [localLoading, setLocalLoading] = useState(false);
  const org = currentOrganization || emptyOrg;

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      if (!devMode && !demoMode && org.id && org.id !== '__empty__') {
        setLocalLoading(true);
        try {
          await fetchOrgMetrics(org.id);
        } finally {
          if (!cancelled) setLocalLoading(false);
        }
      }
    }

    loadMetrics();
    return () => { cancelled = true; };
  }, [devMode, demoMode, org.id]);

  const loading = isLoading || localLoading;
  const metrics = organizationMetrics;

  // Safe accessors with defaults
  const projects = metrics?.projects || { total: 0, healthy: 0, monitoring: 0 };
  const events = metrics?.events || { total: 0, formatted: '0' };
  const storage = metrics?.storage || { total: 0, formatted: '0 GB' };
  const compute = metrics?.compute || { value: '0 GB', detail: 'BigQuery + orchestration', trend: '-8.1%' };
  const connectedSources = metrics?.connectedSources || { value: '0', detail: 'No connectors', trend: '+12%' };
  const topConnector = metrics?.topConnector || { value: 'None', detail: 'No connectors', trend: '+5%' };
  const connectorUsage = metrics?.connectorUsage || [];
  const projectList = metrics?.projectList || [];
  const recentActivity = metrics?.recentActivity || [{ title: 'No recent activity', meta: 'Activity will appear here' }];
  const activeProjectsTrend = projects.total > 0 ? '+2 this month' : 'No data';
  const monthlyEventsTrend = events.total > 0 ? '+12.4%' : 'No data';
  const warehouseTrend = storage.total > 0 ? '+8.1%' : 'No data';
  const computeTrend = parseFloat(compute.value) > 0 ? compute.trend : 'No data';
  const connectedSourcesTrend = Number(connectedSources.value) > 0 ? connectedSources.trend : 'No data';
  const topConnectorTrend = topConnector.value && topConnector.value !== 'None' ? topConnector.trend : 'No data';

  return (
    <ViewFrame className="organization-home-frame" maxWidthClassName="full-width">
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
              {loading ? (
                <>
                  <LoadingTile />
                  <LoadingTile />
                </>
              ) : (
                <>
                  <MetricTile
                    label="Active projects"
                    value={String(projects.total)}
                    detail={`${projects.healthy} healthy, ${projects.monitoring} monitoring`}
                    trend={activeProjectsTrend}
                  />
                  <MetricTile
                    label="Monthly events"
                    value={events.formatted}
                    detail={events.total > 0 ? 'Across all projects' : 'No project events yet'}
                    trend={monthlyEventsTrend}
                  />
                </>
              )}
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
              {loading ? (
                <>
                  <LoadingTile />
                  <LoadingTile />
                </>
              ) : (
                <>
                  <MetricTile
                    label="Warehouse consumption"
                    value={storage.formatted}
                    detail={storage.total > 0 ? 'Raw + modeled layers' : 'No storage usage yet'}
                    trend={warehouseTrend}
                  />
                  <MetricTile
                    label="Monthly compute"
                    value={compute.value}
                    detail={compute.detail}
                    trend={computeTrend}
                  />
                </>
              )}
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
              {loading ? (
                <>
                  <LoadingTile />
                  <LoadingTile />
                </>
              ) : (
                <>
                  <MetricTile
                    label="Connected sources"
                    value={connectedSources.value}
                    detail={connectedSources.detail}
                    trend={connectedSourcesTrend}
                  />
                  <MetricTile
                    label="Top connector"
                    value={topConnector.value}
                    detail={topConnector.detail}
                    trend={topConnectorTrend}
                  />
                </>
              )}
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
              {loading && projectList.length === 0 ? (
                <div className="organization-project-row" style={{ opacity: 0.5 }}>
                  <span>Loading projects...</span>
                </div>
              ) : (
                projectList.map((w) => (
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
                ))
              )}
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
              {loading && connectorUsage.length === 0 ? (
                <div className="organization-connector-row" style={{ opacity: 0.5 }}>
                  <span>Loading connectors...</span>
                </div>
              ) : (
                connectorUsage.map((c) => (
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
