import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { buildDefaultBindings, compileDashboardSpecs, compileMindmapArtifact, mergeBindings } from './specCompiler.js';
import { VIEW_ORDER } from './viewTemplates.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '8081', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-internal-token';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai-compatible';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4.1-mini';
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const GCS_BUCKET = process.env.GCS_BUCKET || 'sentry-platform-data';

function requireInternalToken(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(requireInternalToken);

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

async function compileProjectArtifacts({ orgId, projectId, dataset, forceFull = false, bindingPatch = null }) {
  const existingBindings = forceFull ? null : await readJsonArtifact(orgId, projectId, 'view_bindings.json');
  const catalog = await discoverData(dataset);
  await writeJsonArtifact(orgId, projectId, 'data_catalog.json', catalog);

  let bindings = mergeBindings(buildDefaultBindings(catalog), existingBindings);
  bindings = await enhanceBindingsWithLlm(dataset, catalog, bindings);

  if (bindingPatch?.views) {
    bindings = mergeBindings(bindings, { version: 1, views: bindingPatch.views });
  }

  const specs = compileDashboardSpecs(dataset, bindings);
  const mindmap = compileMindmapArtifact(catalog, bindings, specs);

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

  try {
    const artifacts = await compileProjectArtifacts({ orgId, projectId, dataset, forceFull });
    return res.json({
      status: 'completed',
      provider: hasLlm() ? LLM_PROVIDER : 'deterministic-fallback',
      views: Object.fromEntries(VIEW_ORDER.map((viewId) => [viewId, artifacts.specs[viewId].widgets.length])),
      totalTables: artifacts.catalog.total_tables,
      specUrls: Object.fromEntries(VIEW_ORDER.map((viewId) => [
        viewId,
        `gs://${GCS_BUCKET}/${artifactPath(orgId, projectId, `dashboard_specs/${viewId}.json`)}`,
      ])),
      mindmapUrl: `gs://${GCS_BUCKET}/${artifactPath(orgId, projectId, 'mindmap_manifest.json')}`,
    });
  } catch (error) {
    console.error('[HARNESS]', error);
    return res.status(500).json({ error: error.message });
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

  try {
    const artifacts = await compileProjectArtifacts({
      orgId,
      projectId,
      dataset,
      forceFull: false,
      bindingPatch: patch,
    });
    return res.json({
      status: 'updated',
      bindings: artifacts.bindings,
      mindmapUrl: `gs://${GCS_BUCKET}/${artifactPath(orgId, projectId, 'mindmap_manifest.json')}`,
    });
  } catch (error) {
    console.error('[HARNESS]', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    provider: hasLlm() ? LLM_PROVIDER : 'deterministic-fallback',
    model: LLM_MODEL,
  });
});

app.listen(PORT, () => {
  console.log(`Harness Service running on :${PORT}`);
});
