# 🚀 Sentry Data Platform - Deploy & Destroy Guide

## Arhitectura Finala

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                              │
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
│     PAGES       │  │  (Germania)     │      │
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

## 📋 Ce Face Terraform Automat vs Manual

### ✅ Terraform CREEAZA AUTOMAT:

| Resursa | Descriere |
|---------|-----------|
| Service Accounts (5) | backend caller, chat, harness, observer, compute |
| IAM Roles (25+) | Permisiuni pentru fiecare service account |
| Firestore Database | Native mode, region EU |
| BigQuery Dataset | `sentry_dataset_prod` |
| Cloud Storage Bucket | `sentry-platform-data-PROJECT_ID` |
| Secret Manager | 3 secrete (JWT, internal token, LLM key) |
| Cloud Run Services | `chat`, `harness`, `observer` cu IAM privat |
| Cloud Scheduler API + IAM | Pentru joburile observer create din backend |
| Cloudflare DNS | Records pentru api, app, www |

### ❌ Ce trebuie facut MANUAL inainte:

1. Cont GCP cu billing activat
2. Rulare script `setup-gcp-project.sh` (creeaza proiect, APIs, SA pentru Terraform)
3. VPS Contabo cumparat si configurat
4. Cheie SSH generata pentru VPS
5. Cont Cloudflare cu domeniu adaugat
6. API Token Cloudflare generat
7. Gemini API Key obtinuta
8. Rulare script `setup-github-secrets.sh` (genereaza JWT, INTERNAL_TOKEN)
9. Adaugare 12 secrete in GitHub
10. Adaugare variabila DOMAIN in GitHub

## 🚀 Comanda de Deploy

### Option 1: GitHub Actions UI (Recomandat)

1. Go to **GitHub Repository** → **Actions**
2. Select **"🚀 Deploy Complete Infrastructure"**
3. Click **"Run workflow"**
4. Select environment: `prod`
5. Click **"Run workflow"**

### Option 2: GitHub CLI

```bash
# Trigger deploy
gh workflow run "🚀 Deploy Complete Infrastructure" \
  -f environment=prod

# Monitor
gh run watch
```

## 💥 Comanda de Destroy

### ⚠️ WARNING: This deletes ALL data!

### Option 1: GitHub Actions UI (Recomandat)

1. Go to **GitHub Repository** → **Actions**
2. Select **"💥 Destroy Complete Infrastructure"**
3. Click **"Run workflow"**
4. Type `DESTROY` in confirmation field
5. Select environment: `prod`
6. Click **"Run workflow"**

### Option 2: GitHub CLI

```bash
# Trigger destroy
gh workflow run "💥 Destroy Complete Infrastructure" \
  -f confirmation=DESTROY \
  -f environment=prod

# Monitor
gh run watch
```

## 📋 Variabile GitHub Actions (Secrets)

### Required Secrets

| Secret | Description | How to Get |
|--------|-------------|------------|
| `VPS_HOST` | IP address of Contabo VPS | From Contabo dashboard |
| `VPS_USER` | SSH username (usually `root`) | Set during VPS purchase |
| `VPS_SSH_KEY` | Private SSH key for VPS access | Generated by `setup-github-secrets.sh` |
| `GCP_PROJECT_ID` | Google Cloud Project ID | From GCP Console |
| `GCP_SA_KEY` | GCP Service Account JSON key | Generated by `setup-gcp-project.sh` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | Cloudflare Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ZONE_ID` | Cloudflare Zone ID | Cloudflare Dashboard → Domain → Overview |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | Cloudflare Dashboard → right sidebar |
| `JWT_SECRET` | JWT signing secret | Generated by `setup-github-secrets.sh` |
| `INTERNAL_TOKEN` | Internal API token | Generated by `setup-github-secrets.sh` |
| `LLM_API_KEY` | Gemini API key | Google AI Studio |

### Optional Secrets

| Secret | Description | Default |
|--------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | "" |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | "" |

### Variables (not secrets)

| Variable | Description | Default |
|----------|-------------|---------|
| `DOMAIN` | Main domain | `sentrydata.io` |

## 🔧 Setup Initial (Inainte de Primul Deploy)

### Pasul 1: Cont GCP (5 minute)

```bash
# 1. Creare cont Google Cloud (daca nu ai)
# https://console.cloud.google.com

# 2. Activare billing (necesar card)
# Billing → Add billing account

# 3. Noteaza Billing Account ID
# Format: 012345-678901-234567
```

### Pasul 2: Rulare Script Setup GCP (10 minute)

```bash
# Cloneaza repo-ul
git clone https://github.com/YOUR_USERNAME/sentry-data.git
cd sentry-data

# Rulare script setup
./scripts/setup-gcp-project.sh

