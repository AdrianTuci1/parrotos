# GCP IAM Permissions for Sentry Data Platform

## Overview
This document defines all IAM roles and permissions required for the Sentry Data Platform backend running on Contabo plus the private Cloud Run services (`chat`, `harness`, `observer`) and connector-managed sync jobs.

## Service Accounts

### 1. `sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com`
**Used by**: Docker container `backend` (Node.js Express API)
**Purpose**: Main API backend serving frontend requests

#### Required Roles:
```bash
# Firestore - user data, organizations, projects, integrations
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# BigQuery - query data for analytics, create datasets
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# Cloud Storage - file storage, signed URLs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Secret Manager - store connector credentials
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"

# Cloud Run - deploy and manage jobs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Cloud Scheduler - create scheduled jobs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.admin"

# Pub/Sub - create topics, publish messages
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"

# Service Account management - create service accounts for users
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"

# Cloud Logging - write logs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# Cloud Monitoring - write metrics
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-backend@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"
```

---

### 2. `sentry-chat@<PROJECT_ID>.iam.gserviceaccount.com`
**Used by**: Docker container `chat` (AI chat service)
**Purpose**: AI chat service with streaming responses

#### Required Roles:
```bash
# Firestore - read agent specs, write chat sessions
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-chat@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Cloud Storage - read/write chat artifacts
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-chat@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Cloud Logging - write logs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-chat@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

---

### 3. `sentry-harness@<PROJECT_ID>.iam.gserviceaccount.com`
**Used by**: Docker container `harness` (BigQuery discovery + LLM specs)
**Purpose**: Discovers BigQuery tables, generates specs via LLM

#### Required Roles:
```bash
# BigQuery - read datasets, tables, run queries
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-harness@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-harness@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# Cloud Storage - read/write agent snapshots
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-harness@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Firestore - read/write specs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-harness@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Cloud Logging - write logs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-harness@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

---

### 4. `sentry-jobs@<PROJECT_ID>.iam.gserviceaccount.com`
**Used by**: Cloud Run Job `sentry-sync-worker`
**Purpose**: Multi-tenant sync worker for all connectors

#### Required Roles:
```bash
# Secret Manager - read connector credentials
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-jobs@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# BigQuery - create datasets, insert data
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-jobs@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-jobs@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# Firestore - read sync queue, update status
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-jobs@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Pub/Sub - publish sync completion events
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-jobs@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Cloud Logging - write logs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-jobs@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

---

### 5. `sentry-compute@<PROJECT_ID>.iam.gserviceaccount.com`
**Used by**: Cloud Run service (if deploying to Cloud Run instead of Docker)
**Purpose**: Default compute service account for Cloud Run

#### Required Roles:
```bash
# Cloud Run - invoke jobs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-compute@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Cloud Scheduler - invoke scheduled jobs
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:sentry-compute@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.jobRunner"
```

---

## API Services to Enable

```bash
# Core GCP APIs
gcloud services enable firestore.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable pubsub.googleapis.com

# Additional APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com

# For BigQuery Data Transfer (GA4, Google Ads, Search Console)
gcloud services enable bigquerydatatransfer.googleapis.com
```

---

## Permission Matrix by Service

| Service Account | Firestore | BigQuery | GCS | Secret Manager | Cloud Run | Scheduler | Pub/Sub | IAM |
|----------------|-----------|----------|-----|----------------|-----------|-----------|---------|-----|
| sentry-backend | Read/Write | DataEditor/JobUser | ObjectAdmin | Admin | Admin | Admin | Admin | ServiceAccountAdmin |
| sentry-chat | Read/Write | - | ObjectAdmin | - | - | - | - | - |
| sentry-harness | Read/Write | DataViewer/JobUser | ObjectAdmin | - | - | - | - | - |
| sentry-jobs | Read/Write | DataEditor/JobUser | - | SecretAccessor | - | - | Publisher | - |
| sentry-compute | - | - | - | - | Invoker | JobRunner | - | - |

---

## Docker Compose Environment Variables

Add these to your `.env` file for local development:

```env
# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_REGION=europe-west1
GCP_KEY_PATH=/path/to/service-account-key.json

# Service Account Keys (for local Docker development)
# In production, use Workload Identity or mounted secrets
GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-key.json

# Backend
JWT_SECRET=your-jwt-secret
INTERNAL_TOKEN=your-internal-token

# Services
CHAT_SERVICE_URL=https://sentry-chat-xxxxx-ew.a.run.app
HARNESS_SERVICE_URL=https://sentry-harness-xxxxx-ew.a.run.app
OBSERVER_SERVICE_URL=https://sentry-observer-xxxxx-ew.a.run.app
CLOUD_RUN_AUTH_MODE=required

# BigQuery
BIGQUERY_LOCATION=EU
BIGQUERY_DATASET_PREFIX=sentry_dataset

# Storage
GCS_BUCKET_NAME=sentry-platform-data

# Feature Flags
ENABLE_BIGQUERY_ANALYTICS=true
```

---

## Quick Setup Script

```bash
#!/bin/bash
# setup-gcp-permissions.sh

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./setup-gcp-permissions.sh <PROJECT_ID>"
  exit 1
fi

echo "Setting up GCP permissions for project: $PROJECT_ID"

# Create service accounts
gcloud iam service-accounts create sentry-backend --display-name="Sentry Backend" --project=$PROJECT_ID
gcloud iam service-accounts create sentry-chat --display-name="Sentry Chat" --project=$PROJECT_ID
gcloud iam service-accounts create sentry-harness --display-name="Sentry Harness" --project=$PROJECT_ID
gcloud iam service-accounts create sentry-jobs --display-name="Sentry Jobs" --project=$PROJECT_ID
gcloud iam service-accounts create sentry-compute --display-name="Sentry Compute" --project=$PROJECT_ID

# Enable APIs
gcloud services enable firestore.googleapis.com --project=$PROJECT_ID
gcloud services enable bigquery.googleapis.com --project=$PROJECT_ID
gcloud services enable storage.googleapis.com --project=$PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID
gcloud services enable pubsub.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable logging.googleapis.com --project=$PROJECT_ID
gcloud services enable monitoring.googleapis.com --project=$PROJECT_ID

# Backend permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# Chat permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-chat@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-chat@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-chat@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# Harness permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# Jobs permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# Compute permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-compute@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-compute@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.jobRunner"

echo "Setup complete!"
```

---

## Security Notes

1. **Principle of Least Privilege**: Each service account has only the permissions it needs
2. **Workload Identity**: In production, use Workload Identity instead of service account keys
3. **Secret Rotation**: Rotate secrets regularly using Secret Manager versioning
4. **Audit Logging**: Enable audit logging for all services
5. **VPC Service Controls**: Consider using VPC Service Controls for additional security
6. **Cloud Armor**: Use Cloud Armor for DDoS protection when deploying to Cloud Run

---

## Cost Optimization

1. **BigQuery**: Use partitioned tables and clustering to reduce query costs
2. **Cloud Run**: Set minimum instances to 0 for cost savings
3. **Cloud Storage**: Use lifecycle policies to archive old data
4. **Firestore**: Use composite indexes efficiently to avoid full collection scans
5. **Cloud Scheduler**: 1 job for all syncs vs individual jobs per connector

---

*Generated for Sentry Data Platform v1.0*
*Last updated: 2024*
