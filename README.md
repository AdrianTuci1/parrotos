# Sentry Data Platform

> **AI-Powered Data Analytics & Integration Platform** — Connect, analyze, and visualize data from any source with AI assistance.

Complete data analytics platform with hierarchical structure: **Account → Organization → Project**. Runs on hybrid infrastructure: **VPS Contabo** for backend services, **Google Cloud Platform** for data services, and **Cloudflare** for frontend CDN.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ app.sentry   │  │ api.sentry   │  │ www.sentry   │          │
│  │ data.io      │  │ data.io      │  │ data.io      │          │
│  │ (CDN + SSL)  │  │ (DNS → VPS)  │  │ (CDN + SSL)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          ▼                 ▼                 │
┌─────────────────┐  ┌─────────────────┐      │
│  CLOUDFLARE     │  │  VPS CONTABO    │      │
│     PAGES       │  │  (Germany)      │      │
│                 │  │                 │      │
│  ┌───────────┐  │  │  ┌───────────┐  │      │
│  │ Frontend  │  │  │  │   Nginx   │  │      │
│  │  React    │  │  │  │ (Reverse  │  │      │
│  │  Static   │  │  │  │  Proxy)   │  │      │
│  └───────────┘  │  │  └─────┬─────┘  │      │
│                 │  │        │        │      │
│                 │  │  ┌─────┴─────┐  │      │
│                 │  │  │  Docker   │  │      │
│                 │  │  │ Compose   │  │      │
│                 │  │  │           │  │      │
│                 │  │  │ ┌───────┐ │  │      │
│                 │  │  │ │Backend│ │  │      │
│                 │  │  │ │:3000  │ │  │      │
│                 │  │  │ └───────┘ │  │      │
│                 │  │  │ ┌───────┐ │  │      │
│                 │  │  │ │ Sync  │ │  │      │
│                 │  │  │ │Worker │ │  │      │
│                 │  │  │ └───────┘ │  │      │
│                 │  │  └───────────┘  │      │
│                 │  └─────────────────┘      │
│                 │                             │
└─────────────────┘                             │
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│                         GCP                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Firestore │  │ BigQuery │  │  Cloud   │  │  Secret  │     │
│  │ (DB)     │  │(Analytics│  │ Storage  │  │ Manager │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────┐  ┌──────────┐                                  │
│  │ Cloud Run│  │ Cloud    │                                  │
│  │ Chat +   │  │ Scheduler│                                  │
│  │ Harness +│  │          │                                  │
│  │ Observer │  │          │                                  │
│  └──────────┘  └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### Hierarchical Structure

```
Account (Billing & Global Security)
  └── Organization (Operational & Plans)
        ├── Members & Roles (RBAC)
        ├── Billing (Stripe)
        └── Projects (Work Sandboxes)
              ├── Data Sources (Connectors)
              ├── Integrations
              ├── Analytics & Dashboards
              ├── Storage (Files & Volumes)
              └── Chat AI Sessions
```

---

## Technologies & Stack

| Component | Technology | Role |
|---|---|---|
| **Frontend** | React 19 + Vite + Zustand + Tailwind CSS 4 | UI dashboard, analytics, chat |
| **Backend API** | Node.js 20+ / Express | API REST, auth, RBAC, orchestration |
| **Sync Worker** | Node.js / Cron | Multi-tenant data sync (VPS) |
| **Chat AI** | Cloud Run + Google Gemini 2.5 Flash | Conversational AI with tools |
| **Harness** | Cloud Run + Google Gemini 2.5 Flash | Data discovery, spec generation |
| **Observer** | Cloud Run + BigQuery | Data health, drift detection, query validation |
| **Firestore** | Google Cloud Firestore | Hierarchical metadata (orgs, projects, users) |
| **BigQuery** | Google BigQuery | Analytics data storage & querying |
| **Cloud Storage** | Google Cloud Storage | Files, landing zone, specs, cache |
| **Secret Manager** | Google Cloud Secret Manager | Credentials & API keys |
| **Auth** | JWT + bcrypt | Authentication + RBAC roles (user/admin/owner) |
| **Billing** | Stripe | Subscription & invoice management |
| **Frontend CDN** | Cloudflare Pages | Global static asset delivery |
| **DNS & SSL** | Cloudflare | DNS management + SSL termination |
| **Reverse Proxy** | Nginx (VPS) | SSL + routing + load balancing |
| **Infrastructure** | Terraform + GitHub Actions | IaC + CI/CD |

---

## Services

### 1. Backend API (`/backend`)
Express API that orchestrates the entire platform:
- **Auth** — register, login, JWT, RBAC, OAuth
- **Organizations** — CRUD, plan management, limits
- **Projects** — CRUD, settings, GCS signed URLs
- **Storage** — volume management, file upload/download, folders
- **Analytics** — SQL queries, schema discovery, dashboard metrics
- **Chat** — proxy to Cloud Run Chat Service
- **Integrations** — 20+ connectors with automated sync (BigQuery Data Transfer)
- **Agents** — AI sessions, spec generation
- **Admin** — GCP infrastructure setup, health checks
- **Alerts** — monitoring and alerting system

### 2. Chat AI Service (`/services/chat`)
Conversational AI agent with streaming SSE (Server-Sent Events):
- Project-specific context (org, workspace, catalog)
- 5 tools: connect, widget, suggest, query, navigate
- Runs on Cloud Run (scale-to-zero, min-instances=0)
- LLM: Google Gemini 2.5 Flash
- Cost: ~$0.08/month for 100 requests/day

### 3. Harness Service (`/services/harness`)
Data discovery and spec generation engine:
- Automatic table and column discovery in BigQuery
- Widget spec generation (Vega-Lite)
- Column classification (dimensions, metrics, dates)
- Runs on Cloud Run (scale-to-zero, min-instances=0)
- Cost: ~$0.24/month for 10 runs/day

### 4. Observer Service (`/services/observer`)
Technical monitoring agent that runs independently from the harness:
- Periodic freshness checks and schema drift detection
- Dry-run validation for warehouse queries stored in dashboard specs
- Optional auto-heal for broken widget bindings without changing project business identity
- Writes `monitoring/health_report.json` and `monitoring/schema_snapshot.json` to GCS
- Can be triggered manually from project settings or scheduled every 2 days

### 5. Sync Worker (`/backend/src/services/ConnectorService.js`)
Multi-tenant data synchronization:
- 20+ connectors: Stripe, Sentry, Shopify, WooCommerce, Meta, TikTok, Google Ads, GA4, PostHog, Klaviyo, HubSpot, Salesforce, PostgreSQL, MySQL, MongoDB, Firestore, Facebook, Search Console, YouTube
- Single multi-tenant worker on the VPS
- Scheduled sync via Cloud Scheduler (every 5-30 min based on connector)
- Firestore queue + periodic local execution on the VPS

### 6. Frontend (`/frontend`)
React 19 application with Vite:
- Dashboard with configurable widgets
- Chart editor (Vega-Lite + Vega-Embed)
- Integrated AI Chat
- Mindmap for data flow visualization
- Organization & Project management
- Storage management (files, volumes, folders)
- Billing UI with pricing plans
- Integrations manager with 20+ connectors

---

## Pricing Plans

| Feature | Free | Launch ($50/mo) | Scale ($150/mo) | Enterprise |
|---|---|---|---|---|
| Users | 1 | Unlimited | Unlimited | Unlimited |
| Projects | 1 | 5 | 20 | Custom |
| Storage | 20 GB pooled | 150 GB pooled | 500 GB pooled | Custom |
| Refresh | 1h | 1h | 10 min | Live |
| Chat AI | ✓ | ✓ | ✓ | ✓ |
| AI Sentiment | ✓ | ✓ | ✓ | ✓ |
| Service Accounts | — | 2 | 5 | Unlimited |
| Integrations (Slack) | — | — | ✓ | ✓ |
| Engagement Tracking | — | Likes, Comments | Likes, Comments | Likes, Comments |
| Influencer Analysis | — | ✓ | ✓ | ✓ |
| Presence Score | — | 1 account | 5 accounts | Unlimited |

---

## Infrastructure

### Hybrid Architecture

| Layer | Provider | Services | Cost (5 users) |
|---|---|---|---|
| **Frontend** | Cloudflare | Pages (CDN) + DNS + SSL | $0 |
| **Backend API** | Contabo VPS | Docker + Nginx + Node.js | €10.99 (~$12) |
| **Sync Worker** | Contabo VPS | Docker cron container | Included in VPS |
| **Chat AI** | GCP Cloud Run | Gemini 2.5 Flash | ~$0.08 |
| **Harness** | GCP Cloud Run | BigQuery + Gemini | ~$0.24 |
| **Observer** | GCP Cloud Run | BigQuery health checks | ~$0.10 |
| **Database** | GCP Firestore | NoSQL metadata | $0-5 (free tier) |
| **Analytics** | GCP BigQuery | Data warehouse | $0-5 (free tier) |
| **Files** | GCP Cloud Storage | Object storage | $0-5 (free tier) |
| **Secrets** | GCP Secret Manager | API keys, tokens | $0 |
| **Scheduler** | GCP Cloud Scheduler | Cron triggers | $0.10 |
| **Total** | | | **~$12-20/month** |

### Cost Scaling

| Users | VPS | Cloud Run | GCP Services | Total |
|---|---|---|---|---|
| **5** | €10.99 | $0.32 | $0-5 | **~$12-20/month** |
| 25 | €10.99 | $1.50 | $15-30 | ~$27-42/month |
| 100 | €24.99 | $5.00 | $30-50 | ~$58-78/month |

---

## Quick Start — Deploy to Production

### Prerequisites

1. **GCP Account** with billing enabled
2. **Contabo VPS** purchased (Ubuntu 22.04)
3. **Cloudflare Account** with domain added
4. **GitHub Repository** with Actions enabled

### One-Time Setup

```bash
# 1. Clone repository
git clone git@github.com:YOUR_USERNAME/sentry-data.git
cd sentry-data

# 2. Setup GCP project and generate service account key
./scripts/setup-gcp-project.sh
# Output: terraform-sa-key.json

# 3. Generate secrets and SSH keys
./scripts/setup-github-secrets.sh
# Output: JWT_SECRET, INTERNAL_TOKEN, vps-key

# 4. Add secrets to GitHub
# GitHub → Settings → Secrets and variables → Actions
# Add: VPS_HOST, VPS_USER, VPS_SSH_KEY, GCP_PROJECT_ID,
#      GCP_SA_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID,
#      CLOUDFLARE_ACCOUNT_ID, JWT_SECRET, INTERNAL_TOKEN,
#      LLM_API_KEY, DOMAIN
```

### Deploy (One Command)

```bash
# GitHub CLI
gh workflow run "🚀 Deploy Complete Infrastructure" -f environment=prod

# Or from GitHub UI:
# Actions → "🚀 Deploy Complete Infrastructure" → Run workflow
```

### Destroy (One Command)

```bash
# GitHub CLI
gh workflow run "💥 Destroy Complete Infrastructure" \
  -f confirmation=DESTROY -f environment=prod

# Or from GitHub UI:
# Actions → "💥 Destroy Complete Infrastructure" → Run workflow
# Type: DESTROY
```

---

## Quick Start — Local Development

```bash
# 1. Clone repository
git clone git@github.com:YOUR_USERNAME/sentry-data.git
cd sentry-data

# 2. Copy and configure .env
cp .env.example .env
# Fill in: JWT_SECRET, LLM_API_KEY, INTERNAL_TOKEN, GCP_PROJECT_ID, etc.

# 3. Start everything with Docker Compose
docker compose up -d --build

# 4. Check service health
curl http://localhost:3000/health

# 5. For separate frontend development:
cd frontend
npm install
npm run dev
```

### Main Environment Variables

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret for JWT token signing |
| `LLM_API_KEY` | Gemini API key (or OpenAI) |
| `INTERNAL_TOKEN` | Shared token between services |
| `GCP_PROJECT_ID` | GCP Project ID |
| `GCS_BUCKET_NAME` | GCS bucket name |
| `ENABLE_BIGQUERY_ANALYTICS` | Enable/disable BigQuery |
| `LLM_PROVIDER` | `gemini` or `openai` |
| `LLM_MODEL` | LLM model (e.g., `gemini-2.5-flash`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |

---

## API Endpoints (Main)

### Auth
- `POST /api/v1/auth/register` — Register
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/oauth/:provider` — OAuth login

### Organizations
- `POST /api/v1/organizations` — Create organization
- `GET /api/v1/organizations` — List organizations
- `GET /api/v1/organizations/:orgId` — Details
- `PATCH /api/v1/organizations/:orgId` — Update
- `DELETE /api/v1/organizations/:orgId` — Delete

### Projects
- `POST /api/v1/organizations/:orgId/projects` — Create project
- `GET /api/v1/organizations/:orgId/projects` — List projects
- `GET /api/v1/organizations/:orgId/projects/:projectId/settings` — Settings
- `POST /api/v1/organizations/:orgId/projects/:projectId/gcs-url` — GCS Signed URL

### Storage
- `GET /api/v1/organizations/:orgId/projects/:projectId/storage` — List volumes
- `POST /api/v1/organizations/:orgId/projects/:projectId/storage` — Create volume
- `DELETE /api/v1/organizations/:orgId/projects/:projectId/storage/:volumeId` — Delete volume
- `GET /api/v1/organizations/:orgId/projects/:projectId/storage/:volumeId/files` — List files
- `POST /api/v1/organizations/:orgId/projects/:projectId/storage/:volumeId/folders` — Create folder
- `DELETE /api/v1/organizations/:orgId/projects/:projectId/storage/:volumeId/files/:fileId` — Delete file
- `GET /api/v1/organizations/:orgId/projects/:projectId/storage/upload-url` — Upload URL
- `GET /api/v1/organizations/:orgId/projects/:projectId/storage/download-url` — Download URL

### Analytics
- `POST /api/v1/organizations/:orgId/projects/:projectId/analytics/query` — SQL query
- `GET /api/v1/organizations/:orgId/projects/:projectId/analytics/schema` — Table schema
- `GET /api/v1/organizations/:orgId/projects/:projectId/analytics/dashboard` — Dashboard metrics

### Integrations
- `GET /api/v1/organizations/:orgId/projects/:projectId/integrations` — List integrations
- `POST /api/v1/organizations/:orgId/projects/:projectId/integrations` — Add integration
- `POST /api/v1/organizations/:orgId/projects/:projectId/integrations/:connectorId/trigger-sync` — Manual sync
- `POST /api/v1/webhook/sync-complete` — Sync completion webhook

### Chat
- `POST /api/v1/organizations/:orgId/projects/:projectId/agents` — Create chat session
- `POST /api/v1/organizations/:orgId/projects/:projectId/agents/:sessionId/message` — Send message (SSE)

### Specs
- `POST /api/v1/organizations/:orgId/projects/:projectId/specs/generate` — Generate widget specs

### Admin
- `POST /api/v1/admin/setup/gcp` — Setup GCP infrastructure
- `GET /api/v1/health` — Health check
- `GET /api/v1/health/ready` — Readiness check
- `GET /api/v1/health/live` — Liveness check

---

## Security

- **JWT** for user authentication
- **RBAC** with roles: `user`, `admin`, `owner`
- **Google OIDC ID tokens** for backend (Contabo) → private Cloud Run service invocation
- **X-Internal-Token** as defense-in-depth inside private service-to-service calls
- **GCS Signed URLs** with limited expiration
- **BigQuery Isolation** per project (dedicated dataset)
- **CORS** configured from environment variables
- **Helmet** HTTP security headers
- **Rate Limiting** per endpoint
- **Security Headers** (CSP, HSTS, X-Frame-Options)
- **Cloudflare** DDoS protection + SSL

---

## Infrastructure as Code

### Terraform Resources

All GCP resources are managed via Terraform and GitHub Actions:
- 5 Service Accounts (backend, chat, harness, observer, compute)
- 25+ IAM Roles
- Firestore Database
- BigQuery Dataset
- Cloud Storage Bucket
- Secret Manager (3 secrets)
- Cloud Run service definitions (chat, harness, observer)
- Cloud Scheduler API enablement + invoker IAM for observer schedules
- Cloudflare DNS Records

### Private Cloud Run Invocation

The backend runs on Contabo, while `chat`, `harness`, and `observer` run on private Cloud Run services.

- Backend discovers service URLs from `CHAT_SERVICE_URL`, `HARNESS_SERVICE_URL`, and `OBSERVER_SERVICE_URL`
- For Cloud Run URLs, backend generates a Google ID token at runtime using ADC / service-account credentials
- Cloud Run validates the OIDC token at the platform layer
- The request still carries `X-Internal-Token` for in-app defense-in-depth
- Cloud Scheduler triggers the observer with OIDC using `CLOUD_SCHEDULER_INVOKER_SERVICE_ACCOUNT_EMAIL`

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `🚀 Deploy Complete Infrastructure` | Manual | Deploy all services |
| `💥 Destroy Complete Infrastructure` | Manual + `DESTROY` confirmation | Destroy all resources |

### Scripts

| Script | Purpose |
|---|---|
| `scripts/setup-gcp-project.sh` | Setup GCP project, enable APIs, create Terraform SA |
| `scripts/setup-github-secrets.sh` | Generate JWT_SECRET, INTERNAL_TOKEN, SSH keys |
| `scripts/deploy.sh` | One-click deploy/destroy |

---

## Documentation

| Document | Purpose |
|---|---|
| `docs/DEPLOY_DESTROY_GUIDE.md` | Complete deploy & destroy guide |
| `docs/PRE_DEPLOY_SETUP.md` | Pre-deploy setup checklist |
| `docs/GCP_PERMISSIONS.md` | GCP permissions and roles |
| `terraform/README.md` | Terraform infrastructure documentation |

---

## License

Proprietary — Sentry Data Platform
