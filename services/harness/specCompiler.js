import { VIEW_ORDER, VIEW_TEMPLATES } from './viewTemplates.js';

const KNOWN_SOURCE_LABELS = {
  ga4: { name: 'Google Analytics 4', type: 'ga4', groupId: 'web' },
  search_console: { name: 'Search Console', type: 'api', groupId: 'web' },
  google_ads: { name: 'Google Ads', type: 'api', groupId: 'marketing' },
  meta_ads: { name: 'Meta Ads', type: 'api', groupId: 'marketing' },
  tiktok_ads: { name: 'TikTok Ads', type: 'api', groupId: 'marketing' },
  stripe: { name: 'Stripe', type: 'stripe', groupId: 'financial' },
  shopify: { name: 'Shopify', type: 'shopify', groupId: 'sales' },
  woocommerce: { name: 'WooCommerce', type: 'api', groupId: 'sales' },
  posthog: { name: 'PostHog', type: 'events', groupId: 'web' },
  sentry: { name: 'Sentry', type: 'api', groupId: 'servers' },
  prometheus: { name: 'Prometheus', type: 'api', groupId: 'servers' },
  postgres: { name: 'PostgreSQL', type: 'db', groupId: 'servers' },
  postgresql: { name: 'PostgreSQL', type: 'db', groupId: 'servers' },
  mysql: { name: 'MySQL', type: 'db', groupId: 'servers' },
  mongodb: { name: 'MongoDB', type: 'db', groupId: 'servers' },
  bigquery: { name: 'BigQuery', type: 'warehouse', groupId: 'servers' },
  hubspot: { name: 'HubSpot', type: 'crm', groupId: 'sales' },
  salesforce: { name: 'Salesforce', type: 'crm', groupId: 'sales' },
  vercel: { name: 'Vercel', type: 'api', groupId: 'servers' },
};

function titleCase(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function detectTimeColumn(columns = []) {
  return columns.find((column) => /(_at|date|time|timestamp)$/i.test(column.name))?.name || null;
}

function quoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '')}\``;
}

function detectDimensionColumns(columns = []) {
  return columns
    .filter((column) => ['STRING', 'BOOL', 'BOOLEAN'].includes(String(column.type || '').toUpperCase()))
    .map((column) => column.name);
}

function detectNumericColumns(columns = []) {
  return columns
    .filter((column) => ['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'].includes(String(column.type || '').toUpperCase()))
    .map((column) => column.name);
}

function detectSourceKey(shortName = '') {
  const normalized = slugify(shortName);
  const directMatch = Object.keys(KNOWN_SOURCE_LABELS).find((key) => normalized === key || normalized.startsWith(`${key}_`));
  if (directMatch) return directMatch;
  return normalized.split('_')[0] || 'warehouse';
}

function inferGroupIdFromTable(table = {}) {
  const sourceKey = detectSourceKey(table.short_name);
  if (KNOWN_SOURCE_LABELS[sourceKey]?.groupId) {
    return KNOWN_SOURCE_LABELS[sourceKey].groupId;
  }

  const columns = table.columns || [];
  const names = columns.map((column) => String(column.name).toLowerCase());

  if (names.some((name) => name.includes('campaign') || name.includes('ad_') || name.includes('impression'))) return 'marketing';
  if (names.some((name) => name.includes('order') || name.includes('sku') || name.includes('cart'))) return 'sales';
  if (names.some((name) => name.includes('revenue') || name.includes('invoice') || name.includes('payment') || name.includes('mrr'))) return 'financial';
  if (names.some((name) => name.includes('session') || name.includes('visitor') || name.includes('page') || name.includes('referrer'))) return 'web';
  return 'servers';
}

function inferSource(table = {}) {
  const sourceKey = detectSourceKey(table.short_name);
  const known = KNOWN_SOURCE_LABELS[sourceKey];
  if (known) {
    return {
      id: sourceKey,
      name: known.name,
      type: known.type,
      groupId: known.groupId,
    };
  }

  return {
    id: sourceKey,
    name: titleCase(sourceKey),
    type: 'warehouse',
    groupId: inferGroupIdFromTable(table),
  };
}

function summarizeTable(table = {}) {
  const timeColumn = detectTimeColumn(table.columns);
  const dimensionColumns = detectDimensionColumns(table.columns);
  const numericColumns = detectNumericColumns(table.columns);
  return {
    table: table.table,
    short_name: table.short_name,
    row_count: table.row_count || 0,
    columns: table.columns || [],
    timeColumn,
    dimensionColumns,
    numericColumns,
    source: inferSource(table),
    groupId: inferGroupIdFromTable(table),
  };
}

