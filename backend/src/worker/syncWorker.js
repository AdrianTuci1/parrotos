import { BigQuery } from '@google-cloud/bigquery';
import { Firestore } from '@google-cloud/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from '../config/index.js';

const secretClient = new SecretManagerServiceClient({ projectId: config.gcpProjectId });
const bq = new BigQuery({ projectId: config.gcpProjectId, location: config.bigQueryLocation });
const db = new Firestore({ projectId: config.gcpProjectId });

async function processSyncQueue() {
  const queueRef = db.collection('sync_queue');
  const now = new Date().toISOString();

  const snapshot = await queueRef
    .where('status', 'in', ['pending', 'failed'])
    .where('nextSyncAt', '<=', now)
    .limit(10)
    .get();

  if (snapshot.empty) {
    console.log('[sync-worker] No pending syncs');
    return;
  }

  for (const doc of snapshot.docs) {
    const task = doc.data();

    await doc.ref.set({
      status: 'running',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    try {
      const results = await syncConnector(task);
      const totalRows = summarizeRows(results);

      await doc.ref.set({
        status: 'completed',
        lastSyncAt: new Date().toISOString(),
        nextSyncAt: calculateNextSync(task.schedule),
        lastResults: results,
        lastVolume: totalRows,
        error: null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await updateIntegrationSyncStats(task, {
        status: 'success',
        totalRows,
        results,
      });
    } catch (err) {
      const retries = (task.retries || 0) + 1;

      await doc.ref.set({
        status: 'failed',
        error: err.message,
        retries,
        nextSyncAt: calculateRetrySync(task.schedule, retries),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await updateIntegrationSyncStats(task, {
        status: 'failed',
        error: err.message,
      });

      console.error(`[sync-worker] ${task.connectorName} failed`, err);
    }
  }
}

async function syncConnector(task) {
  const { orgId, projectId, connectorName, secretId } = task;
  const datasetId = getDatasetId(orgId, projectId);

  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${config.gcpProjectId}/secrets/${secretId}/versions/latest`,
  });
  const credentials = JSON.parse(version.payload.data.toString());

  await ensureDatasetExists(datasetId);

  const handler = CONNECTOR_HANDLERS[connectorName];
  if (!handler) {
    throw new Error(`No sync handler configured for ${connectorName}`);
  }

  return await handler(credentials, datasetId);
}

async function ensureDatasetExists(datasetId) {
  const dataset = bq.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    await bq.createDataset(datasetId, { location: config.bigQueryLocation });
  }
}

async function updateIntegrationSyncStats(task, outcome) {
  const { orgId, projectId, connectorName } = task;
  const integrationsRef = db
    .collection('organizations')
    .doc(orgId)
    .collection('projects')
    .doc(projectId)
    .collection('integrations');

  const snapshot = await integrationsRef.get();
  const integrationDoc = snapshot.docs.find((doc) => {
    const data = doc.data();
    return data.name === connectorName || data.connectorName === connectorName;
  });

  if (!integrationDoc) {
    return;
  }

  const data = integrationDoc.data();
  const currentStats = data.syncStats || {};
  const totalRuns = (currentStats.totalRuns || 0) + 1;
  const successfulRuns = (currentStats.successfulRuns || 0) + (outcome.status === 'success' ? 1 : 0);
  const failedRuns = (currentStats.failedRuns || 0) + (outcome.status === 'failed' ? 1 : 0);

  await integrationDoc.ref.set({
    status: outcome.status === 'failed' ? 'error' : (data.status || 'active'),
    lastSyncAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStats: {
      ...currentStats,
      totalRuns,
      successfulRuns,
      failedRuns,
      lastVolume: outcome.totalRows || 0,
      lastError: outcome.error || null,
      lastResults: outcome.results || null,
    },
  }, { merge: true });
}

function summarizeRows(results) {
  return results.reduce((sum, item) => sum + (typeof item.rows === 'number' ? item.rows : 0), 0);
}

function getDatasetId(orgId, projectId) {
  return `${config.bigQueryDatasetPrefix}_org_${orgId}_proj_${projectId}`.replace(/-/g, '_');
}

function calculateNextSync(schedule) {
  const now = Date.now();
  if (schedule.includes('5 minutes')) return new Date(now + 5 * 60_000).toISOString();
  if (schedule.includes('15 minutes')) return new Date(now + 15 * 60_000).toISOString();
  if (schedule.includes('30 minutes')) return new Date(now + 30 * 60_000).toISOString();
  if (schedule.includes('1 hour')) return new Date(now + 60 * 60_000).toISOString();
  if (schedule.includes('6 hours')) return new Date(now + 6 * 60 * 60_000).toISOString();
  if (schedule.includes('1 day')) return new Date(now + 24 * 60 * 60_000).toISOString();
  return new Date(now + 60 * 60_000).toISOString();
}

function calculateRetrySync(schedule, retries) {
  const baseDelayMinutes = schedule.includes('5 minutes') ? 5 : 15;
  const delayMinutes = Math.min(baseDelayMinutes * retries, 120);
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

async function syncApiEndpoints(baseUrl, endpoints, apiKey, datasetId, authHeader, authPrefix = '') {
  const results = [];
  const headers = { 'Content-Type': 'application/json' };
  headers[authHeader] = authPrefix ? `${authPrefix} ${apiKey}` : apiKey;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, { headers });
      const data = await response.json();
      const rows = Array.isArray(data) ? data : (data.data || data.results || []);

      if (rows.length > 0) {
        await saveToBigQuery(endpoint.table, rows, datasetId);
      }

      results.push({ table: endpoint.table, rows: rows.length });
    } catch (err) {
      results.push({ table: endpoint.table, error: err.message });
    }
  }

  return results;
}

async function saveToBigQuery(tableId, data, datasetId) {
  if (!data || data.length === 0) {
    return;
  }

  const table = bq.dataset(datasetId).table(tableId);
  const [exists] = await table.exists();
  if (!exists) {
    await table.create({ schema: 'AUTO' });
  }
  await table.insert(data);
}

async function syncStripe(credentials, datasetId) {
  const endpoints = [
    { path: '/customers', table: 'stripe_customers' },
    { path: '/charges', table: 'stripe_charges' },
    { path: '/subscriptions', table: 'stripe_subscriptions' },
  ];
  return await syncApiEndpoints('https://api.stripe.com/v1', endpoints, credentials.apiKey, datasetId, 'Authorization', 'Bearer');
}

async function syncShopify(credentials, datasetId) {
  const endpoints = [
    { path: '/orders.json', table: 'shopify_orders' },
    { path: '/products.json', table: 'shopify_products' },
    { path: '/customers.json', table: 'shopify_customers' },
  ];
  return await syncApiEndpoints(`https://${credentials.shopDomain}/admin/api/2024-01`, endpoints, credentials.apiKey, datasetId, 'X-Shopify-Access-Token');
}

async function syncHubSpot(credentials, datasetId) {
  const endpoints = [
    { path: '/crm/v3/objects/contacts', table: 'hubspot_contacts' },
    { path: '/crm/v3/objects/deals', table: 'hubspot_deals' },
    { path: '/crm/v3/objects/companies', table: 'hubspot_companies' },
  ];
  return await syncApiEndpoints('https://api.hubapi.com', endpoints, credentials.apiKey, datasetId, 'Authorization', 'Bearer');
}

async function syncSentry(credentials, datasetId) {
  const endpoints = [
    { path: `/organizations/${credentials.orgSlug}/issues/`, table: 'sentry_issues' },
    { path: `/organizations/${credentials.orgSlug}/events/`, table: 'sentry_events' },
  ];
  return await syncApiEndpoints('https://sentry.io/api/0', endpoints, credentials.apiKey, datasetId, 'Authorization', 'Bearer');
}

async function syncSalesforce(credentials, datasetId) {
  const endpoints = [
    { path: '/services/data/v58.0/sobjects/Account', table: 'sf_accounts' },
    { path: '/services/data/v58.0/sobjects/Opportunity', table: 'sf_opportunities' },
  ];
  return await syncApiEndpoints(credentials.instanceUrl, endpoints, credentials.accessToken, datasetId, 'Authorization', 'Bearer');
}

async function syncPostHog(credentials, datasetId) {
  const endpoints = [
    { path: `/api/projects/${credentials.projectId}/events`, table: 'posthog_events' },
    { path: `/api/projects/${credentials.projectId}/insights/trend`, table: 'posthog_insights' },
  ];
  return await syncApiEndpoints('https://app.posthog.com', endpoints, credentials.apiKey, datasetId, 'Authorization', 'Bearer');
}

async function syncKlaviyo(credentials, datasetId) {
  const endpoints = [
    { path: '/api/v2/lists', table: 'klaviyo_lists' },
    { path: '/api/v2/metrics', table: 'klaviyo_metrics' },
  ];
  return await syncApiEndpoints('https://a.klaviyo.com', endpoints, credentials.apiKey, datasetId, 'Authorization', 'Klaviyo-API-Key');
}

async function syncWooCommerce(credentials, datasetId) {
  const endpoints = [
    { path: '/wp-json/wc/v3/orders', table: 'wc_orders' },
    { path: '/wp-json/wc/v3/products', table: 'wc_products' },
    { path: '/wp-json/wc/v3/customers', table: 'wc_customers' },
  ];
  const basicAuth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
  return await syncApiEndpoints(credentials.storeUrl, endpoints, basicAuth, datasetId, 'Authorization', 'Basic');
}

async function syncGoogleAds(credentials, datasetId) {
  const endpoints = [
    { path: `/v14/customers/${credentials.customerId}/googleAds:searchStream`, table: 'googleads_campaigns' },
  ];
  return await syncApiEndpoints('https://googleads.googleapis.com', endpoints, credentials.developerToken, datasetId, 'Authorization', 'Bearer');
}

async function syncGA4(credentials, datasetId) {
  const endpoints = [
    { path: `/v1beta/properties/${credentials.propertyId}:runReport`, table: 'ga4_events' },
    { path: `/v1beta/properties/${credentials.propertyId}:runReport`, table: 'ga4_sessions' },
  ];
  return await syncApiEndpoints('https://analyticsdata.googleapis.com', endpoints, credentials.apiKey, datasetId, 'Authorization', 'Bearer');
}

async function syncTikTokAds(credentials, datasetId) {
  const endpoints = [
    { path: '/open_api/v1.3/advertiser/info', table: 'tiktok_advertiser' },
    { path: '/open_api/v1.3/campaign/get', table: 'tiktok_campaigns' },
  ];
  return await syncApiEndpoints('https://business-api.tiktok.com', endpoints, credentials.accessToken, datasetId, 'Access-Token');
}

async function syncFacebook(credentials, datasetId) {
  const endpoints = [
    { path: `/${credentials.adAccountId}/insights`, table: 'fb_insights' },
    { path: `/${credentials.adAccountId}/campaigns`, table: 'fb_campaigns' },
  ];
  return await syncApiEndpoints('https://graph.facebook.com/v18.0', endpoints, credentials.accessToken, datasetId, 'Authorization', 'Bearer');
}

async function syncMetaAds(credentials, datasetId) {
  return await syncFacebook(credentials, datasetId);
}

async function syncPostgreSQL(credentials, datasetId) {
  const { Client } = await import('pg');
  const client = new Client({
    host: credentials.host,
    port: credentials.port || 5432,
    database: credentials.database,
    user: credentials.user,
    password: credentials.password,
    ssl: credentials.ssl || false,
  });
  await client.connect();

  const tables = ['users', 'orders', 'products', 'customers'];
  const results = [];
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT * FROM ${table} LIMIT 10000`);
      if (res.rows.length > 0) {
        await saveToBigQuery(`pg_${table}`, res.rows, datasetId);
      }
      results.push({ table: `pg_${table}`, rows: res.rows.length });
    } catch (err) {
      results.push({ table: `pg_${table}`, error: err.message });
    }
  }

  await client.end();
  return results;
}

async function syncMongoDB(credentials, datasetId) {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(credentials.uri);
  await client.connect();

  const mongoDb = client.db(credentials.database);
  const collections = ['users', 'orders', 'products', 'events'];
  const results = [];
  for (const collection of collections) {
    try {
      const docs = await mongoDb.collection(collection).find().limit(10000).toArray();
      if (docs.length > 0) {
        await saveToBigQuery(`mongo_${collection}`, docs, datasetId);
      }
      results.push({ table: `mongo_${collection}`, rows: docs.length });
    } catch (err) {
      results.push({ table: `mongo_${collection}`, error: err.message });
    }
  }

  await client.close();
  return results;
}

async function syncMySQL(credentials, datasetId) {
  const mysql = await import('mysql2/promise');
  const connection = await mysql.createConnection({
    host: credentials.host,
    port: credentials.port || 3306,
    database: credentials.database,
    user: credentials.user,
    password: credentials.password,
    ssl: credentials.ssl || undefined,
  });

  const tables = ['users', 'orders', 'products', 'customers'];
  const results = [];
  for (const table of tables) {
    try {
      const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 10000`);
      if (rows.length > 0) {
        await saveToBigQuery(`mysql_${table}`, rows, datasetId);
      }
      results.push({ table: `mysql_${table}`, rows: rows.length });
    } catch (err) {
      results.push({ table: `mysql_${table}`, error: err.message });
    }
  }

  await connection.end();
  return results;
}

async function syncFirestore(credentials, datasetId) {
  const sourceDb = new Firestore({ projectId: credentials.projectId });
  const collections = ['users', 'orders', 'events', 'products'];
  const results = [];

  for (const collection of collections) {
    try {
      const snapshot = await sourceDb.collection(collection).limit(10000).get();
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (docs.length > 0) {
        await saveToBigQuery(`fs_${collection}`, docs, datasetId);
      }
      results.push({ table: `fs_${collection}`, rows: docs.length });
    } catch (err) {
      results.push({ table: `fs_${collection}`, error: err.message });
    }
  }

  return results;
}

const CONNECTOR_HANDLERS = {
  Stripe: syncStripe,
  Shopify: syncShopify,
  HubSpot: syncHubSpot,
  Sentry: syncSentry,
  Salesforce: syncSalesforce,
  PostHog: syncPostHog,
  Klaviyo: syncKlaviyo,
  WooCommerce: syncWooCommerce,
  'Google Ads': syncGoogleAds,
  GA4: syncGA4,
  'TikTok Ads': syncTikTokAds,
  Facebook: syncFacebook,
  'Meta Ads': syncMetaAds,
  PostgreSQL: syncPostgreSQL,
  MySQL: syncMySQL,
  MongoDB: syncMongoDB,
  Firestore: syncFirestore,
};

processSyncQueue()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[sync-worker] Fatal error', err);
    process.exit(1);
  });
