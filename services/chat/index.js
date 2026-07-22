/**
 * Sentry Chat Agent — project-scoped AI assistant.
 *
 * Runs as a standalone service (Cloud Run or Modal).
 * Communicates with Sentry backend for context (org, project, data catalog).
 * Uses direct LLM API (OpenAI/Gemini) with function calling for tools.
 *
 * Flow:
 *   POST /chat/message → inject context → LLM with tools → SSE stream back
 */

import express from 'express';
import cors from 'cors';
import { Firestore } from '@google-cloud/firestore';
import client from 'prom-client';

const app = express();
app.use(cors());
app.use(express.json());

const firestore = new Firestore({ projectId: process.env.GCP_PROJECT_ID || 'local-dev-project' });
const PORT = process.env.PORT || 8080;

// Prometheus
const register = new client.Registry();
register.setDefaultLabels({ app: 'sentry-chat' });
client.collectDefaultMetrics({ register });

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'deepseek';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash';
const LLM_MODEL_ID = process.env.LLM_MODEL_ID || process.env.LLM_MODEL || 'deepseek-v4-flash';
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api/v1';
const HARNESS_SERVICE_URL = process.env.HARNESS_SERVICE_URL || 'http://harness:8081';
const OBSERVER_SERVICE_URL = process.env.OBSERVER_SERVICE_URL || 'http://observer:8082';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'dev-internal-token';
const TEST_MODE = process.env.TEST_MODE === '1';

// ═══════════════════════════════════════════════════
// AUTH MIDDLEWARE — only accept requests from backend
// ═══════════════════════════════════════════════════

function requireInternalToken(req, res, next) {
  const token = req.headers['x-internal-token'];
  if (!token || token !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized — internal only' });
  }
  next();
}

const SYSTEM_PROMPT = `You are the Parrot Assistant, a project-scoped data agent. You help users connect data sources, explore analytics, and get insights.

CONTEXT YOU ALWAYS HAVE:
- Organization: {orgName} (plan: {orgPlan})
- Project: {projectName}
- Data catalog: {dataCatalog}
- Available widgets: {widgetList}
- Connected integrations: {integrations}
- Harness status: {harnessStatus}
- Observer status: {observerStatus}

YOUR CAPABILITIES:
1. Guide users through connecting new data sources (Stripe, GA4, Shopify, etc.)
2. Answer questions about their data using analytics queries
3. Embed relevant widgets directly in the chat
4. Recommend connectors based on what's missing
5. Open integration modals for the user to enter credentials
6. Trigger the Harness to regenerate dashboards when new data arrives
7. Check Harness/Observer status and report progress to the user
8. Ask the Harness to modify view bindings (titles, tables, columns, aggregations)

RULES:
- Always check the data catalog before answering data questions
- If asked about data you don't have, suggest connecting the relevant source
- Use open_integration_modal when user wants to connect something
- Use show_widget when asked about metrics/charts
- Use trigger_harness when the user wants to refresh dashboards after new connectors are added
- Use check_harness to report status when user asks about progress
- Use update_bindings when user asks to change widget titles, data sources, or chart types
- IMPORTANT: Harness can only run ONE generation at a time. If busy, tell the user to wait and retry.
- IMPORTANT: update_bindings triggers a full recompile — it's not instant. Warn users this can take 5-30s.
- Be concise. Romanian or English based on what the user uses.
- Never invent data. If you can't answer, say so and suggest a connector.`;

// ═══════════════════════════════════════════════════
// TOOL DEFINITIONS (LLM function calling)
// ═══════════════════════════════════════════════════

