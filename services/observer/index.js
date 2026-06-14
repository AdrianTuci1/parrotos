import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const PORT = parseInt(process.env.PORT || '8082', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-internal-token';
const GCS_BUCKET = process.env.GCS_BUCKET || 'sentry-platform-data';
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const HARNESS_SERVICE_URL = (process.env.HARNESS_SERVICE_URL || 'http://localhost:8081').replace(/\/$/, '');
const BIGQUERY_LOCATION = process.env.BQ_LOCATION || process.env.BIGQUERY_LOCATION || 'EU';
const VIEW_ORDER = ['servers', 'financial', 'sales', 'marketing', 'web'];

const DEFAULT_SETTINGS = {
  enabled: true,
  cadence: 'every_2_days',
  autoHealBindings: true,
  autoOptimizeQueries: true,
  freshnessWarningHours: 48,
  freshnessErrorHours: 96,
  costWarningBytes: 1_000_000_000,
  costErrorBytes: 10_000_000_000,
};

const KNOWN_SOURCE_LABELS = {
  ga4: { groupId: 'web' },
  search_console: { groupId: 'web' },
  google_ads: { groupId: 'marketing' },
  meta_ads: { groupId: 'marketing' },
  tiktok_ads: { groupId: 'marketing' },
  stripe: { groupId: 'financial' },
  shopify: { groupId: 'sales' },
  woocommerce: { groupId: 'sales' },
  posthog: { groupId: 'web' },
  sentry: { groupId: 'servers' },
  prometheus: { groupId: 'servers' },
  postgres: { groupId: 'servers' },
  postgresql: { groupId: 'servers' },
  mysql: { groupId: 'servers' },
  mongodb: { groupId: 'servers' },
  bigquery: { groupId: 'servers' },
  hubspot: { groupId: 'sales' },
  salesforce: { groupId: 'sales' },
  vercel: { groupId: 'servers' },
};

function requireInternalToken(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(requireInternalToken);

function getBigQuery() {
  return new BigQuery({ location: BIGQUERY_LOCATION });
}

function getStorage() {
  return new Storage();
}

function artifactPath(orgId, projectId, filename) {
  return `specs/${orgId}/${projectId}/${filename}`;
}

async function readJsonArtifact(orgId, projectId, filename) {
  try {
    const bucket = getStorage().bucket(GCS_BUCKET);
    const [content] = await bucket.file(artifactPath(orgId, projectId, filename)).download();
    return JSON.parse(content.toString());
  } catch {
    return null;
  }
}

async function writeJsonArtifact(orgId, projectId, filename, payload) {
  const bucket = getStorage().bucket(GCS_BUCKET);
  await bucket.file(artifactPath(orgId, projectId, filename)).save(JSON.stringify(payload, null, 2), {
    contentType: 'application/json',
  });
}

function normalizeSettings(input = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...input,
  };
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function detectSourceKey(shortName = '') {
  const normalized = slugify(shortName);
  const directMatch = Object.keys(KNOWN_SOURCE_LABELS).find((key) => normalized === key || normalized.startsWith(`${key}_`));
  if (directMatch) return directMatch;
  return normalized.split('_')[0] || 'warehouse';
}

function inferGroupId(columns = [], shortName = '') {
  const sourceKey = detectSourceKey(shortName);
  if (KNOWN_SOURCE_LABELS[sourceKey]?.groupId) {
    return KNOWN_SOURCE_LABELS[sourceKey].groupId;
  }

  const names = columns.map((column) => String(column.name).toLowerCase());
  if (names.some((name) => name.includes('campaign') || name.includes('ad_') || name.includes('impression'))) return 'marketing';
  if (names.some((name) => name.includes('order') || name.includes('sku') || name.includes('cart'))) return 'sales';
  if (names.some((name) => name.includes('revenue') || name.includes('invoice') || name.includes('payment') || name.includes('mrr'))) return 'financial';
  if (names.some((name) => name.includes('session') || name.includes('visitor') || name.includes('page') || name.includes('referrer'))) return 'web';
  return 'servers';
}

function detectTimeColumn(columns = []) {
  const timeByType = columns.find((column) => ['TIMESTAMP', 'DATETIME', 'DATE'].includes(String(column.type || '').toUpperCase()));
  if (timeByType) return timeByType.name;
  return columns.find((column) => /(_at|date|time|timestamp)$/i.test(column.name))?.name || null;
}

function detectNumericColumns(columns = []) {
  return columns
    .filter((column) => ['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'].includes(String(column.type || '').toUpperCase()))
    .map((column) => column.name);
}

function detectDimensionColumns(columns = []) {
  return columns
    .filter((column) => ['STRING', 'BOOL', 'BOOLEAN'].includes(String(column.type || '').toUpperCase()))
    .map((column) => column.name);
}

function parseTimeType(columns = [], timeColumn) {
  return columns.find((column) => column.name === timeColumn)?.type || null;
}

function parseRefreshToMs(value = '300s') {
  const match = String(value).match(/^(\d+)(s|m|h)$/);
  if (!match) return 300000;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 's') return amount * 1000;
  if (unit === 'm') return amount * 60000;
  return amount * 3600000;
}

function refreshFromMs(value) {
  if (value >= 3600000) return `${Math.round(value / 3600000)}h`;
  if (value >= 60000) return `${Math.round(value / 60000)}m`;
  return `${Math.round(value / 1000)}s`;
}

function substituteMacros(query) {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 3600 * 1000);
  const previousFrom = new Date(now.getTime() - 48 * 3600 * 1000);
  const previousTo = from;
  return query
    .replace(/\$__timeFrom/g, `TIMESTAMP("${from.toISOString()}")`)
    .replace(/\$__timeTo/g, `TIMESTAMP("${now.toISOString()}")`)
    .replace(/\$__previousTimeFrom/g, `TIMESTAMP("${previousFrom.toISOString()}")`)
    .replace(/\$__previousTimeTo/g, `TIMESTAMP("${previousTo.toISOString()}")`);
}

