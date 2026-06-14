# Terraform Infrastructure - Sentry Data Platform

## Overview
Complete Infrastructure as Code (IaC) for deploying Sentry Data Platform on GCP + Cloudflare.

**Deploy time: ~10 minutes**
**Destroy time: ~5 minutes**

## Files

| File | Purpose |
|------|---------|
| `main.tf` | Terraform configuration, providers, backend |
| `variables.tf` | All input variables |
| `gcp.tf` | All GCP resources (Cloud Run, Firestore, BigQuery, etc.) |
| `outputs.tf` | Output values (URLs, IDs) |
| `terraform.tfvars.example` | Example configuration |

## Quick Start

### 1. Install Prerequisites

```bash
# Terraform
brew install terraform

# gcloud CLI
brew install google-cloud-sdk

# Docker
brew install docker

# Cloudflare wrangler (for frontend)
npm install -g wrangler
```

### 2. Authenticate

```bash
# Login to GCP
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Get application default credentials (for Terraform)
gcloud auth application-default login
```

### 3. Configure

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars
```

Required variables:
- `project_id` - GCP project ID
- `cloudflare_zone_id` - Cloudflare zone ID
- `cloudflare_api_token` - Cloudflare API token
- `vps_host` - public IP or hostname for the Contabo API server
- `jwt_secret` - Generate: `openssl rand -base64 32`
- `internal_token` - Generate: `openssl rand -base64 16`
- `llm_api_key` - Gemini API key

### 4. Deploy Everything

```bash
# One command deploy
cd ..
./scripts/deploy.sh prod deploy

# Or manually:
cd terraform
terraform init
terraform plan
terraform apply
```

### 5. Deploy Frontend

```bash
cd frontend
npm ci
npm run build
npx wrangler pages deploy dist --project-name=sentry-frontend
```

## Commands

```bash
# Full deploy
./scripts/deploy.sh prod deploy

# Deploy only infrastructure
./scripts/deploy.sh prod setup

# Build and push Docker images
./scripts/deploy.sh prod build

# Deploy only frontend
./scripts/deploy.sh prod frontend

# Destroy everything (⚠️ deletes data!)
./scripts/deploy.sh prod destroy

# Or with Terraform directly:
cd terraform
terraform destroy -auto-approve
```

## Resources Created

### GCP Services
- **Cloud Run**: 3 services (chat, harness, observer)
- **Cloud Scheduler API**: enabled for backend-managed observer schedules
- **Firestore**: Native mode database
- **BigQuery**: Dataset for analytics
- **Cloud Storage**: Bucket for files
- **Secret Manager**: 3 secrets (JWT, internal token, LLM key)
- **Service Accounts**: 5 accounts with IAM roles

### Cloudflare
- **DNS Records**: api, app, www
- **Page Rules**: HTTPS redirect
- **SSL**: Full strict

## Architecture

```
User → Cloudflare (DNS + SSL + CDN)
  → Frontend: Cloudflare Pages (app.sentrydata.io)
  → API: Contabo VPS (api.sentrydata.io)
    → Chat Service: Cloud Run (private IAM)
    → Harness Service: Cloud Run (private IAM)
    → Observer Service: Cloud Run (private IAM)
    → VPS scheduler runs one multi-tenant sync worker for all connectors
  → Data:
    - Firestore (metadata, users, orgs)
    - BigQuery (analytics, synced data)
    - GCS (files, assets)
    - Secret Manager (credentials)
```

## Cost Optimization

### Free Tier (included)
- Cloud Run: 2M requests/month
- Firestore: 50K reads/day, 20K writes/day, 1GB storage
- BigQuery: 1TB query/month
- Storage: 5GB standard

### Estimated Costs

| Users | Monthly Cost | Per User |
|-------|-------------|----------|
| 5 | $0-10 | $0-2 |
| 25 | $15-30 | $0.60-1.20 |
| 100 | $50-80 | $0.50-0.80 |

### Cost Controls
- Cloud Run: min instances = 0 (chat, harness, observer)
- BigQuery: partitioned tables, 90-day expiration
- GCS: lifecycle policy (30d → Nearline, 90d → Coldline)
- Firestore: composite indexes, TTL for old data

## Monitoring

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision"

# View metrics
gcloud monitoring dashboards list

# Check service status
gcloud run services list
```

## Troubleshooting

### Terraform fails to apply
```bash
# Check APIs are enabled
gcloud services list --enabled

# Check permissions
gcloud projects get-iam-policy PROJECT_ID

# Re-run with debug
terraform apply -auto-approve -debug
```

### Cloud Run service not responding
```bash
# Check logs
gcloud run services logs read sentry-chat

# Check service status
gcloud run services describe sentry-harness --region=europe-west1

# Check observer too
gcloud run services describe sentry-observer --region=europe-west1
```

### Frontend not loading
```bash
# Check Cloudflare DNS
wrangler pages deployment list --project-name=sentry-frontend

# Check CORS
curl -I https://api.sentrydata.io/api/v1/health
```

## Security

- All services use dedicated service accounts (principle of least privilege)
- Secrets stored in Secret Manager, never in code
- Cloud Run services use internal network where possible
- Cloudflare provides DDoS protection and WAF
- HTTPS enforced everywhere

## Backup & Recovery

```bash
# Firestore backup
gcloud firestore backups schedules create --database='(default)' --retention=7d --recurrence=daily

# BigQuery export
bq extract --destination_format=AVRO sentry_dataset_prod.* gs://sentry-platform-data-prod/backups/

# GCS versioning enabled by default (keeps last 5 versions)
```

## Destroying Resources

⚠️ **WARNING**: This deletes ALL data!

```bash
# Quick destroy
./scripts/deploy.sh prod destroy

# Or manual
cd terraform
terraform destroy -auto-approve

# Clean up GCS bucket (terraform can't delete non-empty buckets)
gsutil -m rm -r gs://sentry-platform-data-PROJECT_ID/**
```

## Next Steps

1. **Stripe Integration**: Add webhook endpoint in Stripe dashboard
2. **Custom Domain**: Update Cloudflare DNS records
3. **SSL**: Cloudflare handles SSL automatically
4. **Monitoring**: Set up alerts in Cloud Monitoring
5. **CI/CD**: GitHub Actions workflow included in `.github/workflows/deploy.yml`

## Support

- **Docs**: https://docs.sentrydata.io
- **Status**: https://status.sentrydata.io
- **Email**: support@sentrydata.io