const TOOLS = [
  {
    name: 'open_integration_modal',
    description: 'Trigger the UI to open the connection form for a specific connector type. Use when user wants to connect a data source.',
    parameters: {
      type: 'object',
      properties: {
        connector_type: { type: 'string', enum: ['GA4', 'Stripe', 'Shopify', 'HubSpot', 'PostHog', 'Salesforce', 'BigQuery', 'Sentry', 'Slack', 'Klaviyo', 'Custom API'], description: 'The connector type to connect' },
      },
      required: ['connector_type'],
    },
  },
  {
    name: 'show_widget',
    description: 'Embed a dashboard widget directly in the chat. Use when user asks about specific metrics or wants to see data.',
    parameters: {
      type: 'object',
      properties: {
        widget_query_ref: { type: 'string', description: 'The query reference ID of the widget to show' },
        title: { type: 'string', description: 'Display title for the embedded widget' },
      },
      required: ['widget_query_ref', 'title'],
    },
  },
  {
    name: 'suggest_connectors',
    description: 'Suggest relevant connectors the user should add based on their current data gaps.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why these connectors are recommended' },
        connectors: { type: 'array', items: { type: 'string' }, description: 'List of connector names' },
      },
      required: ['connectors'],
    },
  },
  {
    name: 'run_analytics_query',
    description: 'Run an analytics query against the project data. Use when user asks a specific data question.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Natural language question to answer with data' },
        sql: { type: 'string', description: 'SQL query to run (BigQuery)' },
      },
      required: ['question', 'sql'],
    },
  },
  {
    name: 'navigate_to',
    description: 'Navigate the user to a specific section of the app.',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['analytics', 'integrations', 'graph', 'settings', 'stats', 'billing'], description: 'Section to navigate to' },
      },
      required: ['section'],
    },
  },
  {
    name: 'trigger_harness',
    description: 'Trigger the Harness engine to regenerate dashboard specs from the data catalog. Use after new connectors are added or when user asks to refresh analytics.',
    parameters: {
      type: 'object',
      properties: {
        force_full: { type: 'boolean', description: 'If true, discard existing bindings and regenerate from scratch' },
      },
    },
  },
  {
    name: 'check_harness',
    description: 'Check the current status of the Harness engine and Observer. Use when user asks about dashboard generation progress or system health.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_bindings',
    description: 'Modify a dashboard view binding — change widget titles, data tables, metric columns, dimensions, aggregations. Use when user wants to customize a dashboard view.',
    parameters: {
      type: 'object',
      properties: {
        view_id: { type: 'string', description: 'The view to modify: servers, web, financial, sales, marketing' },
        widget_id: { type: 'string', description: 'The widget ID within the view to modify' },
        title: { type: 'string', description: 'New display title for the widget' },
        table: { type: 'string', description: 'BigQuery table to query' },
        metric_column: { type: 'string', description: 'Column to use as the metric value' },
        dimension_column: { type: 'string', description: 'Column to use for grouping/dimensions' },
        aggregation: { type: 'string', enum: ['sum', 'avg', 'count', 'min', 'max'], description: 'Aggregation function' },
      },
      required: ['view_id', 'widget_id'],
    },
  },
];

// ═══════════════════════════════════════════════════
// CONTEXT LOADER
// ═══════════════════════════════════════════════════

async function loadContext(orgId, projectId, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const [org, catalog, spec, integrations] = await Promise.allSettled([
    fetch(`${BACKEND_URL}/organizations/${orgId}`, { headers }).then(r => r.json()).catch(() => null),
    fetch(`${BACKEND_URL}/organizations/${orgId}/projects/${projectId}/specs/data-catalog`, { headers }).then(r => r.json()).catch(() => null),
    fetch(`${BACKEND_URL}/organizations/${orgId}/projects/${projectId}/specs`, { headers }).then(r => r.json()).catch(() => null),
    fetch(`${BACKEND_URL}/organizations/${orgId}/projects/${projectId}/integrations`, { headers }).then(r => r.json()).catch(() => null),
  ]);

  // Harness + Observer health (internal, no JWT needed — use INTERNAL_TOKEN)
  let harnessStatus = 'unknown';
  let observerStatus = 'unknown';
  try {
    const hRes = await fetch(`${HARNESS_SERVICE_URL}/status`, { headers: { 'X-Internal-Token': INTERNAL_TOKEN } });
    const hBody = await hRes.json().catch(() => ({}));
    if (!hRes.ok) {
      harnessStatus = 'degraded';
    } else if (hBody.status === 'generating' && hBody.currentJob) {
      harnessStatus = `generating (stage: ${hBody.currentJob.stage}, tables: ${hBody.currentJob.tablesDiscovered ?? 0}/${hBody.currentJob.tablesTotal ?? '?'}, project: ${hBody.currentJob.projectId})`;
    } else if (hBody.lastJob) {
      harnessStatus = `idle — last job: ${hBody.lastJob.success ? 'ok' : 'failed'} (${hBody.lastJob.tablesProcessed ?? 0} tables, ${(hBody.lastJob.durationMs / 1000).toFixed(1)}s ago at ${hBody.lastJob.orgId}/${hBody.lastJob.projectId})`;
    } else {
      harnessStatus = `healthy (${hBody.provider || 'llm'}/${hBody.model || 'auto'}) — no jobs run yet`;
    }
  } catch { harnessStatus = 'unreachable'; }
  try {
    const oRes = await fetch(`${OBSERVER_SERVICE_URL}/health`, { headers: { 'X-Internal-Token': INTERNAL_TOKEN } });
    observerStatus = oRes.ok ? 'healthy' : 'degraded';
  } catch { observerStatus = 'unreachable'; }

  return {
    orgName: org.value?.data?.name || org.value?.name || 'Unknown',
    orgPlan: org.value?.data?.plan || org.value?.plan || 'Starter',
    projectName: projectId,
    dataCatalog: catalog.value?.tables?.map(t => `${t.short_name} (${t.row_count} rows)`)?.join(', ') || 'No data yet',
    widgetList: spec.value?.widgets?.map(w => `${w.title || w.id} (${w.type})`)?.join(', ') || 'No widgets',
    integrations: integrations.value?.data?.map(i => i.name || i.type)?.join(', ') || 'None',
    harnessStatus,
    observerStatus,
  };
}

