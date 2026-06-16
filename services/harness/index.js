import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { buildDefaultBindings, compileDashboardSpecs, compileMindmapArtifact, mergeBindings } from './specCompiler.js';
import { VIEW_ORDER } from './viewTemplates.js';
import client from 'prom-client';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '8081', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-internal-token';

// Prometheus
const promRegister = new client.Registry();
promRegister.setDefaultLabels({ app: 'sentry-harness' });
client.collectDefaultMetrics({ register: promRegister });

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'deepseek';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash';
const LLM_MODEL_ID = process.env.LLM_MODEL_ID || process.env.LLM_MODEL || 'deepseek-v4-flash';
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
const GCS_BUCKET = process.env.GCS_BUCKET || 'sentry-platform-data';

function requireInternalToken(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Prometheus metrics — no auth required
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', promRegister.contentType);
  res.end(await promRegister.metrics());
});

app.use(requireInternalToken);

// ═══════════════════════════════════════════════════
// GENERATION STATE (in-memory progress tracking)
// ═══════════════════════════════════════════════════

const STARTED_AT = new Date().toISOString();
const generationState = {
  currentJob: null,   // { orgId, projectId, stage, startedAt, tablesDiscovered, tablesTotal, _token }
  lastJob: null,      // { orgId, projectId, completedAt, durationMs, tablesProcessed, viewsUpdated, success, error }
  pendingTrigger: null, // { orgId, projectId, queuedAt } — another request arrived while busy
  uptime: () => Math.floor((Date.now() - new Date(STARTED_AT).getTime()) / 1000),
};

function setGenerationStage(stage, meta = {}) {
  if (!generationState.currentJob) return;
  generationState.currentJob.stage = stage;
  if (meta.tablesDiscovered !== undefined) generationState.currentJob.tablesDiscovered = meta.tablesDiscovered;
  if (meta.tablesTotal !== undefined) generationState.currentJob.tablesTotal = meta.tablesTotal;
}

function tryStartJob(orgId, projectId, forceFull) {
  if (generationState.currentJob) {
    // Already running — queue the new request as pending
    generationState.pendingTrigger = { orgId, projectId, queuedAt: new Date().toISOString() };
    return null; // caller must return 409
  }
  const token = Math.random().toString(36).slice(2);
  generationState.pendingTrigger = null;
  generationState.currentJob = {
    orgId,
    projectId,
    forceFull: Boolean(forceFull),
    stage: 'discovering',
    startedAt: new Date().toISOString(),
    tablesDiscovered: 0,
    tablesTotal: 0,
    _token: token,
  };
  return token;
}

function finishJob(token, success, result = null, error = null) {
  if (!generationState.currentJob) return;
  // Only finish if this token matches the current job (prevents stale finishes)
  if (token !== null && generationState.currentJob._token !== token) return;
  const job = generationState.currentJob;
  generationState.lastJob = {
    orgId: job.orgId,
    projectId: job.projectId,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - new Date(job.startedAt).getTime(),
    tablesProcessed: result?.catalog?.total_tables ?? job.tablesDiscovered,
    viewsUpdated: result?.specs ? Object.keys(result.specs).length : 0,
    success,
    error: error?.message || null,
  };
  generationState.currentJob = null;
}

function getStorage() {
  return new Storage();
}

function getBigQuery() {
  return new BigQuery();
}

function getProjectPrefix(orgId, projectId) {
  return `specs/${orgId}/${projectId}`;
}

function artifactPath(orgId, projectId, filename) {
  return `${getProjectPrefix(orgId, projectId)}/${filename}`;
}

function hasLlm() {
  return Boolean(LLM_API_KEY && LLM_MODEL);
}

async function readJsonArtifact(orgId, projectId, filename) {
  try {
    const bucket = getStorage().bucket(GCS_BUCKET);
    const [contents] = await bucket.file(artifactPath(orgId, projectId, filename)).download();
    return JSON.parse(contents.toString());
  } catch {
    return null;
  }
}

async function writeJsonArtifact(orgId, projectId, filename, payload) {
  const bucket = getStorage().bucket(GCS_BUCKET);
  await bucket.file(artifactPath(orgId, projectId, filename)).save(JSON.stringify(payload, null, 2), {
    contentType: 'application/json',
  });
  return `gs://${GCS_BUCKET}/${artifactPath(orgId, projectId, filename)}`;
}