async function discoverTables(dataset) {
  const bigquery = getBigQuery();
  const [tableList] = await bigquery.dataset(dataset).getTables();
  const summaries = [];

  for (const table of tableList) {
    try {
      const [metadata] = await bigquery.dataset(dataset).table(table.id).getMetadata();
      const columns = (metadata.schema?.fields || []).map((field) => ({
        name: field.name,
        type: field.type,
        mode: field.mode,
      }));
      const timeColumn = detectTimeColumn(columns);
      summaries.push({
        table: `${dataset}.${table.id}`,
        shortName: table.id,
        rowCount: Number(metadata.numRows || 0),
        columns,
        timeColumn,
        timeColumnType: parseTimeType(columns, timeColumn),
        numericColumns: detectNumericColumns(columns),
        dimensionColumns: detectDimensionColumns(columns),
        sourceId: detectSourceKey(table.id),
        groupId: inferGroupId(columns, table.id),
        partitioning: metadata.timePartitioning || null,
        clustering: metadata.clustering?.fields || [],
      });
    } catch (error) {
      summaries.push({
        table: `${dataset}.${table.id}`,
        shortName: table.id,
        rowCount: 0,
        columns: [],
        timeColumn: null,
        timeColumnType: null,
        numericColumns: [],
        dimensionColumns: [],
        sourceId: detectSourceKey(table.id),
        groupId: 'servers',
        partitioning: null,
        clustering: [],
        inspectError: error.message,
      });
    }
  }

  return summaries;
}

async function getLatestTimestamp(dataset, table, timeColumn, timeColumnType) {
  if (!timeColumn) return null;
  const bigquery = getBigQuery();
  const columnExpr = String(timeColumnType || '').toUpperCase() === 'DATE'
    ? `TIMESTAMP(\`${timeColumn}\`)`
    : `\`${timeColumn}\``;
  const query = `SELECT MAX(${columnExpr}) AS latest_value FROM \`${dataset}.${table}\``;
  const [rows] = await bigquery.query({ query, location: BIGQUERY_LOCATION });
  const value = rows[0]?.latest_value?.value || rows[0]?.latest_value || null;
  return value ? new Date(value).toISOString() : null;
}