// ═══════════════════════════════════════════════════
// LLM CALL (with function calling + streaming)
// ═══════════════════════════════════════════════════

function buildSystemPrompt(context) {
  return SYSTEM_PROMPT
    .replace('{orgName}', context.orgName)
    .replace('{orgPlan}', context.orgPlan)
    .replace('{projectName}', context.projectName)
    .replace('{dataCatalog}', context.dataCatalog)
    .replace('{widgetList}', context.widgetList)
    .replace('{integrations}', context.integrations)
    .replace('{harnessStatus}', context.harnessStatus)
    .replace('{observerStatus}', context.observerStatus);
}

// Test-mode mock LLM responses for deterministic E2E coverage.
async function* streamTestResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('connectors') || lower.includes('recommend') || lower.includes('suggest')) {
    yield { type: 'text', content: 'Based on common e-commerce needs, I recommend these connectors:' };
    yield { type: 'tool_call', id: 'tc_test_suggest', name: 'suggest_connectors', args: JSON.stringify({ reason: 'E-commerce data stack', connectors: ['Stripe', 'Shopify', 'GA4'] }) };
  } else if (lower.includes('connect stripe') || lower.includes('stripe')) {
    yield { type: 'text', content: 'I can connect Stripe for you. Please enter your credentials.' };
    yield { type: 'tool_call', id: 'tc_test_stripe', name: 'open_integration_modal', args: JSON.stringify({ connector_type: 'Stripe' }) };
  } else if (lower.includes('widget') || lower.includes('chart') || lower.includes('revenue')) {
    yield { type: 'text', content: 'Here is a revenue chart widget for your project.' };
    yield { type: 'tool_call', id: 'tc_test_widget', name: 'show_widget', args: JSON.stringify({ widget_query_ref: 'revenue_chart', title: 'Revenue over time' }) };
  } else {
    yield { type: 'text', content: 'This is a test-mode response. How can I help?' };
  }
}

