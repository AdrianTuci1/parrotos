import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { WidgetRenderer } from './WidgetRenderer';
import { cn } from '@/lib/utils';
import {
  serverMonitorSpec,
  analyticsSpec,
  campaignSalesSpec,
  marketingSpec,
} from './widget-spec';
import { specService } from '@/services/SpecService';
import { ChevronDown, RefreshCw, Sparkles } from 'lucide-react';
import { analyticsViews } from '@/components/app-shared';
import '@/styles/dashboard.css';

const layoutSpecs = {
  'server-monitor': serverMonitorSpec,
  'analytics': analyticsSpec,
  'campaign-sales': campaignSalesSpec,
  'marketing-performance': marketingSpec,
};

const layoutToViewId = {
  'server-monitor': 'servers',
  analytics: 'web',
  'campaign-sales': 'sales',
  'marketing-performance': 'marketing',
};

export function DashboardLayout({ layoutId, specViewId, className, isNested = true }) {
  const {
    activeAnalyticsView,
    setActiveAnalyticsView,
    timeRange,
    setTimeRange,
    demoMode,
    currentOrganization,
    currentWorkspace,
  } = useAppStore();

  // In demo mode: use hardcoded spec
  // In non-demo mode: fetch spec from backend
  const [remoteSpec, setRemoteSpec] = useState(null);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [specError, setSpecError] = useState(null);

  const hardcodedSpec = layoutSpecs[layoutId] || serverMonitorSpec;
  const resolvedViewId = specViewId || layoutToViewId[layoutId] || 'servers';
  const spec = demoMode ? hardcodedSpec : (remoteSpec || hardcodedSpec);

  // Fetch spec from backend when project context changes
  useEffect(() => {
    if (demoMode) return;
    if (!currentOrganization?.id || !currentWorkspace?.id) return;

    let cancelled = false;
    setLoadingSpec(true);
    setSpecError(null);

    specService.getSpec(currentOrganization.id, currentWorkspace.id, resolvedViewId)
      .then((data) => {
        if (!cancelled) {
          setRemoteSpec(data);
          setLoadingSpec(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // 404 means no spec generated yet — that's OK, use hardcoded fallback
          setSpecError(err.message);
          setRemoteSpec(null);
          setLoadingSpec(false);
        }
      });

    return () => { cancelled = true; };
  }, [demoMode, currentOrganization?.id, currentWorkspace?.id, resolvedViewId]);

  const handleGenerateSpec = async () => {
    if (!currentOrganization?.id || !currentWorkspace?.id) return;
    try {
      setLoadingSpec(true);
      setSpecError(null);
      await specService.generateSpec(currentOrganization.id, currentWorkspace.id);
      // The harness runs async. Polling or webhook will update the spec later.
      setSpecError('Spec generation started. Refresh in a minute to see results.');
    } catch (err) {
      setSpecError('Failed to start generation: ' + err.message);
    } finally {
      setLoadingSpec(false);
    }
  };

  return (
    <div
      data-layout-id={layoutId}
      className={cn(
        "dashboard-layout-container",
        isNested ? "nested" : "flat",
        className
      )}
    >
      {/* Dashboard Header */}
      {isNested ? (
        <div className="dashboard-layout-header nested-header">
          <h2 className="dashboard-header-title nested-title">
            {spec.title}
          </h2>
          <div className="dashboard-header-controls">
            <div className="dashboard-time-select-wrapper">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="dashboard-time-select"
              >
                {(spec.timeRange?.options || ['15m', '1h', '6h', '24h']).map((opt) => (
                  <option key={opt} value={opt}>
                    Last {opt}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="dashboard-time-select-icon" />
            </div>
            {!demoMode && !remoteSpec && (
              <button
                className="dashboard-refresh-btn"
                onClick={handleGenerateSpec}
                disabled={loadingSpec}
                title="Generate dashboard from real data"
              >
                <Sparkles size={14} />
              </button>
            )}
            <button className="dashboard-refresh-btn">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-layout-header flat-header">
          <div className="dashboard-menu-tabs">
            {analyticsViews.map((tab) => {
              const isSelected = activeAnalyticsView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAnalyticsView(tab.id)}
                  className={cn(
                    "dashboard-menu-tab-btn",
                    isSelected ? "active" : "inactive"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="dashboard-header-controls">
            <div className="dashboard-time-select-wrapper">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="dashboard-time-select"
              >
                {(spec.timeRange?.options || ['15m', '1h', '6h', '24h']).map((opt) => (
                  <option key={opt} value={opt}>
                    Last {opt}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="dashboard-time-select-icon" />
            </div>
            {!demoMode && !remoteSpec && (
              <button
                className="dashboard-refresh-btn"
                onClick={handleGenerateSpec}
                disabled={loadingSpec}
                title="Generate dashboard from real data"
              >
                <Sparkles size={14} />
              </button>
            )}
            <button className="dashboard-refresh-btn">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Spec error / status */}
      {specError && (
        <div className="dashboard-spec-status">
          {specError}
        </div>
      )}

      {/* Widget Grid */}
      <div className={cn("dashboard-grid-wrapper", isNested ? "nested-grid" : "flat-grid")}>
        <div className="dashboard-grid">
          {spec.widgets.map((widget) => (
            <WidgetRenderer key={widget.id} spec={widget} layoutSpec={spec} />
          ))}
        </div>
      </div>
    </div>
  );
}