async function getColumnNullRatios(dataset, table, columns) {
  if (!Array.isArray(columns) || columns.length === 0) return {};
  const selected = columns.slice(0, 3);
  const expressions = selected.map((column) => `SAFE_DIVIDE(COUNTIF(\`${column}\` IS NULL), COUNT(*)) AS \`${column}\``);
  const query = `SELECT ${expressions.join(', ')} FROM \`${dataset}.${table}\``;
  const bigquery = getBigQuery();
  const [rows] = await bigquery.query({ query, location: BIGQUERY_LOCATION });
  return rows[0] || {};
}

function compareSnapshots(previous, current) {
  if (!previous?.tables) {
    return [];
  }

  const previousTables = new Map(previous.tables.map((table) => [table.shortName, table]));
  const currentTables = new Map(current.tables.map((table) => [table.shortName, table]));
  const issues = [];

  for (const tableName of currentTables.keys()) {
    if (!previousTables.has(tableName)) {
      issues.push({
        key: `table-added:${tableName}`,
        severity: 'info',
        type: 'schema_drift',
        message: `New table detected: ${tableName}`,
        details: { table: tableName },
      });
    }
  }

  for (const tableName of previousTables.keys()) {
    if (!currentTables.has(tableName)) {
      issues.push({
        key: `table-removed:${tableName}`,
        severity: 'warning',
        type: 'schema_drift',
        message: `Table removed: ${tableName}`,
        details: { table: tableName },
      });
    }
  }

  for (const [tableName, currentTable] of currentTables.entries()) {
    const previousTable = previousTables.get(tableName);
    if (!previousTable) continue;
    const previousColumns = new Set((previousTable.columns || []).map((column) => column.name));
    const currentColumns = new Set((currentTable.columns || []).map((column) => column.name));

    for (const column of currentColumns) {
      if (!previousColumns.has(column)) {
        issues.push({
          key: `column-added:${tableName}:${column}`,
          severity: 'info',
          type: 'schema_drift',
          message: `Column added: ${tableName}.${column}`,
          details: { table: tableName, column },
        });
      }
    }

    for (const column of previousColumns) {
      if (!currentColumns.has(column)) {
        issues.push({
          key: `column-removed:${tableName}:${column}`,
          severity: 'warning',
          type: 'schema_drift',
          message: `Column removed: ${tableName}.${column}`,
          details: { table: tableName, column },
        });
      }
    }
  }

  return issues;
}

function chooseFallbackTable(binding, tables) {
  const candidates = tables
    .map((table) => ({
      table,
      score:
        (binding.sourceId && table.sourceId === binding.sourceId ? 10 : 0) +
        (binding.groupId && table.groupId === binding.groupId ? 7 : 0) +
        (binding.table && table.shortName === binding.table ? 100 : 0) +
        Math.min(5, Math.floor(Math.log10((table.rowCount || 0) + 1))),
    }))
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.table || null;
}