// Production fallback: when the LLM is unavailable (401, 429, 5xx, missing key),
// we still answer using deterministic rules and real tool calls. This keeps the
// chat agent useful for proposing connectors, opening modals, and embedding charts.
async function* streamFallbackResponse(userMessage, context) {
  const lower = userMessage.toLowerCase();
  const connected = context.integrations?.split(', ').filter(Boolean) || [];

  if (lower.includes('salut') || lower.includes('hello') || lower.includes('hi')) {
    yield { type: 'text', content: 'Salut! Sunt asistentul Parrot. Cu ce te pot ajuta — conectări, grafice sau analiză?' };
  }

  if (lower.includes('conect') || lower.includes('connect') || lower.includes('adaug') || lower.includes('add')) {
    const allConnectors = ['Stripe', 'GA4', 'Search Console', 'Google Ads', 'Shopify', 'WooCommerce', 'HubSpot', 'Salesforce', 'PostHog', 'Sentry', 'Klaviyo', 'BigQuery'];
    const missing = allConnectors.filter(c => !connected.includes(c));
    if (missing.length > 0) {
      yield { type: 'text', content: 'Pot propune câțiva conectori pe care îi poți adăuga:' };
      yield { type: 'tool_call', id: 'fb_suggest', name: 'suggest_connectors', args: JSON.stringify({ reason: 'Stack recomandat pentru e-commerce & analytics', connectors: missing.slice(0, 3) }) };
    }
  }

  if (lower.includes('stripe')) {
    yield { type: 'text', content: 'Pot deschide modala de conectare Stripe.' };
    yield { type: 'tool_call', id: 'fb_stripe', name: 'open_integration_modal', args: JSON.stringify({ connector_type: 'Stripe' }) };
  }

  if (lower.includes('shopify')) {
    yield { type: 'text', content: 'Pot deschide modala de conectare Shopify.' };
    yield { type: 'tool_call', id: 'fb_shopify', name: 'open_integration_modal', args: JSON.stringify({ connector_type: 'Shopify' }) };
  }

  if (lower.includes('grafic') || lower.includes('chart') || lower.includes('widget') || lower.includes('venit') || lower.includes('revenue') || lower.includes('metric')) {
    yield { type: 'text', content: 'Pot încărca un widget direct în chat.' };
    yield { type: 'tool_call', id: 'fb_widget', name: 'show_widget', args: JSON.stringify({ widget_query_ref: 'revenue_over_time', title: 'Venit în timp' }) };
  }

  if (lower.includes('status') || lower.includes('progres') || lower.includes('stare') || lower.includes('harness') || lower.includes('observer')) {
    yield { type: 'text', content: 'Verific starea serviciilor.' };
    yield { type: 'tool_call', id: 'fb_check', name: 'check_harness', args: '{}' };
  }

  if (lower.includes('refresh') || lower.includes('regenereaz') || lower.includes('rebuild') || lower.includes('update')) {
    yield { type: 'text', content: 'Pornesc regenerarea dashboard-urilor.' };
    yield { type: 'tool_call', id: 'fb_trigger', name: 'trigger_harness', args: JSON.stringify({ force_full: false }) };
  }

  if (lower.includes('analytics') || lower.includes('query') || lower.includes('sql') || lower.includes('date') || lower.includes('raport')) {
    yield { type: 'text', content: 'Pot rula o interogare asupra datelor disponibile.' };
    yield { type: 'tool_call', id: 'fb_query', name: 'run_analytics_query', args: JSON.stringify({ question: userMessage, sql: 'SELECT 1' }) };
  }

  if (lower.includes('navig') || lower.includes('merg') || lower.includes('du-mă')) {
    yield { type: 'tool_call', id: 'fb_nav', name: 'navigate_to', args: JSON.stringify({ section: 'analytics' }) };
  }
}