# Scriptul va:
# ✅ Verifica gcloud autentificare
# ✅ Creaza proiect GCP (sau foloseste existent)
# ✅ Link-eaza billing
# ✅ Enable 15 API-uri
# ✅ Creaza service account "terraform-admin"
# ✅ Grant owner role
# ✅ Creaza si descarca cheia JSON
# ✅ Creaza GCS bucket pentru Terraform state
```

**Output:**
```
Project ID: sentry-data-prod-123
Terraform SA: terraform-admin@sentry-data-prod-123.iam.gserviceaccount.com
Key File: terraform-sa-key.json
State Bucket: gs://sentry-terraform-state-sentry-data-prod-123
```

### Pasul 3: Setup VPS Contabo (15 minute)

```bash
# 1. Cumpara VPS de la https://contabo.com
#    Recomandat: VPS 2 (6 vCPU, 16GB RAM) - €10.99/luna
#    Selecteaza: Ubuntu 22.04

# 2. Asteapta email cu IP si root password

# 3. Conectare initiala
ssh root@YOUR_VPS_IP

# 4. Schimba parola root
passwd

# 5. Update sistem
apt update && apt upgrade -y

# 6. Instaleaza Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin

# 7. Genereaza cheie SSH (pe local machine)
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/sentry-vps

# 8. Copiaza cheia publica pe VPS
ssh-copy-id -i ~/.ssh/sentry-vps.pub root@YOUR_VPS_IP

# 9. Testeaza conectarea fara parola
ssh -i ~/.ssh/sentry-vps root@YOUR_VPS_IP
```

### Pasul 4: Setup Cloudflare (10 minute)

```bash
# 1. Creare cont Cloudflare (daca nu ai)
# https://dash.cloudflare.com/sign-up

# 2. Adauga domeniul
#    - Cumpara domeniu sau transfera existent
#    - urmareste pasii de setup DNS

# 3. Obtine Zone ID
#    Dashboard → Domain → Overview → Zone ID (sidebar dreapta)
#    Exemplu: 1a2b3c4d5e6f7g8h9i0j

# 4. Obtine Account ID
#    Dashboard → right sidebar
#    Exemplu: 9i8h7g6f5e4d3c2b1a0

# 5. Creare API Token
#    Profile → API Tokens → Create Token
#    Template: Custom token
#    Permissions:
#      - Zone:Read, Zone:Edit
#      - Page Rules:Edit
#      - Cloudflare Pages:Edit
#    Zone Resources: Include - Specific zone - your-domain.com
```

### Pasul 5: Gemini API Key (2 minute)

```bash
# 1. Mergi la https://aistudio.google.com/
# 2. Login cu cont Google
# 3. Get API Key → Create API Key
# 4. Copiaza cheia: AIzaSy...
```

### Pasul 6: Generare Secrete (1 minute)

```bash
# Rulare script
./scripts/setup-github-secrets.sh

# Scriptul va:
# ✅ Genera JWT_SECRET
# ✅ Genera INTERNAL_TOKEN
# ✅ Genera cheie SSH pentru VPS
# ✅ Afișa toate secretele necesare
```

### Pasul 7: Adaugare Secrete in GitHub (10 minute)

```bash
# Mergi la: GitHub Repo → Settings → Secrets and variables → Actions

# Adauga SECRETE (click "New repository secret"):
# ──────────────────────────────────────────
# Name: VPS_HOST
# Value: 123.456.789.0 (IP-ul VPS-ului)
# ──────────────────────────────────────────
# Name: VPS_USER
# Value: root
# ──────────────────────────────────────────
# Name: VPS_SSH_KEY
# Value: (continutul fisierului vps-key, generat de script)
# ──────────────────────────────────────────
# Name: GCP_PROJECT_ID
# Value: sentry-data-prod-123
# ──────────────────────────────────────────
# Name: GCP_SA_KEY
# Value: (continutul fisierului terraform-sa-key.json)
# ──────────────────────────────────────────
# Name: CLOUDFLARE_API_TOKEN
# Value: (token-ul creat la Pasul 4)
# ──────────────────────────────────────────
# Name: CLOUDFLARE_ZONE_ID
# Value: (Zone ID de la Pasul 4)
# ──────────────────────────────────────────
# Name: CLOUDFLARE_ACCOUNT_ID
# Value: (Account ID de la Pasul 4)
# ──────────────────────────────────────────
# Name: JWT_SECRET
# Value: (generat de script)
# ──────────────────────────────────────────
# Name: INTERNAL_TOKEN
# Value: (generat de script)
# ──────────────────────────────────────────
# Name: LLM_API_KEY
# Value: AIzaSy... (de la Pasul 5)
# ──────────────────────────────────────────

