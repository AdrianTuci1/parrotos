#!/bin/bash
# setup-gcp-permissions.sh
# Setup script for GCP permissions for Sentry Data Platform

set -e

PROJECT_ID=$1
REGION=${2:-europe-west1}

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./setup-gcp-permissions.sh <PROJECT_ID> [REGION]"
  echo "Example: ./setup-gcp-permissions.sh my-project-id europe-west1"
  exit 1
fi

echo "=========================================="
echo "Setting up GCP permissions for project: $PROJECT_ID"
echo "Region: $REGION"
echo "=========================================="

# Create service accounts
echo "Creating service accounts..."
gcloud iam service-accounts create sentry-backend \
  --display-name="Sentry Backend API" \
  --description="Main backend API service for Sentry Data Platform" \
  --project=$PROJECT_ID || echo "sentry-backend already exists"

gcloud iam service-accounts create sentry-chat \
  --display-name="Sentry Chat AI" \
  --description="AI chat service for Sentry Data Platform" \
  --project=$PROJECT_ID || echo "sentry-chat already exists"

gcloud iam service-accounts create sentry-harness \
  --display-name="Sentry Harness" \
  --description="BigQuery discovery and spec generation service" \
  --project=$PROJECT_ID || echo "sentry-harness already exists"

gcloud iam service-accounts create sentry-jobs \
  --display-name="Sentry Sync Worker" \
  --description="Multi-tenant data sync worker for connectors" \
  --project=$PROJECT_ID || echo "sentry-jobs already exists"

gcloud iam service-accounts create sentry-compute \
  --display-name="Sentry Compute" \
  --description="Default compute service for Cloud Run" \
  --project=$PROJECT_ID || echo "sentry-compute already exists"

# Enable APIs
echo ""
echo "Enabling GCP APIs..."
gcloud services enable firestore.googleapis.com --project=$PROJECT_ID
gcloud services enable bigquery.googleapis.com --project=$PROJECT_ID
gcloud services enable storage.googleapis.com --project=$PROJECT_ID
gcloud services enable storage-component.googleapis.com --project=$PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID
gcloud services enable pubsub.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable logging.googleapis.com --project=$PROJECT_ID
gcloud services enable monitoring.googleapis.com --project=$PROJECT_ID
gcloud services enable bigquerydatatransfer.googleapis.com --project=$PROJECT_ID

echo ""
echo "Waiting for APIs to propagate..."
sleep 10

# Backend permissions
echo ""
echo "Setting up backend permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.admin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter" \
  --condition=None

# Chat permissions
echo ""
echo "Setting up chat permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-chat@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-chat@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-chat@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter" \
  --condition=None

# Harness permissions
echo ""
echo "Setting up harness permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-harness@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter" \
  --condition=None

# Jobs permissions
echo ""
echo "Setting up jobs permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter" \
  --condition=None

# Compute permissions
echo ""
echo "Setting up compute permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-compute@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sentry-compute@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.jobRunner" \
  --condition=None

# Create service account keys for local development (optional)
echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Service accounts created:"
echo "  - sentry-backend@$PROJECT_ID.iam.gserviceaccount.com"
echo "  - sentry-chat@$PROJECT_ID.iam.gserviceaccount.com"
echo "  - sentry-harness@$PROJECT_ID.iam.gserviceaccount.com"
echo "  - sentry-jobs@$PROJECT_ID.iam.gserviceaccount.com"
echo "  - sentry-compute@$PROJECT_ID.iam.gserviceaccount.com"
echo ""
echo "To create keys for local development:"
echo "  gcloud iam service-accounts keys create backend-key.json \\"
echo "    --iam-account=sentry-backend@$PROJECT_ID.iam.gserviceaccount.com"
echo ""
echo "To deploy to Cloud Run with Workload Identity:"
echo "  gcloud run deploy sentry-backend \\"
echo "    --service-account=sentry-backend@$PROJECT_ID.iam.gserviceaccount.com \\"
echo "    --region=$REGION"
echo ""
echo "Next steps:"
echo "  1. Create a GCS bucket: gs://sentry-platform-data-$PROJECT_ID"
echo "  2. Create Firestore database in native mode"
echo "  3. Set up BigQuery dataset"
echo "  4. Configure Stripe webhook endpoint"
echo "  5. Deploy Cloud Run Job for sync worker"