async function discoverData(dataset) {
  const bigquery = getBigQuery();
  const tables = [];

  try {
    const [tableList] = await bigquery.dataset(dataset).getTables();
    for (const table of tableList) {
      const tableId = `${dataset}.${table.id}`;
      try {
        const [countRows] = await bigquery.query(`SELECT COUNT(*) AS cnt FROM \`${tableId}\``);
        const rowCount = countRows[0]?.cnt || 0;
        if (rowCount === 0) continue;

        const [metadata] = await bigquery.dataset(dataset).table(table.id).getMetadata();
        const columns = (metadata.schema?.fields || []).map((field) => ({
          name: field.name,
          type: field.type,
          mode: field.mode,
        }));
        const [sampleRows] = await bigquery.query(`SELECT * FROM \`${tableId}\` LIMIT 5`);

        tables.push({
          table: tableId,
          short_name: table.id,
          row_count: Number(rowCount),
          columns,
          sample: sampleRows.map((row) => Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, value?.value ?? value]),
          )),
        });
      } catch (error) {
        console.warn(`[DISCOVER] skipping ${tableId}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`[DISCOVER] ${error.message}`);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    dataset,
    tables,
    total_tables: tables.length,
  };
}

function sanitizeBindingCandidate(candidate, fallback) {
  if (!candidate || typeof candidate !== 'object') return fallback;
  return {
    ...fallback,
    title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title.trim() : fallback.title,
    table: typeof candidate.table === 'string' && candidate.table.trim() ? candidate.table.trim() : fallback.table,
    metricColumn: typeof candidate.metricColumn === 'string' && candidate.metricColumn.trim() ? candidate.metricColumn.trim() : fallback.metricColumn,
    dimensionColumn: typeof candidate.dimensionColumn === 'string' && candidate.dimensionColumn.trim() ? candidate.dimensionColumn.trim() : fallback.dimensionColumn,
    timeColumn: typeof candidate.timeColumn === 'string' && candidate.timeColumn.trim() ? candidate.timeColumn.trim() : fallback.timeColumn,
    aggregation: typeof candidate.aggregation === 'string' && candidate.aggregation.trim() ? candidate.aggregation.trim().toLowerCase() : fallback.aggregation,
    queryIntent: typeof candidate.queryIntent === 'string' && candidate.queryIntent.trim() ? candidate.queryIntent.trim() : fallback.queryIntent,
  };
}

async function callOpenAiCompatibleJson(systemPrompt, userPrompt) {
  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  return JSON.parse(payload.choices?.[0]?.message?.content || '{}');
}

async function enhanceBindingsWithLlm(dataset, catalog, bindings) {
  if (!hasLlm()) return bindings;
  if (!['openai', 'openai-compatible', 'deepseek'].includes(LLM_PROVIDER)) {
    return bindings;
  }

  const promptCatalog = catalog.tables.map((table) => ({
    short_name: table.short_name,
    row_count: table.row_count,
    columns: table.columns.map((column) => ({ name: column.name, type: column.type })),
  }));

  const systemPrompt = [
    'You improve dashboard view bindings for fixed analytics layouts.',
    'Do not add, remove, or reorder widgets.',
    'Only adjust titles, table names, metricColumn, dimensionColumn, timeColumn, aggregation, and queryIntent.',
    'Use only table and column names that exist in the provided catalog.',
    'Return JSON in the shape {"views":{"servers":{"widgets":[...]},...}}.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    dataset,
    availableViews: VIEW_ORDER,
    catalog: promptCatalog,
    currentBindings: bindings,
  });

  try {
    const result = await callOpenAiCompatibleJson(systemPrompt, userPrompt);
    if (!result?.views) return bindings;

    const mergedViews = {};
    for (const viewId of VIEW_ORDER) {
      const fallbackWidgets = bindings.views[viewId]?.widgets || [];
      const candidateWidgets = result.views?.[viewId]?.widgets || [];
      const candidateMap = new Map(candidateWidgets.map((widget) => [widget.id, widget]));
      mergedViews[viewId] = {
        title: result.views?.[viewId]?.title || bindings.views[viewId]?.title,
        widgets: fallbackWidgets.map((widget) => sanitizeBindingCandidate(candidateMap.get(widget.id), widget)),
      };
    }

    return {
      version: 1,
      views: mergedViews,
    };
  } catch (error) {
    console.warn(`[LLM] bindings enhancement failed: ${error.message}`);
    return bindings;
  }
}

function cloneJson(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function filterBindingToAllowedSources(binding, allowedSources) {
  if (!binding || !Array.isArray(allowedSources) || allowedSources.length === 0) {
    return binding;
  }

  const allowed = new Set(allowedSources.filter(Boolean));
  if (allowed.size === 0) return binding;

  if (binding.multiSource?.enabled && Array.isArray(binding.multiSource.sources)) {
    const filteredSources = binding.multiSource.sources.filter((source) => allowed.has(source.sourceId));
    if (filteredSources.length > 0) {
      const primarySource = filteredSources[0];
      return {
        ...binding,
        sourceId: primarySource.sourceId,
        table: primarySource.table,
        metricColumn: primarySource.metricColumn ?? binding.metricColumn,
        dimensionColumn: primarySource.dimensionColumn ?? binding.dimensionColumn,
        timeColumn: primarySource.timeColumn ?? binding.timeColumn,
        multiSource: filteredSources.length > 1
          ? { ...binding.multiSource, sources: filteredSources }
          : null,
      };
    }
  }

  if (!binding.sourceId || allowed.has(binding.sourceId)) {
    return binding;
  }

  return binding;
}

function applyPreferencesToBindings(bindings, preferences) {
  const nextBindings = cloneJson(bindings) || { version: 1, views: {} };

  for (const viewId of Object.keys(nextBindings.views || {})) {
    const viewBinding = nextBindings.views[viewId];
    const viewPreference = preferences.views?.[viewId];
    const scopedSources = Array.isArray(viewPreference?.sources) && viewPreference.sources.length > 0
      ? viewPreference.sources
      : null;

    if (viewPreference?.title) {
      viewBinding.title = viewPreference.title;
    }

    viewBinding.widgets = (viewBinding.widgets || []).map((widgetBinding) => {
      let nextWidgetBinding = widgetBinding;
      const widgetPreference = preferences.widgets?.[widgetBinding.id];

      if (scopedSources) {
        nextWidgetBinding = filterBindingToAllowedSources(nextWidgetBinding, scopedSources);
      }

      if (Array.isArray(widgetPreference?.sources) && widgetPreference.sources.length > 0) {
        nextWidgetBinding = filterBindingToAllowedSources(nextWidgetBinding, widgetPreference.sources);
      }

      if (widgetPreference?.title) {
        nextWidgetBinding = {
          ...nextWidgetBinding,
          title: widgetPreference.title,
        };
      }

      return nextWidgetBinding;
    });
  }

  return nextBindings;
}

async function compileProjectArtifacts({ orgId, projectId, dataset, forceFull = false, bindingPatch = null }) {
  setGenerationStage('discovering');
  const existingBindings = forceFull ? null : await readJsonArtifact(orgId, projectId, 'view_bindings.json');
  const preferences = forceFull
    ? { version: 1, views: {}, widgets: {}, global: { autoHarness: true } }
    : await readJsonArtifact(orgId, projectId, 'project_preferences.json') || { version: 1, views: {}, widgets: {}, global: { autoHarness: true } };
  const catalog = await discoverData(dataset);
  setGenerationStage('building-bindings', { tablesDiscovered: catalog.total_tables, tablesTotal: catalog.total_tables });
  await writeJsonArtifact(orgId, projectId, 'data_catalog.json', catalog);
  const generatedBindings = buildDefaultBindings(catalog);

  let bindings;
  if (existingBindings && !forceFull) {
    bindings = cloneJson(existingBindings);

    for (const viewId of VIEW_ORDER) {
      if (!bindings.views?.[viewId] && generatedBindings.views?.[viewId]) {
        bindings.views[viewId] = generatedBindings.views[viewId];
      }
    }
  } else {
    bindings = generatedBindings;
  }

  if (!existingBindings || forceFull || preferences.global?.autoHarness !== false) {
    setGenerationStage('enhancing-with-llm');
    bindings = await enhanceBindingsWithLlm(dataset, catalog, bindings);
  }

  if (bindingPatch?.views) {
    bindings = mergeBindings(bindings, { version: 1, views: bindingPatch.views });
  }

  bindings = applyPreferencesToBindings(bindings, preferences);

  setGenerationStage('compiling-specs');
  const specs = compileDashboardSpecs(dataset, bindings);
  const mindmap = compileMindmapArtifact(catalog, bindings, specs);

  setGenerationStage('writing-artifacts');
  await writeJsonArtifact(orgId, projectId, 'view_bindings.json', bindings);
  await Promise.all(VIEW_ORDER.map((viewId) => writeJsonArtifact(orgId, projectId, `dashboard_specs/${viewId}.json`, specs[viewId])));
  await writeJsonArtifact(orgId, projectId, 'mindmap_manifest.json', mindmap);

  return {
    catalog,
    bindings,
    specs,
    mindmap,
  };
}

app.post('/generate', async (req, res) => {
  const { orgId, projectId, dataset, forceFull = false } = req.body || {};
  if (!orgId || !projectId || !dataset) {
    return res.status(400).json({ error: 'orgId, projectId, dataset required' });
  }

  const token = tryStartJob(orgId, projectId, forceFull);
  if (!token) {
    return res.status(409).json({
      error: 'A generation is already in progress',
      currentJob: generationState.currentJob,
      pendingTrigger: generationState.pendingTrigger,
      retryAfterSeconds: 5,
    });
  }

  try {
    const artifacts = await compileProjectArtifacts({ orgId, projectId, dataset, forceFull });
    finishJob(token, true, artifacts);
    return res.json({
      status: 'completed',
      provider: hasLlm() ? LLM_PROVIDER : 'deterministic-fallback',
      views: Object.fromEntries(VIEW_ORDER.map((viewId) => [viewId, artifacts.specs[viewId].widgets.length])),
      totalTables: artifacts.catalog.total_tables,
      durationMs: generationState.lastJob?.durationMs || 0,
      specUrls: Object.fromEntries(VIEW_ORDER.map((viewId) => [
        viewId,
        `gs://${GCS_BUCKET}/${artifactPath(orgId, projectId, `dashboard_specs/${viewId}.json`)}`,
      ])),
      mindmapUrl: `gs://${GCS_BUCKET}/${artifactPath(orgId, projectId, 'mindmap_manifest.json')}`,
    });
  } catch (error) {
    console.error('[HARNESS]', error);
    finishJob(token, false, null, error);
    return res.status(500).json({ error: error.message, stage: generationState.lastJob?.error ? 'failed' : 'crashed' });
  }
});

