import { useEffect, useState } from 'react';
import {
  WIDGET_SIZES,
  WIDGET_TYPES,
} from './widget-spec';
import { resolveWidgetData } from './DataResolver';
import { useAppStore } from '@/stores/useAppStore';
import { MetricWidget } from './widgets/MetricWidget';
import { SparklineWidget } from './widgets/SparklineWidget';
import { BarChartWidget } from './widgets/BarChartWidget';
import { LineChartWidget } from './widgets/LineChartWidget';
import { ProgressListWidget } from './widgets/ProgressListWidget';
import { StatusListWidget } from './widgets/StatusListWidget';
import { PieChartWidget } from './widgets/PieChartWidget';
import { TextInsightWidget } from './widgets/TextInsightWidget';
import { SegmentedBarWidget } from './widgets/SegmentedBarWidget';
import { HeatmapWidget } from './widgets/HeatmapWidget';
import { VisitorsOnlineWidget } from './widgets/VisitorsOnlineWidget';
import { CoreWebVitalsWidget } from './widgets/CoreWebVitalsWidget';
import { StackedBarChartWidget } from './widgets/StackedBarChartWidget';
import { BudgetGaugeWidget } from './widgets/BudgetGaugeWidget';
import { ActiveDeploymentsWidget } from './widgets/ActiveDeploymentsWidget';
import { SalesOverviewWidget } from './widgets/SalesOverviewWidget';
import { SalesTransactionsWidget } from './widgets/SalesTransactionsWidget';
import '@/styles/dashboard.css';

const widgetComponents = {
  [WIDGET_TYPES.METRIC]: MetricWidget,
  [WIDGET_TYPES.SPARKLINE]: SparklineWidget,
  [WIDGET_TYPES.BAR_CHART]: BarChartWidget,
  [WIDGET_TYPES.LINE_CHART]: LineChartWidget,
  [WIDGET_TYPES.PROGRESS_LIST]: ProgressListWidget,
  [WIDGET_TYPES.STATUS_LIST]: StatusListWidget,
  [WIDGET_TYPES.PIE_CHART]: PieChartWidget,
  [WIDGET_TYPES.TEXT_INSIGHT]: TextInsightWidget,
  [WIDGET_TYPES.SEGMENTED_BAR]: SegmentedBarWidget,
  [WIDGET_TYPES.HEATMAP]: HeatmapWidget,
  [WIDGET_TYPES.VISITORS_ONLINE]: VisitorsOnlineWidget,
  [WIDGET_TYPES.CORE_WEB_VITALS]: CoreWebVitalsWidget,
  [WIDGET_TYPES.STACKED_BAR_CHART]: StackedBarChartWidget,
  [WIDGET_TYPES.BUDGET_GAUGE]: BudgetGaugeWidget,
  [WIDGET_TYPES.ACTIVE_DEPLOYMENTS]: ActiveDeploymentsWidget,
  [WIDGET_TYPES.SALES_OVERVIEW]: SalesOverviewWidget,
  [WIDGET_TYPES.SALES_TRANSACTIONS]: SalesTransactionsWidget,
};

export function WidgetRenderer({ spec, layoutSpec }) {
  const { id, type, size, title, config, queryRef } = spec;
  const sizeClass = WIDGET_SIZES[size]?.className || 'col-span-1 row-span-1';

  const { demoMode, currentOrganization, currentWorkspace, timeRange } = useAppStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    resolveWidgetData(
      layoutSpec,
      type,
      config,
      queryRef || id,
      {
        timeRange,
        orgId: currentOrganization?.id,
        projectId: currentWorkspace?.id,
        demoMode,
        workspace: currentWorkspace,
      }
    ).then((result) => {
      if (!cancelled) setData(result);
    });

    return () => { cancelled = true; };
  }, [type, config, queryRef, id, timeRange, demoMode, currentOrganization?.id, currentWorkspace, layoutSpec]);

  const WidgetComponent = widgetComponents[type];
  if (!WidgetComponent) {
    return (
      <div className={`${sizeClass} widget-card widget-id-${id}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px' }}>
          <span style={{ color: '#8E918F', fontSize: '14px' }}>Unknown widget type: {type}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClass} widget-card widget-id-${id}`}>
      {/* Widget Header */}
      {title && (
        <div className="widget-header">
          <span className="widget-title">
            {title}
          </span>
          {config.unit && (
            <span className="widget-unit">{config.unit}</span>
          )}
        </div>
      )}
      {/* Widget Content */}
      <div className="widget-content-body">
        {data?.unavailable ? (
          <div className="widget-unavailable">
            <div className="widget-unavailable-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/>
                <line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
            </div>
            <div className="widget-unavailable-title">{data.connector} not connected</div>
            <div className="widget-unavailable-desc">Connect {data.connector} to see this data</div>
          </div>
        ) : data ? (
          <WidgetComponent data={data} config={config} />
        ) : (
          <div className="widget-loading">Loading...</div>
        )}
      </div>
    </div>
  );
}
