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

// Sources that query databases directly (MongoDB, PostgreSQL, MySQL)
const DATABASE_SOURCES = ['mongodb', 'postgresql', 'mysql'];

// Map query source to connector name for availability check
const SOURCE_CONNECTOR_MAP = {
  'prometheus': 'Prometheus',
  'api': 'GitHub',        // api deployments come from GitHub
  'analytics': 'GA4',     // or PostHog - determined by query
  'warehouse': 'BigQuery', // always available if project exists
  'ga4': 'GA4',
  'lighthouse': 'GA4',    // web vitals tied to analytics setup
  'mongodb': 'MongoDB',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
};

// Multi-connector mapping: a query ID can map to multiple connector-specific queries
const MULTI_CONNECTOR_QUERIES = {
  'active-campaigns-total': ['Google Ads', 'Meta Ads', 'TikTok Ads'],
  'total-reach': ['Google Ads', 'Meta Ads', 'TikTok Ads'],
  'avg-engagement': ['Google Ads', 'Meta Ads', 'TikTok Ads'],
  'gross-revenue': ['Google Ads', 'Meta Ads', 'TikTok Ads', 'Stripe'],
  'todays-budget': ['Google Ads', 'Meta Ads', 'TikTok Ads'],
  'posts-published': ['Meta Ads', 'TikTok Ads'],
  'revenue-total': ['Stripe', 'Shopify', 'WooCommerce', 'PostgreSQL', 'MongoDB'],
  'conversions-total': ['Stripe', 'Shopify', 'WooCommerce', 'PostgreSQL'],
  'conversion-rate': ['GA4', 'PostHog', 'Shopify', 'PostgreSQL'],
  'roas': ['Google Ads', 'Meta Ads', 'TikTok Ads', 'Stripe'],
  'revenue-by-campaign': ['Google Ads', 'Meta Ads', 'TikTok Ads', 'Stripe', 'Shopify'],
  'funnel-stages': ['GA4', 'PostHog', 'Shopify', 'PostgreSQL', 'MongoDB'],
  'active-campaigns': ['Google Ads', 'Meta Ads', 'TikTok Ads'],
  'channel-breakdown': ['Google Ads', 'Meta Ads', 'TikTok Ads', 'GA4', 'PostHog'],
  'requests': ['Prometheus', 'PostgreSQL', 'MongoDB'],
  'errors': ['Sentry', 'Prometheus', 'PostgreSQL'],
  'cpu-time': ['Prometheus', 'PostgreSQL'],
  'wall-time': ['Prometheus', 'PostgreSQL'],
  'execution-duration': ['Prometheus', 'PostgreSQL'],
  'request-duration': ['Prometheus', 'PostgreSQL'],
  'latency-percentiles': ['Prometheus', 'PostgreSQL'],
};

function getRequiredConnector(query) {
  const source = query?.source;
  if (!source) return null;

  // Special case: api source with deployment template = GitHub
  if (source === 'api' && query.template?.includes('deployments')) {
    return 'GitHub';
  }
  // Special case: api source with insights = generic, no specific connector
  if (source === 'api' && query.template?.includes('insights')) {
    return null; // Server-side generated, always available
  }
  // Special case: campaigns API = marketing connectors
  if (source === 'api' && query.template?.includes('campaigns')) {
    return 'Google Ads'; // Primary, but can be multi
  }

  return SOURCE_CONNECTOR_MAP[source] || null;
}

function isConnectorAvailable(connectorName, workspace) {
  if (!connectorName) return true; // No specific connector required
  if (!workspace?.connectors) return false;
  return workspace.connectors.includes(connectorName);
}

function getAvailableConnectorsForQuery(queryRef, workspace) {
  const multiConnectors = MULTI_CONNECTOR_QUERIES[queryRef];
  if (!multiConnectors || !workspace?.connectors) {
    return null; // Not a multi-connector query
  }
  return multiConnectors.filter(c => workspace.connectors.includes(c));
}

/**
 * Resolve widget data — the single entry point for all widget data.
 */