app.post('/discover', async (req, res) => {
  const { dataset } = req.body || {};
  if (!dataset) {
    return res.status(400).json({ error: 'dataset required' });
  }

  try {
    const catalog = await discoverData(dataset);
    return res.json(catalog);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/bindings', async (req, res) => {
  const { orgId, projectId, dataset, patch } = req.body || {};
  if (!orgId || !projectId || !dataset || !patch?.views) {
    return res.status(400).json({ error: 'orgId, projectId, dataset, and patch.views required' });
  }

  // Validate that view_ids exist in the template catalog
  for (const viewId of Object.keys(patch.views || {})) {
    if (!VIEW_ORDER.includes(viewId)) {
      return res.status(400).json({ error: `Unknown view ID: "${viewId}". Available: ${VIEW_ORDER.join(', ')}` });
    }
    const widgets = patch.views[viewId]?.widgets;
    if (!Array.isArray(widgets)) {
      return res.status(400).json({ error: `view "${viewId}" must have a "widgets" array` });
    }
    for (const widget of widgets) {
      if (!widget.id || typeof widget.id !== 'string') {
        return res.status(400).json({ error: `Each widget in view "${viewId}" must have a string "id"` });
      }
    }
  }

  const token = tryStartJob(orgId, projectId, false);
  if (!token) {
    return res.status(409).json({
      error: 'A generation is already in progress',
      currentJob: generationState.currentJob,
      pendingTrigger: generationState.pendingTrigger,
      retryAfterSeconds: 5,
    });
  }

  try {
    const artifacts = await compileProjectArtifacts({
      orgId,
      projectId,
      dataset,
      forceFull: false,
      bindingPatch: patch,
    });
    finishJob(token, true, artifacts);
    return res.json({
      status: 'updated',
      bindings: artifacts.bindings,
      durationMs: generationState.lastJob?.durationMs || 0,
      mindmapUrl: `gs://${GCS_BUCKET}/${artifactPath(orgId, projectId, 'mindmap_manifest.json')}`,
    });
  } catch (error) {
    console.error('[HARNESS]', error);
    finishJob(token, false, null, error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/status', (_, res) => {
  res.json({
    status: generationState.currentJob ? 'generating' : 'idle',
    uptimeSeconds: generationState.uptime(),
    provider: hasLlm() ? LLM_PROVIDER : 'deterministic-fallback',
    model: LLM_MODEL,
    currentJob: generationState.currentJob || null,
    lastJob: generationState.lastJob || null,
    pendingTrigger: generationState.pendingTrigger || null,
    locked: generationState.currentJob !== null,
  });
});

app.get('/health', (_, res) => {
  const busy = Boolean(generationState.currentJob);
  res.json({
    status: busy ? 'generating' : 'ok',
    busy,
    provider: hasLlm() ? LLM_PROVIDER : 'deterministic-fallback',
    model: LLM_MODEL,
    generation: generationState.currentJob
      ? { stage: generationState.currentJob.stage, orgId: generationState.currentJob.orgId, projectId: generationState.currentJob.projectId }
      : (generationState.lastJob
        ? { lastCompleted: generationState.lastJob.completedAt, lastDurationMs: generationState.lastJob.durationMs }
        : null),
    uptimeSeconds: generationState.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`Harness Service running on :${PORT}`);
});