async function* streamLLMResponse(messages, systemPrompt) {
  const userMessage = messages[messages.length - 1]?.content || '';
  if (TEST_MODE) {
    yield* streamTestResponse(userMessage); return;
  }
  // deepseek / openai / openai-compatible — all use the same API format
  if (LLM_PROVIDER === 'openai' || LLM_PROVIDER === 'deepseek' || LLM_PROVIDER === 'openai-compatible') {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        tools: TOOLS.map(t => ({ type: 'function', function: t })),
        tool_choice: 'auto',
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'LLM request failed');
      const err = new Error(`LLM ${response.status}: ${errorText}`);
      err.status = response.status;
      throw err;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const toolCallBuffer = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: 'text', content: delta.content };
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index ?? 0;
                let current = toolCallBuffer.get(index) || { id: '', name: '', args: '' };
                if (tc.id) current.id = tc.id;
                if (tc.function?.name) current.name += tc.function.name;
                if (tc.function?.arguments) current.args += tc.function.arguments;
                toolCallBuffer.set(index, current);
                if (current.id && current.name && current.args && (tc.function?.arguments || '').endsWith('}')) {
                  yield { type: 'tool_call', id: current.id, name: current.name, args: current.args };
                  toolCallBuffer.delete(index);
                }
              }
            }
          } catch {}
        }
      }
    }
    // Flush any remaining tool calls that didn't end with '}'
    for (const current of toolCallBuffer.values()) {
      if (current.id && current.name) {
        yield { type: 'tool_call', id: current.id, name: current.name, args: current.args };
      }
    }
  } else {
    // Gemini
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: LLM_API_KEY });

    const chat = genai.chats.create({
      model: LLM_MODEL,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: TOOLS }],
      },
      history: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessageStream({ message: lastMsg.content });

    for await (const chunk of result) {
      if (chunk.text) {
        yield { type: 'text', content: chunk.text };
      }
      if (chunk.functionCalls) {
        for (const fc of chunk.functionCalls) {
          yield { type: 'tool_call', id: fc.id, name: fc.name, args: JSON.stringify(fc.args) };
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════
// TOOL EXECUTORS
// ═══════════════════════════════════════════════════

async function executeToolCall(name, args, orgId, projectId, token) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  switch (name) {
    case 'open_integration_modal':
      return { type: 'action', action: 'open_integration_modal', connector: args.connector_type };

    case 'show_widget':
      return { type: 'widget', queryRef: args.widget_query_ref, title: args.title };

    case 'suggest_connectors':
      return { type: 'suggestion', reason: args.reason, connectors: args.connectors };

    case 'run_analytics_query':
      try {
        const res = await fetch(
          `${BACKEND_URL}/organizations/${orgId}/projects/${projectId}/analytics/query`,
          { method: 'POST', headers, body: JSON.stringify({ sql: args.sql }) }
        );
        const data = await res.json();
        return { type: 'query_result', question: args.question, result: data };
      } catch {
        return { type: 'error', message: 'Query failed. Check the data source.' };
      }

    case 'navigate_to':
      return { type: 'action', action: 'navigate', section: args.section };

    case 'trigger_harness': {
      const dataset = `\`${process.env.GCP_PROJECT_ID || 'unknown'}.sentry_dataset_${orgId}_${String(projectId).replace(/[^a-zA-Z0-9]/g, '_')}\``;
      try {
        const harnessHeaders = { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };
        const harnessRes = await fetch(`${HARNESS_SERVICE_URL}/generate`, {
          method: 'POST',
          headers: harnessHeaders,
          body: JSON.stringify({ orgId, projectId, dataset, forceFull: args.force_full === true }),
        });
        const harnessData = await harnessRes.json().catch(() => ({}));
        if (harnessRes.status === 409) {
          const cj = harnessData.currentJob || {};
          return {
            type: 'harness_result',
            status: 'busy',
            currentJob: cj,
            message: `Harness is already generating (stage: ${cj.stage || 'unknown'}, project: ${cj.projectId || projectId}). Wait for it to finish, then retry.`,
          };
        }
        return {
          type: 'harness_result',
          status: harnessData.status,
          views: harnessData.views,
          totalTables: harnessData.totalTables,
          message: harnessData.status === 'completed'
            ? `Harness completed: ${harnessData.totalTables || 0} tables processed across ${Object.keys(harnessData.views || {}).length} views in ${harnessData.durationMs || '?'}ms.`
            : `Harness response: ${harnessData.error || 'Unknown status'}`,
        };
      } catch (err) {
        return { type: 'harness_result', status: 'error', message: `Harness call failed: ${err.message}` };
      }
    }

    case 'check_harness': {
      const results = {};
      try {
        const hRes = await fetch(`${HARNESS_SERVICE_URL}/status`, { headers: { 'X-Internal-Token': INTERNAL_TOKEN } });
        const hBody = await hRes.json().catch(() => ({}));
        if (!hRes.ok) {
          results.harness = { status: 'degraded' };
        } else {
          results.harness = {
            status: hBody.status,
            provider: hBody.provider,
            model: hBody.model,
            uptimeSeconds: hBody.uptimeSeconds,
          };
          if (hBody.currentJob) {
            results.harness.currentJob = hBody.currentJob;
          }
          if (hBody.lastJob) {
            results.harness.lastJob = hBody.lastJob;
          }
        }
      } catch {
        results.harness = { status: 'unreachable' };
      }
      try {
        const oRes = await fetch(`${OBSERVER_SERVICE_URL}/health`, { headers: { 'X-Internal-Token': INTERNAL_TOKEN } });
        const oBody = await oRes.json().catch(() => ({}));
        results.observer = { status: oRes.ok ? 'healthy' : 'degraded', uptime: oBody.uptime };
      } catch {
        results.observer = { status: 'unreachable' };
      }
      return { type: 'harness_status', ...results };
    }

    case 'update_bindings': {
      const dataset = `\`${process.env.GCP_PROJECT_ID || 'unknown'}.sentry_dataset_${orgId}_${String(projectId).replace(/[^a-zA-Z0-9]/g, '_')}\``;
      const widget = { id: args.widget_id };
      if (args.title) widget.title = args.title;
      if (args.table) widget.table = args.table;
      if (args.metric_column) widget.metricColumn = args.metric_column;
      if (args.dimension_column) widget.dimensionColumn = args.dimension_column;
      if (args.aggregation) widget.aggregation = args.aggregation;

      try {
        const harnessHeaders = { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };
        const harnessRes = await fetch(`${HARNESS_SERVICE_URL}/bindings`, {
          method: 'PATCH',
          headers: harnessHeaders,
          body: JSON.stringify({
            orgId, projectId, dataset,
            patch: { views: { [args.view_id]: { widgets: [widget] } } },
          }),
        });
        const harnessData = await harnessRes.json().catch(() => ({}));
        if (harnessRes.status === 409) {
          const cj = harnessData.currentJob || {};
          return {
            type: 'bindings_result',
            status: 'busy',
            currentJob: cj,
            message: `Harness is busy (stage: ${cj.stage || 'unknown'}). Wait for it to finish, then retry this change.`,
          };
        }
        return {
          type: 'bindings_result',
          status: harnessRes.ok ? 'updated' : 'error',
          view: args.view_id,
          widget: args.widget_id,
          message: harnessRes.ok
            ? `Widget "${args.widget_id}" in view "${args.view_id}" updated successfully.`
            : `Failed to update: ${harnessData.error || 'Unknown error'}`,
        };
      } catch (err) {
        return { type: 'bindings_result', status: 'error', message: `Bindings update failed: ${err.message}` };
      }
    }

    default:
      return { type: 'error', message: `Unknown tool: ${name}` };
  }
}

// ═══════════════════════════════════════════════════
// CONVERSATION PERSISTENCE (Firestore)
// ═══════════════════════════════════════════════════

function conversationRef(orgId, projectId, sessionId) {
  return firestore
    .collection('organizations').doc(orgId)
    .collection('projects').doc(projectId)
    .collection('chatSessions').doc(sessionId);
}

async function loadConversation(orgId, projectId, sessionId) {
  const doc = await conversationRef(orgId, projectId, sessionId).get();
  return doc.exists ? doc.data().messages || [] : [];
}

async function saveConversation(orgId, projectId, sessionId, messages) {
  try {
    await conversationRef(orgId, projectId, sessionId).update({
      messages,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err.code === 5) { // NOT_FOUND in gRPC/Firestore
      console.log(`Session ${sessionId} was deleted by user, skipping save.`);
    } else {
      console.error('Failed to save conversation:', err);
    }
  }
}

// ═══════════════════════════════════════════════════
// INTERNAL SSE ENDPOINT — called by backend proxy only
// ═══════════════════════════════════════════════════

app.post('/internal/message', requireInternalToken, async (req, res) => {
  const { orgId, projectId, sessionId, message, backendToken, title } = req.body;
  // backendToken is the user's JWT from the main backend — used to call backend APIs on user's behalf

  if (!orgId || !projectId || !sessionId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Load context
    const context = await loadContext(orgId, projectId, backendToken);
    const history = await loadConversation(orgId, projectId, sessionId);
    const systemPrompt = buildSystemPrompt(context);

    // Build messages array
    const messages = [
      ...history.slice(-20), // last 20 messages for context window
      { role: 'user', content: message },
    ];

    // Stream LLM response
    let assistantContent = '';
    const toolCalls = [];

    for await (const event of streamLLMResponse(messages, systemPrompt)) {
      if (event.type === 'text') {
        assistantContent += event.content;
        send({ type: 'text', content: event.content });
      } else if (event.type === 'tool_call') {
        toolCalls.push(event);
      }
    }

    // Execute tool calls
    for (const tc of toolCalls) {
      const args = JSON.parse(tc.args || '{}');
      const result = await executeToolCall(tc.name, args, orgId, projectId, backendToken);
      send({ type: 'tool_result', id: tc.id, ...result });
    }

    // Save to Firestore
    if (assistantContent || toolCalls.length > 0) {
      const newMessages = [
        ...history,
        { role: 'user', content: message },
        {
          role: 'assistant',
          content: assistantContent || null,
          tool_calls: toolCalls.length > 0 ? toolCalls : [],
        },
      ];
      await saveConversation(orgId, projectId, sessionId, newMessages);
    }

    send({ type: 'done' });
  } catch (err) {
    send({ type: 'error', message: err.message });
  }

  res.end();
});

// Prometheus metrics
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Chat Agent running on :${PORT}`);
  console.log(`  LLM: ${LLM_PROVIDER}/${LLM_MODEL}`);
});