function reconcileBinding(binding, tablesByName, allTables) {
  const currentTable = binding.table ? tablesByName.get(binding.table) : null;
  const fallbackTable = currentTable || chooseFallbackTable(binding, allTables);
  if (!fallbackTable) {
    return { binding, changed: false, reasons: [] };
  }

  const nextBinding = { ...binding };
  const reasons = [];

  if (nextBinding.table !== fallbackTable.shortName) {
    nextBinding.table = fallbackTable.shortName;
    nextBinding.sourceId = fallbackTable.sourceId;
    nextBinding.groupId = fallbackTable.groupId;
    nextBinding.multiSource = null;
    reasons.push('table_reassigned');
  }

  const availableColumns = new Set(fallbackTable.columns.map((column) => column.name));

  if (nextBinding.metricColumn && !availableColumns.has(nextBinding.metricColumn)) {
    nextBinding.metricColumn = fallbackTable.numericColumns[0] || null;
    reasons.push('metric_column_healed');
  } else if (!nextBinding.metricColumn && fallbackTable.numericColumns[0]) {
    nextBinding.metricColumn = fallbackTable.numericColumns[0];
    reasons.push('metric_column_filled');
  }

  if (nextBinding.dimensionColumn && !availableColumns.has(nextBinding.dimensionColumn)) {
    nextBinding.dimensionColumn = fallbackTable.dimensionColumns[0] || null;
    reasons.push('dimension_column_healed');
  }

  if (nextBinding.timeColumn && !availableColumns.has(nextBinding.timeColumn)) {
    nextBinding.timeColumn = fallbackTable.timeColumn;
    reasons.push('time_column_healed');
  } else if (!nextBinding.timeColumn && fallbackTable.timeColumn) {
    nextBinding.timeColumn = fallbackTable.timeColumn;
    reasons.push('time_column_filled');
  }

  if (nextBinding.multiSource?.enabled && Array.isArray(nextBinding.multiSource.sources)) {
    const healedSources = nextBinding.multiSource.sources
      .map((source) => {
        const sourceTable = tablesByName.get(source.table);
        if (!sourceTable) return null;
        return {
          table: sourceTable.shortName,
          sourceId: sourceTable.sourceId,
          metricColumn: sourceTable.columns.some((column) => column.name === source.metricColumn)
            ? source.metricColumn
            : (sourceTable.numericColumns[0] || null),
          dimensionColumn: sourceTable.columns.some((column) => column.name === source.dimensionColumn)
            ? source.dimensionColumn
            : (sourceTable.dimensionColumns[0] || null),
          timeColumn: sourceTable.columns.some((column) => column.name === source.timeColumn)
            ? source.timeColumn
            : sourceTable.timeColumn,
        };
      })
      .filter(Boolean);

    if (healedSources.length <= 1) {
      nextBinding.multiSource = null;
      reasons.push('multi_source_simplified');
    } else {
      nextBinding.multiSource = {
        enabled: true,
        sources: healedSources,
      };
    }
  }

  const changed = JSON.stringify(nextBinding) !== JSON.stringify(binding);
  return { binding: nextBinding, changed, reasons };
}

function buildBindingPatch(existingBindings, tableSummaries) {
  const tablesByName = new Map(tableSummaries.map((table) => [table.shortName, table]));
  const patchViews = {};
  const healEvents = [];

  for (const [viewId, viewBinding] of Object.entries(existingBindings?.views || {})) {
    const updatedWidgets = [];
    for (const widgetBinding of viewBinding.widgets || []) {
      const reconciled = reconcileBinding(widgetBinding, tablesByName, tableSummaries);
      if (reconciled.changed) {
        updatedWidgets.push(reconciled.binding);
        healEvents.push({
          key: `binding-heal:${viewId}:${widgetBinding.id}`,
          severity: 'warning',
          type: 'binding_heal',
          message: `Observer healed binding for ${viewId}/${widgetBinding.id}`,
          details: {
            viewId,
            widgetId: widgetBinding.id,
            reasons: reconciled.reasons,
          },
        });
      }
    }

    if (updatedWidgets.length > 0) {
      patchViews[viewId] = {
        title: viewBinding.title,
        widgets: updatedWidgets,
      };
    }
  }

  return {
    patchViews,
    healEvents,
  };
}

async function applyBindingPatch(orgId, projectId, dataset, patchViews) {
  const response = await fetch(`${HARNESS_SERVICE_URL}/bindings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': INTERNAL_TOKEN,
    },
    body: JSON.stringify({
      orgId,
      projectId,
      dataset,
      patch: { views: patchViews },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Harness patch failed: ${response.status}`);
  }

  return payload;
}

async function loadSpecs(orgId, projectId) {
  const specs = {};
  for (const viewId of VIEW_ORDER) {
    const spec = await readJsonArtifact(orgId, projectId, `dashboard_specs/${viewId}.json`);
    if (spec) {
      specs[viewId] = spec;
    }
  }
  return specs;
}