# Adauga VARIABILE (click "Variables" tab):
# ──────────────────────────────────────────
# Name: DOMAIN
# Value: sentrydata.io
# ──────────────────────────────────────────
```

## 📊 Logging & Status

### Deploy Log Format

```
┌─────────────────────────────────────────────────────────────┐
│  📦 GCP INFRASTRUCTURE                                      │
├─────────────────────────────────────────────────────────────┤
│  Terraform Init:  ✅                                        │
│  Terraform Plan:   ✅                                        │
│  Terraform Apply: ✅                                        │
│                                                             │
│  Resources:                                                 │
│    ✅ Firestore Database                                    │
│    ✅ BigQuery Dataset                                      │
│    ✅ Cloud Storage Bucket                                  │
│    ✅ Secret Manager (3 secrets)                            │
│    ✅ Service Accounts (5)                                  │
│    ✅ Cloud Run Services (chat, harness, observer)          │
│    ✅ Cloud Scheduler API + invoker IAM                     │
│                                                             │
│  ✅ SUCCESS                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Destroy Log Format

```
┌─────────────────────────────────────────────────────────────┐
│  📦 GCP INFRASTRUCTURE DESTROYED                           │
├─────────────────────────────────────────────────────────────┤
│  Terraform Init:    ✅                                      │
│  Terraform Destroy: ✅                                      │
│                                                             │
│  Destroyed:                                                 │
│    ✅ Firestore Database                                    │
│    ✅ BigQuery Dataset                                      │
│    ✅ Cloud Storage Bucket                                  │
│    ✅ Secret Manager Secrets                                │
│    ✅ Service Accounts                                      │
│    ✅ Cloud Run service definitions                         │
│    ✅ Cloud Scheduler API + invoker IAM                     │
│    ✅ Cloudflare DNS Records                                │
│                                                             │
│  ✅ DESTROYED                                                │
└─────────────────────────────────────────────────────────────┘
```

## 💰 Costuri

### 5 Utilizatori

| Component | Cost |
|-----------|------|
| VPS Contabo (VPS 2) | €10.99 (~$12) |
| Cloud Run Chat | ~$0.08 |
| Cloud Run Harness | ~$0.24 |
| GCP Services (Firestore, BigQuery, etc.) | $0-5 (free tier) |
| Cloudflare | $0 (free plan) |
| **TOTAL** | **~$12-20/luna** |

### 100 Utilizatori

| Component | Cost |
|-----------|------|
| VPS Contabo (VPS 4) | €24.99 (~$27) |
| Cloud Run Chat | ~$0.50 |
| Cloud Run Harness | ~$1.00 |
| GCP Services | $30-50 |
| Cloudflare | $0 (free plan) |
| **TOTAL** | **~$58-78/luna** |

## 🆘 Troubleshooting

### Deploy Fails

```bash
# Check GitHub Actions logs
gh run list
gh run view <run-id>

# Check VPS logs
ssh root@your-vps-ip
cd /opt/sentry-data
docker-compose logs

# Check GCP logs
gcloud logging read "resource.type=cloud_run_revision"
```

### Destroy Fails

```bash
# Manual cleanup GCP
gcloud projects delete YOUR_PROJECT_ID

# Manual cleanup VPS
ssh root@your-vps-ip
rm -rf /opt/sentry-data
docker system prune -af

# Manual cleanup Cloudflare
# Go to Cloudflare Dashboard → DNS → Delete records
```

## 📞 Support

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Terraform Docs**: https://developer.hashicorp.com/terraform/docs
- **GCP Docs**: https://cloud.google.com/docs
- **Cloudflare Docs**: https://developers.cloudflare.com
- **Contabo Docs**: https://contabo.com/en/customer-support/

## 🔄 Update Flow

```bash
# Make code changes
git add .
git commit -m "Update: ..."
git push origin main

# GitHub Actions automatically deploys:
# 1. Tests run
# 2. Docker images built
# 3. VPS updated
# 4. Cloud Run services updated
# 5. Frontend rebuilt
# 6. Health checks run
```

## 🎉 Success!

After deploy, your infrastructure will be:

- **Frontend**: https://app.sentrydata.io (Cloudflare Pages)
- **API**: https://api.sentrydata.io (VPS + Nginx)
- **Chat**: Internal (Cloud Run)
- **Harness**: Internal (Cloud Run)
- **Observer**: Internal (Cloud Run)
- **Sync Worker**: VPS (cron every 15 min)
- **Database**: Firestore (GCP)
- **Analytics**: BigQuery (GCP)
- **Files**: Cloud Storage (GCP)

**Total cost for 5 users: ~$12-20/month**

## 🔐 Backend → Cloud Run Auth

Backend-ul ruleaza pe Contabo, iar `chat`, `harness` si `observer` ruleaza in Cloud Run privat.

- Backend foloseste `CHAT_SERVICE_URL`, `HARNESS_SERVICE_URL`, `OBSERVER_SERVICE_URL`
- Pentru URL-uri Cloud Run, backend-ul genereaza un Google ID token la runtime folosind credentialele service account-ului local
- Cloud Run valideaza token-ul OIDC la nivel de platforma
- `X-Internal-Token` ramane activ ca verificare suplimentara in aplicatie
- Observer-ul programat din Cloud Scheduler foloseste `CLOUD_SCHEDULER_INVOKER_SERVICE_ACCOUNT_EMAIL` pentru OIDC