export async function resolveWidgetData(spec, widgetType, config, queryRef, context) {
  const { timeRange, orgId, projectId, demoMode, workspace } = context;

  // Demo mode — always use mock data
  if (demoMode) {
    return generateMockData(widgetType, config, queryRef);
  }

  // Find the query definition(s)
  const queries = spec?.queries?.filter((q) => q.id === queryRef || q.id.startsWith(`${queryRef}-`));
  if (!queries || queries.length === 0) {
    return generateMockData(widgetType, config, queryRef);
  }

  // Single query case
  if (queries.length === 1) {
    const query = queries[0];
    
    // Check if required connector is available
    const requiredConnector = getRequiredConnector(query);
    if (requiredConnector && !isConnectorAvailable(requiredConnector, workspace)) {
      return {
        unavailable: true,
        connector: requiredConnector,
        source: query.source,
      };
    }

    // Route based on source type
    try {
      if (WAREHOUSE_SOURCES.includes(query.source)) {
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

      if (DATABASE_SOURCES.includes(query.source)) {
        if (!orgId || !projectId) {
          return emptyDataForType(widgetType);
        }
        const dbQuery = substituteParams(query.template, query.params || [], { timeRange });
        const rows = await cacheService.withCache(
          queryRef,
          dbQuery,
          query.refresh || '60s',
          orgId,
          projectId,
          () => analyticsService.queryDatabase(orgId, projectId, query.source, dbQuery)
        );
        return transformBigQueryResult(rows, widgetType);
      }
    } catch (err) {
      console.warn(`Widget query "${queryRef}" (${query.source}) failed:`, err.message);
      return emptyDataForType(widgetType);
    }
  }

  // Multi-source case: execute all queries and aggregate
  const results = [];
  for (const query of queries) {
    try {
      if (WAREHOUSE_SOURCES.includes(query.source)) {
        if (!orgId || !projectId) continue;
        const sql = substituteParams(query.template, query.params || [], { timeRange });
        const rows = await cacheService.withCache(
          query.id,
          sql,
          query.refresh || '60s',
          orgId,
          projectId,
          () => analyticsService.query(orgId, projectId, sql)
        );
        const data = transformBigQueryResult(rows, widgetType);
        if (data) results.push({ source: query.sourceId, data });
      }
    } catch (err) {
      console.warn(`Multi-source query "${query.id}" failed:`, err.message);
    }
  }

  if (results.length === 0) {
    return emptyDataForType(widgetType);
  }

  return aggregateMultiSourceResults(results, widgetType);

  // Unknown source — fall back to mock
  return generateMockData(widgetType, config, queryRef);
}

async function executeQueryForConnector(query, connector, context) {
  const { timeRange, orgId, projectId, widgetType } = context;
  
  // Modify query template to include connector filter
  let template = query.template;
  if (template.includes('FROM ')) {
    // Add connector filter to SQL
    template = template.replace(
      /WHERE /i,
      `WHERE connector = '${connector}' AND `
    );
  } else if (template.includes('/api/v1/')) {
    // Add connector to API path
    template = template.replace('/api/v1/', `/api/v1/${connector.toLowerCase().replace(' ', '-')}/`);
  }
  
  try {
    if (WAREHOUSE_SOURCES.includes(query.source)) {
      if (!orgId || !projectId) return null;
      const sql = substituteParams(template, query.params || [], { timeRange });
      const rows = await cacheService.withCache(
        `${query.id}-${connector}`,
        sql,
        query.refresh || '60s',
        orgId,
        projectId,
        () => analyticsService.query(orgId, projectId, sql)
      );
      return transformBigQueryResult(rows, widgetType);
    }

    if (DATABASE_SOURCES.includes(query.source)) {
      // Database direct query for multi-connector aggregation
      if (!orgId || !projectId) return null;
      const dbQuery = substituteParams(template, query.params || [], { timeRange });
      const rows = await cacheService.withCache(
        `${query.id}-${connector}`,
        dbQuery,
        query.refresh || '60s',
        orgId,
        projectId,
        () => analyticsService.queryDatabase(orgId, projectId, query.source, dbQuery)
      );
      return transformBigQueryResult(rows, widgetType);
    }

    if (DIRECT_SOURCES.includes(query.source)) {
      return await executeDirectQuery(
        query.source,
        template,
        query.params || [],
        { timeRange },
        widgetType
      );
    }
  } catch (err) {
    console.warn(`Connector query failed for ${connector}:`, err.message);
    return null;
  }
}

function aggregateMultiSourceResults(results, widgetType) {
  if (results.length === 1) {
    return results[0].data;
  }
  
  // Aggregate based on widget type
  if (widgetType === 'metric') {
    let totalValue = 0;
    let totalPrevious = 0;
    const allSparklines = [];
    
    for (const { source, data } of results) {
      if (data.value !== undefined) totalValue += Number(data.value) || 0;
      if (data.previous !== undefined) totalPrevious += Number(data.previous) || 0;
      if (data.sparklineData) allSparklines.push(...data.sparklineData);
    }
    
    const trend = totalPrevious > 0 
      ? (((totalValue - totalPrevious) / totalPrevious) * 100).toFixed(1)
      : '0';
    
    return {
      value: totalValue,
      previous: totalPrevious || undefined,
      trend,
      sparklineData: allSparklines.length > 0 ? allSparklines : undefined,
      sources: results.map(r => r.source),
    };
  }
  
  if (widgetType === 'bar-chart' || widgetType === 'stacked-bar-chart') {
    // Merge items from all sources
    const mergedItems = [];
    for (const { source, data } of results) {
      if (data.items) {
        mergedItems.push(...data.items.map(item => ({ ...item, source })));
      }
    }
    return { items: mergedItems, sources: results.map(r => r.source) };
  }
  
  if (widgetType === 'pie-chart') {
    // Aggregate segments by source
    const mergedSegments = [];
    for (const { source, data } of results) {
      if (data.segments) {
        mergedSegments.push(...data.segments.map(s => ({ ...s, source })));
      }
    }
    return { segments: mergedSegments, sources: results.map(r => r.source) };
  }
  
  // Default: return first result with sources info
  return {
    ...results[0].data,
    sources: results.map(r => r.source),
  };
}