async function validateQuery(query) {
  const bigquery = getBigQuery();
  const queryText = substituteMacros(query.template);
  const [job] = await bigquery.createQueryJob({
    query: queryText,
    dryRun: true,
    useLegacySql: false,
    location: BIGQUERY_LOCATION,
  });
  const metadata = job.metadata || {};
  const totalBytesProcessed = Number(metadata.statistics?.totalBytesProcessed || 0);
  return {
    queryId: query.id,
    sourceId: query.sourceId || null,
    totalBytesProcessed,
  };
}

async function validateSpecs(specs, settings) {
  const diagnostics = [];

  for (const [viewId, spec] of Object.entries(specs)) {
    for (const query of spec.queries || []) {
      if (query.source !== 'warehouse') continue;

      try {
        const dryRun = await validateQuery(query);
        let severity = 'ok';
        if (dryRun.totalBytesProcessed >= settings.costErrorBytes) severity = 'error';
        else if (dryRun.totalBytesProcessed >= settings.costWarningBytes) severity = 'warning';

        diagnostics.push({
          ...dryRun,
          viewId,
          refresh: query.refresh,
          severity,
        });
      } catch (error) {
        diagnostics.push({
          queryId: query.id,
          sourceId: query.sourceId || null,
          viewId,
          refresh: query.refresh,
          totalBytesProcessed: 0,
          severity: 'error',
          error: error.message,
        });
      }
    }
  }

  return diagnostics;
}

function optimizeRefreshIntervals(specs, diagnostics, settings) {
  if (!settings.autoOptimizeQueries) {
    return { specs, optimizations: [] };
  }

  const diagMap = new Map(diagnostics.map((item) => [item.queryId, item]));
  const nextSpecs = JSON.parse(JSON.stringify(specs));
  const optimizations = [];

  for (const [viewId, spec] of Object.entries(nextSpecs)) {
    spec.queries = (spec.queries || []).map((query) => {
      const diagnostic = diagMap.get(query.id);
      if (!diagnostic || diagnostic.severity === 'error') {
        return query;
      }

      let targetMs = parseRefreshToMs(query.refresh || '300s');
      if (diagnostic.totalBytesProcessed >= settings.costErrorBytes) {
        targetMs = Math.max(targetMs, 3600000);
      } else if (diagnostic.totalBytesProcessed >= settings.costWarningBytes) {
        targetMs = Math.max(targetMs, 900000);
      }

      const nextRefresh = refreshFromMs(targetMs);
      if (nextRefresh !== query.refresh) {
        optimizations.push({
          key: `refresh-optimized:${viewId}:${query.id}`,
          severity: 'info',
          type: 'query_optimization',
          message: `Observer slowed refresh for ${viewId}/${query.id}`,
          details: {
            viewId,
            queryId: query.id,
            from: query.refresh,
            to: nextRefresh,
            bytesProcessed: diagnostic.totalBytesProcessed,
          },
        });
        return {
          ...query,
          refresh: nextRefresh,
        };
      }

      return query;
    });
  }

  return { specs: nextSpecs, optimizations };
}

async function writeSpecs(orgId, projectId, specs) {
  await Promise.all(Object.entries(specs).map(([viewId, spec]) => (
    writeJsonArtifact(orgId, projectId, `dashboard_specs/${viewId}.json`, spec)
  )));
}

function buildFreshnessIssue(tableHealth, settings) {
  if (!tableHealth.latestTimestamp || !tableHealth.timeColumn) return null;
  const ageHours = (Date.now() - Date.parse(tableHealth.latestTimestamp)) / 3600000;
  if (Number.isNaN(ageHours)) return null;
  if (ageHours >= settings.freshnessErrorHours) {
    return {
      key: `freshness-error:${tableHealth.shortName}`,
      severity: 'error',
      type: 'freshness',
      message: `Table ${tableHealth.shortName} is stale`,
      details: {
        table: tableHealth.shortName,
        latestTimestamp: tableHealth.latestTimestamp,
        ageHours: Math.round(ageHours),
      },
    };
  }
  if (ageHours >= settings.freshnessWarningHours) {
    return {
      key: `freshness-warning:${tableHealth.shortName}`,
      severity: 'warning',
      type: 'freshness',
      message: `Table ${tableHealth.shortName} is aging`,
      details: {
        table: tableHealth.shortName,
        latestTimestamp: tableHealth.latestTimestamp,
        ageHours: Math.round(ageHours),
      },
    };
  }
  return null;
}