function scoreTableForWidget(widget, table) {
  let score = 0;
  const haystack = `${table.short_name} ${table.columns.map((column) => column.name).join(' ')}`.toLowerCase();
  const intentWords = String(widget.intent || widget.title || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  for (const word of intentWords) {
    if (haystack.includes(word)) score += 4;
  }

  if (table.groupId === VIEW_TEMPLATES[widget.viewId].groupId) score += 8;
  if (widget.type === 'metric' && table.numericColumns.length > 0) score += 5;
  if ((widget.type === 'sparkline' || widget.type === 'bar-chart') && table.timeColumn) score += 4;
  if ((widget.type === 'progress-list' || widget.type === 'pie-chart' || widget.type === 'status-list') && table.dimensionColumns.length > 0) score += 3;
  if (table.row_count > 0) score += Math.min(5, Math.floor(Math.log10(table.row_count + 1)));

  return score;
}

function chooseMetricColumn(table, widget) {
  const metricHints = String(widget.intent || widget.title || '').toLowerCase();
  const preferred = table.numericColumns.find((name) => metricHints.includes(name.toLowerCase()));
  if (preferred) return preferred;
  return table.numericColumns[0] || null;
}

function chooseDimensionColumn(table, widget) {
  const dimensionHints = String(widget.intent || widget.title || '').toLowerCase();
  const preferred = table.dimensionColumns.find((name) => dimensionHints.includes(name.toLowerCase()));
  if (preferred) return preferred;
  return table.dimensionColumns[0] || null;
}

function buildDefaultTitle(widget, table) {
  if (!table) return widget.title;
  const sourcePrefix = table.source?.name ? `${table.source.name} ` : '';
  return `${sourcePrefix}${widget.title}`.trim();
}

function buildBindingFromTable(widget, table) {
  const metricColumn = chooseMetricColumn(table, widget);
  const dimensionColumn = chooseDimensionColumn(table, widget);
  const timeColumn = table.timeColumn;
  const defaultAggregation = metricColumn ? (widget.type === 'metric' ? 'sum' : 'avg') : 'count';

  return {
    id: widget.id,
    title: buildDefaultTitle(widget, table),
    queryRef: widget.id,
    table: table.short_name,
    sourceId: table.source.id,
    groupId: VIEW_TEMPLATES[widget.viewId].groupId,
    metricColumn,
    dimensionColumn,
    timeColumn,
    aggregation: defaultAggregation,
    queryIntent: widget.intent,
  };
}

export function buildDefaultBindings(catalog) {
  const tables = (catalog.tables || []).map(summarizeTable);
  const bindings = { version: 1, views: {} };

  for (const viewId of VIEW_ORDER) {
    const template = VIEW_TEMPLATES[viewId];
    const eligibleTables = tables.filter((table) => table.groupId === template.groupId);
    const fallbackTables = eligibleTables.length > 0 ? eligibleTables : tables;

    bindings.views[viewId] = {
      title: template.title,
      widgets: template.widgets.map((widget) => {
        const scored = fallbackTables
          .map((table) => ({ table, score: scoreTableForWidget({ ...widget, viewId }, table) }))
          .sort((left, right) => right.score - left.score);
        const bestTable = scored[0]?.table || null;
        return bestTable
          ? buildBindingFromTable({ ...widget, viewId }, bestTable)
          : {
              id: widget.id,
              title: widget.title,
              queryRef: widget.id,
              table: null,
              sourceId: null,
              groupId: template.groupId,
              metricColumn: null,
              dimensionColumn: null,
              timeColumn: null,
              aggregation: 'count',
              queryIntent: widget.intent,
            };
      }),
    };
  }

  return bindings;
}

export function mergeBindings(templateBindings, existingBindings = null) {
  if (!existingBindings?.views) return templateBindings;

  const merged = { version: 1, views: {} };

  for (const viewId of VIEW_ORDER) {
    const templateView = templateBindings.views[viewId];
    const existingView = existingBindings.views[viewId];
    const existingWidgetsById = new Map((existingView?.widgets || []).map((widget) => [widget.id, widget]));

    merged.views[viewId] = {
      title: existingView?.title || templateView.title,
      widgets: templateView.widgets.map((widget) => ({
        ...widget,
        ...existingWidgetsById.get(widget.id),
        id: widget.id,
      })),
    };
  }

  return merged;
}

function buildMetricSql(dataset, tableName, binding, widgetType) {
  const tableRef = `\`${dataset}.${tableName}\``;
  const aggregation = String(binding.aggregation || 'sum').toUpperCase();
  const metricExpression = binding.metricColumn ? `${aggregation}(${quoteIdentifier(binding.metricColumn)})` : 'COUNT(*)';
  const timeColumn = binding.timeColumn ? quoteIdentifier(binding.timeColumn) : null;

  if (widgetType === 'metric') {
    if (timeColumn) {
      return `SELECT
  COALESCE(${binding.metricColumn ? `${aggregation}(CASE WHEN ${timeColumn} >= $__timeFrom AND ${timeColumn} < $__timeTo THEN ${quoteIdentifier(binding.metricColumn)} END)` : `COUNT(CASE WHEN ${timeColumn} >= $__timeFrom AND ${timeColumn} < $__timeTo THEN 1 END)`}, 0) AS value,
  COALESCE(${binding.metricColumn ? `${aggregation}(CASE WHEN ${timeColumn} >= $__previousTimeFrom AND ${timeColumn} < $__previousTimeTo THEN ${quoteIdentifier(binding.metricColumn)} END)` : `COUNT(CASE WHEN ${timeColumn} >= $__previousTimeFrom AND ${timeColumn} < $__previousTimeTo THEN 1 END)`}, 0) AS previous_value
FROM ${tableRef}`;
    }

    if (binding.metricColumn) {
      return `SELECT ${metricExpression} AS value FROM ${tableRef}`;
    }

    return `SELECT COUNT(*) AS value FROM ${tableRef}`;
  }

  if (timeColumn) {
    return `SELECT bucket, value
FROM (
  SELECT TIMESTAMP_TRUNC(${timeColumn}, DAY) AS bucket, ${metricExpression} AS value
  FROM ${tableRef}
  WHERE ${timeColumn} >= $__timeFrom AND ${timeColumn} < $__timeTo
  GROUP BY bucket
  ORDER BY bucket DESC
  LIMIT 30
)
ORDER BY bucket ASC`;
  }

  if (binding.metricColumn) {
    return `SELECT ${metricExpression} AS value FROM ${tableRef}`;
  }

  return `SELECT COUNT(*) AS value FROM ${tableRef}`;
}

function buildDimensionSql(dataset, tableName, binding) {
  const tableRef = `\`${dataset}.${tableName}\``;
  const dimension = quoteIdentifier(binding.dimensionColumn || binding.metricColumn || 'value');
  const metricExpression = binding.metricColumn ? `${String(binding.aggregation || 'sum').toUpperCase()}(${quoteIdentifier(binding.metricColumn)})` : 'COUNT(*)';
  return `SELECT ${dimension} AS label, ${metricExpression} AS value FROM ${tableRef} GROUP BY label ORDER BY value DESC LIMIT 10`;
}

function buildInsightSql(dataset, tableName, binding) {
  const tableRef = `\`${dataset}.${tableName}\``;
  const summaryColumns = [binding.dimensionColumn, binding.metricColumn, binding.timeColumn].filter(Boolean);
  if (summaryColumns.length > 0) {
    return `SELECT ${summaryColumns.map((column) => quoteIdentifier(column)).join(', ')} FROM ${tableRef}${binding.timeColumn ? ` ORDER BY ${quoteIdentifier(binding.timeColumn)} DESC` : ''} LIMIT 20`;
  }
  return `SELECT * FROM ${tableRef} LIMIT 20`;
}

function compileQuery(dataset, binding, widgetType) {
  if (!binding.table) {
    return {
      id: binding.queryRef,
      source: 'warehouse',
      template: 'SELECT 0 AS value',
      params: ['timeRange'],
      refresh: '300s',
    };
  }

  let template = 'SELECT 0 AS value';
  if (widgetType === 'text-insight' || widgetType === 'record-list') {
    template = buildInsightSql(dataset, binding.table, binding);
  } else if (widgetType === 'progress-list' || widgetType === 'pie-chart' || widgetType === 'status-list' || widgetType === 'segmented-bar') {
    template = buildDimensionSql(dataset, binding.table, binding);
  } else {
    template = buildMetricSql(dataset, binding.table, binding, widgetType);
  }

  const params = [];
  if (binding.timeColumn) params.push('timeRange');

  return {
    id: binding.queryRef,
    source: 'warehouse',
    template,
    params,
    refresh: widgetType === 'metric' ? '60s' : '300s',
  };
}

export function compileDashboardSpecs(dataset, bindings) {
  const specs = {};

  for (const viewId of VIEW_ORDER) {
    const template = VIEW_TEMPLATES[viewId];
    const viewBindings = bindings.views[viewId] || { title: template.title, widgets: [] };
    const bindingMap = new Map((viewBindings.widgets || []).map((widget) => [widget.id, widget]));
    const queries = [];

    specs[viewId] = {
      layout: template.layout,
      title: viewBindings.title || template.title,
      timeRange: template.timeRange,
      widgets: template.widgets.map((widget) => {
        const binding = bindingMap.get(widget.id) || { id: widget.id, title: widget.title, queryRef: widget.id };
        const query = compileQuery(dataset, binding, widget.type);
        queries.push(query);
        return {
          id: widget.id,
          type: widget.type,
          size: widget.size,
          title: binding.title || widget.title,
          queryRef: binding.queryRef || widget.id,
          config: {},
        };
      }),
      queries,
    };
  }

  return specs;
}

export function compileMindmapArtifact(catalog, bindings, specs) {
  const tables = (catalog.tables || []).map(summarizeTable);
  const sourceMap = new Map();

  for (const table of tables) {
    if (!sourceMap.has(table.source.id)) {
      sourceMap.set(table.source.id, {
        id: table.source.id,
        name: table.source.name,
        type: table.source.type,
        groupId: table.source.groupId,
        tables: [],
      });
    }
    sourceMap.get(table.source.id).tables.push(table);
  }

  const connector = Array.from(sourceMap.values()).map((source) => ({
    id: source.id,
    name: source.name,
    type: source.type,
  }));

  const adjustedData = tables.map((table) => ({
    id: `cat-${table.short_name}`,
    origin_id: table.source.id,
    name: titleCase(table.short_name),
    title: titleCase(table.short_name),
    columns: table.columns.map((column) => ({
      id: `col-${table.short_name}-${slugify(column.name)}`,
      name: column.name,
      type: String(column.type || '').toLowerCase(),
      status: 'ok',
    })),
  }));

  const group = VIEW_ORDER.map((viewId) => ({
    id: viewId,
    title: VIEW_TEMPLATES[viewId].title,
    name: VIEW_TEMPLATES[viewId].title,
    activationMode: 'automatic',
  }));

  const insight = [];
  for (const viewId of VIEW_ORDER) {
    const viewBindings = bindings.views[viewId];
    for (const widget of viewBindings?.widgets || []) {
      insight.push({
        id: `ins-${widget.id}`,
        title: widget.title,
        name: widget.title,
        group_id: viewId,
        adjusted_data_columns: [widget.dimensionColumn, widget.metricColumn, widget.timeColumn].filter(Boolean),
        lineage: { source_keys: widget.table ? [`cat-${widget.table}`] : [] },
      });
    }
  }

  const transformations = {};
  const gold = {};
  const sourceMetadata = [];

  for (const source of sourceMap.values()) {
    transformations[source.id] = source.tables.map((table) => ({
      id: `action-${table.short_name}`,
      title: `Model ${titleCase(table.short_name)}`,
      name: `Model ${titleCase(table.short_name)}`,
    }));

    gold[source.id] = source.tables.map((table) => ({
      id: `gold-${table.short_name}`,
      title: titleCase(table.short_name),
      description: `${table.row_count || 0} rows discovered`,
      columns: table.columns.slice(0, 6).map((column) => ({
        id: `gold-col-${table.short_name}-${slugify(column.name)}`,
        name: column.name,
        title: titleCase(column.name),
        type: String(column.type || '').toLowerCase(),
        status: 'ok',
      })),
    }));

    sourceMetadata.push({
      sourceId: source.id,
      transformations: transformations[source.id],
      goldViews: gold[source.id],
    });
  }

  const manifestInsights = insight.map((entry) => ({
    id: entry.id,
    title: entry.title,
    group_id: entry.group_id,
    queryRef: entry.id.replace(/^ins-/, ''),
  }));

  const mindmapManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    layers: {
      sources: connector.map((source) => ({
        id: source.id,
        title: source.name,
        type: source.type,
      })),
      groups: group.map((entry) => ({
        id: entry.id,
        title: entry.title,
        activationMode: entry.activationMode,
      })),
      insights: manifestInsights,
      transformations,
      gold,
    },
    editing: {
      lifecycle: ['draft', 'compile', 'validate', 'activate'],
    },
    specs,
  };

  return {
    connector,
    actionType: [],
    origin: [],
    adjustedData,
    group,
    insight,
    mindmapManifest,
    mindmapYaml: '',
    sourceMetadata,
  };
}
