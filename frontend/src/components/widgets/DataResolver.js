import { generateMockData } from './widget-spec';
import { analyticsService } from '@/services/AnalyticsService';
import { executeDirectQuery } from '@/services/DirectQueryService';
import { cacheService } from '@/services/CacheService';

/**
 * Data Resolver — decides whether to use mock data or fetch from backend.
 * 
 * Routing table:
 *   demoMode ON          → generateMockData (local)
 *   analytics/warehouse  → cacheService.withCache() → BigQuery
 *   prometheus           → executeDirectQuery() → Prometheus REST API
 *   api                  → executeDirectQuery() → REST endpoint
 *   ga4                  → executeDirectQuery() → GA4 API (future)
 *   unknown/fallback     → generateMockData (safe default)
 */

function substituteParams(template, params, context) {
  let sql = template;
  if (params.includes('timeRange')) {
    const minutes = parseTimeRange(context.timeRange);
    sql = sql.replace(/\$timeRange/g, `${minutes}m`);
    sql = sql.replace(/\$__timeFrom/g, `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${minutes} MINUTE)`);
    sql = sql.replace(/\$__timeTo/g, 'CURRENT_TIMESTAMP()');
    sql = sql.replace(/\$__previousTimeFrom/g, `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${minutes * 2} MINUTE)`);
    sql = sql.replace(/\$__previousTimeTo/g, `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${minutes} MINUTE)`);
  }
  return sql;
}

function parseTimeRange(range) {
  if (!range) return 60;
  const match = range.match(/^(\d+)(m|h|d)$/);
  if (!match) return 60;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'm') return value;
  if (unit === 'h') return value * 60;
  if (unit === 'd') return value * 1440;
  return 60;
}

function transformBigQueryResult(rows, widgetType) {
  if (!rows || rows.length === 0) {
    return emptyDataForType(widgetType);
  }

  const firstRow = rows[0];
  const columns = Object.keys(firstRow);

  if (widgetType === 'metric') {
    const value = Number(firstRow.value ?? firstRow[columns[0]] ?? 0);
    const previousValue = Number(firstRow.previous_value ?? firstRow.previousValue ?? Number.NaN);
    const trend = Number.isFinite(previousValue)
      ? (previousValue === 0 ? (value === 0 ? 0 : 100) : ((value - previousValue) / Math.abs(previousValue)) * 100)
      : 0;

    return {
      value,
      previousValue: Number.isFinite(previousValue) ? previousValue : undefined,
      trend: Number.isFinite(trend) ? trend.toFixed(1) : '0',
    };
  }

  if (widgetType === 'text-insight') {
    const preview = rows.slice(0, 3).map((row) => (
      Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    )).join(' • ');
    return { text: preview || 'No data available.' };
  }

  if (widgetType === 'record-list') {
    return {
      rows,
      items: rows.map((row, index) => ({
        id: index,
        label: row.label ?? row.name ?? row.title ?? Object.values(row)[0] ?? `Row ${index + 1}`,
        value: row.value ?? row.count ?? Object.values(row)[1] ?? null,
        raw: row,
      })),
    };
  }

  if (rows.length === 1 && columns.length === 1) {
    return { value: firstRow[columns[0]], trend: '0' };
  }

  if (widgetType === 'sparkline' && rows.length > 1 && columns.length >= 2) {
    return {
      sparklineData: rows.map((row) => Number(row[columns[1]]) || 0),
      labels: rows.map((row) => String(row[columns[0]] ?? '')),
      items: rows.map((row) => ({
        label: row[columns[0]],
        value: row[columns[1]],
      })),
    };
  }

  if (rows.length > 1 && columns.length >= 2) {
    const items = rows.map((row) => ({
      label: row[columns[0]] || row.label || row.name || String(row[columns[0]]),
      value: row[columns[1]] || row.value || row.count || 0,
      percent: row.percent || row.share || 0,
    }));
    const maxValue = Math.max(...items.map((i) => Number(i.value) || 0), 1);
    items.forEach((item) => {
      if (!item.percent && maxValue > 0) {
        item.percent = Math.round((Number(item.value) / maxValue) * 100);
      }
    });
    return { items };
  }

  return emptyDataForType(widgetType);
}

function emptyDataForType(widgetType) {
  switch (widgetType) {
    case 'metric':
      return { value: 0, trend: '0' };
    case 'sparkline':
      return { sparklineData: [] };
    case 'bar-chart':
    case 'line-chart':
    case 'progress-list':
    case 'status-list':
    case 'pie-chart':
    case 'segmented-bar':
      return { items: [] };
    case 'heatmap':
      return { cells: [] };
    case 'text-insight':
      return { text: 'No data available.' };
    case 'record-list':
      return { rows: [], items: [] };
    case 'active-deployments':
      return { deployments: [] };
    default:
      return {};
  }
}

// Sources that use direct REST queries (no BigQuery, no ETL)
const DIRECT_SOURCES = ['prometheus', 'api', 'ga4'];

// Sources that go through BigQuery
const WAREHOUSE_SOURCES = ['analytics', 'warehouse'];

/**
 * Resolve widget data — the single entry point for all widget data.
 */
export async function resolveWidgetData(spec, widgetType, config, queryRef, context) {
  const { timeRange, orgId, projectId, demoMode } = context;

  // Demo mode — always use mock data
  if (demoMode) {
    return generateMockData(widgetType, config, queryRef);
  }

  // Find the query definition
  const query = spec?.queries?.find((q) => q.id === queryRef);
  if (!query) {
    return generateMockData(widgetType, config, queryRef);
  }

  // Route based on source type
  try {
    if (WAREHOUSE_SOURCES.includes(query.source)) {
      // BigQuery path with caching
      if (!orgId || !projectId) {
        return emptyDataForType(widgetType);
      }
      const sql = substituteParams(query.template, query.params || [], { timeRange });
      const rows = await cacheService.withCache(
        queryRef,
        sql,
        query.refresh || '60s',
        orgId,
        projectId,
        () => analyticsService.query(orgId, projectId, sql)
      );
      return transformBigQueryResult(rows, widgetType);
    }

    if (DIRECT_SOURCES.includes(query.source)) {
      // Direct query path (Prometheus, REST API, GA4)
      return await executeDirectQuery(
        query.source,
        query.template,
        query.params || [],
        {
          timeRange,
          prometheusUrl: config.prometheusUrl,
        },
        widgetType
      );
    }
  } catch (err) {
    console.warn(`Widget query "${queryRef}" (${query.source}) failed:`, err.message);
    return emptyDataForType(widgetType);
  }

  // Unknown source — fall back to mock
  return generateMockData(widgetType, config, queryRef);
}