function summarizeStatus(issues) {
  if (issues.some((issue) => issue.severity === 'error')) return 'error';
  if (issues.some((issue) => issue.severity === 'warning')) return 'warning';
  return 'ok';
}

function buildRecommendations(tableHealth, diagnostics) {
  const recommendations = [];
  for (const table of tableHealth) {
    if (!table.partitioning && table.timeColumn && table.rowCount > 1_000_000) {
      recommendations.push({
        category: 'storage',
        message: `Consider partitioning ${table.shortName} by ${table.timeColumn} to reduce scan cost.`,
      });
    }
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === 'warning' || diagnostic.severity === 'error') {
      recommendations.push({
        category: 'query_cost',
        message: `Query ${diagnostic.queryId} in ${diagnostic.viewId} scans ${diagnostic.totalBytesProcessed} bytes per run.`,
      });
    }
  }

  return recommendations;
}

async function postAlerts(orgId, projectId, issues, previousReport) {
  const knownIssues = new Set((previousReport?.openIssues || []).map((issue) => issue.key));
  const newIssues = issues.filter((issue) => issue.severity !== 'info' && !knownIssues.has(issue.key));

  await Promise.all(newIssues.map(async (issue) => {
    try {
      await fetch(`${BACKEND_URL}/organizations/${orgId}/projects/${projectId}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: issue.type,
          severity: issue.severity,
          message: issue.message,
          details: issue.details,
        }),
      });
    } catch {
      // Alert fanout is best effort; health report remains the source of truth.
    }
  }));

  return newIssues.length;
}

async function inspectTables(dataset, settings, tableSummaries) {
  const tableHealth = [];
  const issues = [];

  for (const table of tableSummaries) {
    const trackedColumns = [table.timeColumn, table.dimensionColumns[0], table.numericColumns[0]].filter(Boolean);
    let latestTimestamp = null;
    let nullRatios = {};

    try {
      latestTimestamp = await getLatestTimestamp(dataset, table.shortName, table.timeColumn, table.timeColumnType);
    } catch (error) {
      issues.push({
        key: `freshness-query:${table.shortName}`,
        severity: 'warning',
        type: 'freshness_query',
        message: `Could not evaluate freshness for ${table.shortName}`,
        details: { table: table.shortName, error: error.message },
      });
    }

    try {
      nullRatios = await getColumnNullRatios(dataset, table.shortName, trackedColumns);
    } catch (error) {
      issues.push({
        key: `null-ratio-query:${table.shortName}`,
        severity: 'warning',
        type: 'data_quality',
        message: `Could not evaluate null ratios for ${table.shortName}`,
        details: { table: table.shortName, error: error.message },
      });
    }

    const tableEntry = {
      shortName: table.shortName,
      rowCount: table.rowCount,
      timeColumn: table.timeColumn,
      latestTimestamp,
      nullRatios,
      partitioning: table.partitioning,
      clustering: table.clustering,
      sourceId: table.sourceId,
      groupId: table.groupId,
    };
    tableHealth.push(tableEntry);

    const freshnessIssue = buildFreshnessIssue(tableEntry, settings);
    if (freshnessIssue) {
      issues.push(freshnessIssue);
    }
  }

  return { tableHealth, issues };
}

async function runObserver({ orgId, projectId, dataset, trigger, settings: rawSettings }) {
  const settings = normalizeSettings(rawSettings);
  const previousSnapshot = await readJsonArtifact(orgId, projectId, 'monitoring/schema_snapshot.json');
  const previousReport = await readJsonArtifact(orgId, projectId, 'monitoring/health_report.json');

  const tableSummaries = await discoverTables(dataset);
  const schemaSnapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    dataset,
    tables: tableSummaries.map((table) => ({
      shortName: table.shortName,
      rowCount: table.rowCount,
      columns: table.columns,
      timeColumn: table.timeColumn,
      sourceId: table.sourceId,
      groupId: table.groupId,
      partitioning: table.partitioning,
      clustering: table.clustering,
    })),
  };

  const schemaIssues = compareSnapshots(previousSnapshot, schemaSnapshot);
  const existingBindings = await readJsonArtifact(orgId, projectId, 'view_bindings.json');
  const { patchViews, healEvents } = buildBindingPatch(existingBindings, tableSummaries);

  let autoHealApplied = false;
  let autoHealError = null;
  if (settings.autoHealBindings && Object.keys(patchViews).length > 0) {
    try {
      await applyBindingPatch(orgId, projectId, dataset, patchViews);
      autoHealApplied = true;
    } catch (error) {
      autoHealError = error.message;
    }
  }

  const specs = await loadSpecs(orgId, projectId);
  const diagnostics = await validateSpecs(specs, settings);
  const { specs: optimizedSpecs, optimizations } = optimizeRefreshIntervals(specs, diagnostics, settings);

  if (JSON.stringify(optimizedSpecs) !== JSON.stringify(specs)) {
    await writeSpecs(orgId, projectId, optimizedSpecs);
  }

  const { tableHealth, issues: tableIssues } = await inspectTables(dataset, settings, tableSummaries);
  const queryIssues = diagnostics
    .filter((diagnostic) => diagnostic.severity === 'warning' || diagnostic.severity === 'error')
    .map((diagnostic) => ({
      key: `query:${diagnostic.viewId}:${diagnostic.queryId}`,
      severity: diagnostic.severity,
      type: 'query_health',
      message: diagnostic.error
        ? `Query ${diagnostic.queryId} in ${diagnostic.viewId} failed dry-run validation`
        : `Query ${diagnostic.queryId} in ${diagnostic.viewId} is expensive`,
      details: diagnostic,
    }));

  const issues = [
    ...schemaIssues,
    ...healEvents,
    ...tableIssues,
    ...queryIssues,
    ...optimizations,
  ];

  if (autoHealError) {
    issues.push({
      key: `binding-heal-error:${orgId}:${projectId}`,
      severity: 'error',
      type: 'binding_heal',
      message: 'Observer failed to apply binding heal patch',
      details: { error: autoHealError },
    });
  }

  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    orgId,
    projectId,
    dataset,
    trigger,
    status: summarizeStatus(issues),
    settings,
    summary: {
      tableCount: tableSummaries.length,
      schemaIssueCount: schemaIssues.length,
      staleTableCount: issues.filter((issue) => issue.type === 'freshness').length,
      queryIssueCount: queryIssues.length,
      autoHealApplied,
      optimizedQueryCount: optimizations.length,
    },
    tables: tableHealth,
    queryDiagnostics: diagnostics,
    recommendations: buildRecommendations(tableHealth, diagnostics),
    openIssues: issues,
  };

  await writeJsonArtifact(orgId, projectId, 'monitoring/schema_snapshot.json', schemaSnapshot);
  await writeJsonArtifact(orgId, projectId, 'monitoring/health_report.json', report);
  const alertsSent = await postAlerts(orgId, projectId, issues, previousReport);

  return {
    status: 'completed',
    report,
    healedViews: Object.keys(patchViews).length,
    alertsSent,
  };
}

app.post('/run', async (req, res) => {
  const { orgId, projectId, dataset, trigger = 'manual', settings } = req.body || {};
  if (!orgId || !projectId || !dataset) {
    return res.status(400).json({ error: 'orgId, projectId, dataset required' });
  }

  try {
    const result = await runObserver({ orgId, projectId, dataset, trigger, settings });
    return res.json(result);
  } catch (error) {
    console.error('[OBSERVER]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Observer Service running on :${PORT}`);
});
