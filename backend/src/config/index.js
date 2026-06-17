import dotenv from 'dotenv';

dotenv.config();

function parseDurationToMs(value, fallbackMs) {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);

  if (!match) {
    return fallbackMs;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  refreshTokenTtlMs: parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d', 30 * 24 * 60 * 60 * 1000),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'parrot_refresh_token',
  refreshCookieDomain: process.env.REFRESH_COOKIE_DOMAIN || '',
  
  // GCP
  gcpProjectId: process.env.GCP_PROJECT_ID,
  gcpRegion: process.env.GCP_REGION || 'europe-west1',
  
  // GCS
  gcsBucketName: process.env.GCS_BUCKET_NAME || 'sentry-platform-data',
  gcsLandingZonePrefix: process.env.GCS_LANDING_ZONE_PREFIX || 'landing_zone',
  gcsAgentSnapshotsPrefix: process.env.GCS_AGENT_SNAPSHOTS_PREFIX || 'agent_snapshots',
  gcsSessionFilesPrefix: process.env.GCS_SESSION_FILES_PREFIX || 'session_files',
  
  // BigQuery
  bigQueryLocation: process.env.BIGQUERY_LOCATION || 'EU',
  bigQueryDatasetPrefix: process.env.BIGQUERY_DATASET_PREFIX || 'sentry_dataset',
  
  // Modal
  modalWebhookSecret: process.env.MODAL_WEBHOOK_SECRET,
  modalApiUrl: process.env.MODAL_API_URL,
  
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Feature Flags
  enableBigQueryAnalytics: process.env.ENABLE_BIGQUERY_ANALYTICS === 'true',

  // Services (Cloud Run / Docker Compose)
  chatServiceUrl: process.env.CHAT_SERVICE_URL || 'http://localhost:8080',
  harnessServiceUrl: process.env.HARNESS_SERVICE_URL || 'http://localhost:8081',
  observerServiceUrl: process.env.OBSERVER_SERVICE_URL || 'http://localhost:8082',
  internalToken: process.env.INTERNAL_TOKEN || 'dev-internal-token',
  cloudRunAuthMode: process.env.CLOUD_RUN_AUTH_MODE || 'auto',
  cloudSchedulerInvokerServiceAccountEmail: process.env.CLOUD_SCHEDULER_INVOKER_SERVICE_ACCOUNT_EMAIL || '',

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://api.statsparrot.com/api/v1/auth/google/callback',
  frontendUrl: process.env.FRONTEND_URL || 'https://app.statsparrot.com',
};
