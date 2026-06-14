# 🚀 Pre-Deploy Setup Guide

## Ce face Terraform automat vs ce trebuie facut manual

### ✅ Terraform CREEAZA AUTOMAT:

| Resursa | Descriere |
|-----------|-----------|
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

1. **Cont GCP** cu billing activat
2. **Proiect GCP** creat
3. **APIs enabled** (15 API-uri)
4. **Service Account pentru Terraform** cu rol `roles/owner`
5. **Cheie JSON** pentru service account-ul Terraform
6. **Bucket GCS** pentru Terraform state
7. **VPS Contabo** cumparat si configurat
8. **Cheie SSH** pentru VPS
9. **Cont Cloudflare** cu domeniul adaugat
10. **API Token Cloudflare**
11. **Gemini API Key**
12. **Toate secretele adaugate in GitHub**

---

## 📋 Pas cu pas - Setup Initial

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

---

## 🚀 Deploy

### O singura comanda:

```bash
# GitHub CLI:
gh workflow run "🚀 Deploy Complete Infrastructure" -f environment=prod

# Sau din GitHub UI:
# Actions → "🚀 Deploy Complete Infrastructure" → Run workflow
```

### Ce se intampla:

```
T+0:00  🚀 Trigger workflow
T+0:30  📦 Terraform Init
T+1:00  📦 Terraform Plan
T+2:00  📦 Terraform Apply (GCP resources)
T+5:00  🐳 Build Docker images
T+8:00  📤 Copy to VPS
T+10:00 🚀 Deploy on VPS
T+12:00 ☁️ Deploy Cloud Run services
T+15:00 🌐 Deploy Frontend
T+17:00 🏥 Health checks
T+18:00 ✅ DONE!
```

---

## 💥 Destroy

### O singura comanda:

```bash
# GitHub CLI:
gh workflow run "💥 Destroy Complete Infrastructure" \
  -f confirmation=DESTROY -f environment=prod

# Sau din GitHub UI:
# Actions → "💥 Destroy Complete Infrastructure" → Run workflow
# Type: DESTROY
```

### Ce se sterge:

```
✅ Cloud Run services (Chat, Harness)
✅ VPS Docker containers
✅ Firestore, BigQuery, Storage
✅ Secrets, Service Accounts
✅ Cloudflare DNS records
✅ Terraform state

❌ GCP Project (ramane, sterge manual)
❌ VPS Server (ramane, anuleaza la Contabo)
❌ Cloudflare Account (ramane)
```

---

## 📊 Costuri Totale

### Setup Initial (one-time):

| Item | Cost |
|------|------|
| GCP Project | $0 |
| Terraform SA Key | $0 |
| GCS State Bucket | ~$0.10/luna |

### Monthly (5 useri):

| Item | Cost |
|------|------|
| VPS Contabo (VPS 2) | €10.99 (~$12) |
| Cloud Run Chat | ~$0.08 |
| Cloud Run Harness | ~$0.24 |
| GCP Services | $0-5 (free tier) |
| Cloudflare | $0 |
| **TOTAL** | **~$12-20/luna** |

---

## 🆘 Troubleshooting

### "Error: Failed to authenticate to GCP"

```bash
# Verifica cheia JSON
cat terraform-sa-key.json | jq .

# Verifica daca service account are permisiuni
gcloud projects get-iam-policy YOUR_PROJECT_ID
```

### "Error: VPS connection refused"

```bash
# Verifica SSH
cat ~/.ssh/sentry-vps.pub
# Copiaza continutul in VPS: /root/.ssh/authorized_keys

# Verifica firewall pe VPS
ufw status
# Ar trebui sa arate: 22/tcp ALLOW
```

### "Error: Cloudflare API token invalid"

```bash
# Verifica token-ul
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📞 Support

- **GitHub Actions**: https://docs.github.com/en/actions
- **Terraform**: https://developer.hashicorp.com/terraform/docs
- **GCP**: https://cloud.google.com/docs
- **Cloudflare**: https://developers.cloudflare.com
- **Contabo**: https://contabo.com/en/customer-support/

---

## ✅ Checklist Final

Inainte de primul deploy, verifica:

- [ ] Cont GCP creat cu billing activat
- [ ] Script `setup-gcp-project.sh` rulat cu succes
- [ ] Fisier `terraform-sa-key.json` generat
- [ ] VPS Contabo cumparat si accesibil via SSH
- [ ] Cheie SSH generata si testata
- [ ] Cont Cloudflare creat cu domeniu adaugat
- [ ] API Token Cloudflare generat
- [ ] Zone ID si Account ID notate
- [ ] Gemini API Key obtinuta
- [ ] Script `setup-github-secrets.sh` rulat
- [ ] Toate 12 secrete adaugate in GitHub
- [ ] Variabila DOMAIN adaugata in GitHub
- [ ] Repo-ul e public sau ai GitHub Pro (pentru Actions)

**Gata? Rulare:**
```bash
gh workflow run "🚀 Deploy Complete Infrastructure" -f environment=prod
```
