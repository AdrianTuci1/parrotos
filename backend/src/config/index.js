import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  
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
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/google/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
