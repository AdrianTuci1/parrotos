# Plan Deploy Productie — Sentry Data Platform

## Faza 1: Pregatire GCP (Ziua 1)

### 1.1 Creare Proiect GCP
```bash
# Creare proiect nou
gcloud projects create sentry-data-prod --name="Sentry Data Production"
gcloud config set project sentry-data-prod

# Setare billing
gcloud billing projects link sentry-data-prod --billing-account=XXXXXX-XXXXXX-XXXXXX
```

### 1.2 Enable APIs (automat din cod)
```bash
# Rulare din backend — POST /api/v1/admin/setup/gcp/apis
# Sau manual:
gcloud services enable firestore.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable bigquerydatatransfer.googleapis.com
```

### 1.3 Creare Service Accounts (automat din cod)
```bash
# Rulare din backend — POST /api/v1/admin/setup/gcp/accounts
# Sau manual:
gcloud iam service-accounts create sentry-backend
gcloud iam service-accounts create sentry-chat
gcloud iam service-accounts create sentry-harness
gcloud iam service-accounts create sentry-jobs
gcloud iam service-accounts create sentry-compute
```

### 1.4 Assign Roles (automat din cod)
```bash
# Rulare din backend — POST /api/v1/admin/setup/gcp/roles/sentry-backend
# ... etc pentru fiecare account
```

### 1.5 Creare Resurse de Baza
```bash
# Firestore in Native Mode
gcloud firestore databases create --type=firestore-native --region=europe-west

# GCS Bucket
gcloud storage buckets create gs://sentry-platform-data-prod \
  --location=EU \
  --uniform-bucket-level-access

# BigQuery Dataset
gcloud bq datasets create sentry_dataset_prod --location=EU
```

---

## Faza 2: Deploy Backend (Ziua 2)

### 2.1 Build si Push Docker Image
```bash
# Backend
cd backend
docker build -t gcr.io/sentry-data-prod/sentry-backend:v1.0.0 .
docker push gcr.io/sentry-data-prod/sentry-backend:v1.0.0

# Chat service
cd services/chat
docker build -t gcr.io/sentry-data-prod/sentry-chat:v1.0.0 .
docker push gcr.io/sentry-data-prod/sentry-chat:v1.0.0

# Harness service
cd services/harness
docker build -t gcr.io/sentry-data-prod/sentry-harness:v1.0.0 .
docker push gcr.io/sentry-data-prod/sentry-harness:v1.0.0
```

### 2.2 Deploy Cloud Run Services
```bash
# Backend
gcloud run deploy sentry-backend \
  --image=gcr.io/sentry-data-prod/sentry-backend:v1.0.0 \
  --region=europe-west1 \
  --service-account=sentry-backend@sentry-data-prod.iam.gserviceaccount.com \
  --set-env-vars=GCP_PROJECT_ID=sentry-data-prod \
  --set-env-vars=GCP_REGION=europe-west1 \
  --set-env-vars=GCS_BUCKET_NAME=sentry-platform-data-prod \
  --set-env-vars=JWT_SECRET=*** \
  --set-env-vars=INTERNAL_TOKEN=*** \
  --set-env-vars=CHAT_SERVICE_URL=https://sentry-chat-xxx.run.app \
  --set-env-vars=HARNESS_SERVICE_URL=https://sentry-harness-xxx.run.app \
  --set-env-vars=ENABLE_BIGQUERY_ANALYTICS=true \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=100 \
  --max-instances=10 \
  --min-instances=1 \
  --allow-unauthenticated=false

# Chat
gcloud run deploy sentry-chat \
  --image=gcr.io/sentry-data-prod/sentry-chat:v1.0.0 \
  --region=europe-west1 \
  --service-account=sentry-chat@sentry-data-prod.iam.gserviceaccount.com \
  --set-env-vars=LLM_PROVIDER=gemini \
  --set-env-vars=LLM_API_KEY=*** \
  --set-env-vars=LLM_MODEL=gemini-2.5-flash \
  --set-env-vars=INTERNAL_TOKEN=*** \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=5 \
  --min-instances=0 \
  --allow-unauthenticated=false

# Harness
gcloud run deploy sentry-harness \
  --image=gcr.io/sentry-data-prod/sentry-harness:v1.0.0 \
  --region=europe-west1 \
  --service-account=sentry-harness@sentry-data-prod.iam.gserviceaccount.com \
  --set-env-vars=LLM_PROVIDER=gemini \
  --set-env-vars=LLM_API_KEY=*** \
  --set-env-vars=LLM_MODEL=gemini-2.5-flash \
  --set-env-vars=GCS_BUCKET=sentry-platform-data-prod \
  --set-env-vars=INTERNAL_TOKEN=*** \
  --memory=1Gi \
  --cpu=2 \
  --max-instances=3 \
  --min-instances=0 \
  --allow-unauthenticated=false
```

### 2.3 Update Backend cu URL-urile serviciilor
```bash
# Obtine URL-urile
gcloud run services describe sentry-chat --region=europe-west1 --format='value(status.url)'
gcloud run services describe sentry-harness --region=europe-west1 --format='value(status.url)'

# Update backend cu URL-urile corecte
gcloud run services update sentry-backend \
  --set-env-vars=CHAT_SERVICE_URL=https://sentry-chat-xxx.run.app \
  --set-env-vars=HARNESS_SERVICE_URL=https://sentry-harness-xxx.run.app
```

---

## Faza 3: Deploy Frontend (Ziua 2-3)

### 3.1 Build Frontend
```bash
cd frontend
# Update API URL in .env
VITE_API_URL=https://sentry-backend-xxx.run.app/api/v1

npm run build
```

### 3.2 Deploy pe Cloud Storage / CDN
```bash
# Optiunea 1: Cloud Storage + Cloud CDN
gcloud storage buckets create gs://sentry-frontend-prod \
  --location=EU \
  --uniform-bucket-level-access

gcloud storage cp -r dist/* gs://sentry-frontend-prod/

# Configurare Cloud CDN
gcloud compute backend-buckets create sentry-frontend \
  --gcs-bucket-name=sentry-frontend-prod \
  --enable-cdn

# Optiunea 2: Vercel/Netlify (mai simplu)
# Push pe GitHub si conectare Vercel
```

### 3.3 Configurare CORS
```bash
gcloud storage buckets update gs://sentry-frontend-prod --cors-file=cors.json
```

---

## Faza 4: Configurare Domeniu si SSL (Ziua 3)

### 4.1 Domeniu Custom
```bash
# Inregistrare domeniu: sentrydata.io
# Verificare disponibilitate si cumparare
```

### 4.2 Cloud DNS
```bash
# Creare zona DNS
gcloud dns managed-zones create sentrydata \
  --dns-name=sentrydata.io. \
  --description="Sentry Data Platform"

# Adaugare records
gcloud dns record-sets create api.sentrydata.io \
  --zone=sentrydata \
  --type=CNAME \
  --ttl=300 \
  --rrdatas=sentry-backend-xxx.run.app.

gcloud dns record-sets create app.sentrydata.io \
  --zone=sentrydata \
  --type=CNAME \
  --ttl=300 \
  --rrdatas=sentry-frontend-xxx.run.app.
```

### 4.3 SSL Certificate
```bash
# Cloud Run gestioneaza SSL automat pentru domenii custom
gcloud run domain-mappings create \
  --service=sentry-backend \
  --domain=api.sentrydata.io \
  --region=europe-west1

gcloud run domain-mappings create \
  --service=sentry-frontend \
  --domain=app.sentrydata.io \
  --region=europe-west1
```

---

## Faza 5: Configurare Stripe (Ziua 3)

### 5.1 Stripe Account
```bash
# Creare cont Stripe Business
# Activare modul test -> productie
```

### 5.2 Stripe Webhook
```bash
# In Stripe Dashboard:
# Endpoint: https://api.sentrydata.io/stripe/webhook
# Events: invoice.payment_succeeded, customer.subscription.created, etc.

# Salvare webhook secret in Secret Manager
gcloud secrets create stripe-webhook-secret \
  --data-file=- <<< "whsec_***"
```

### 5.3 Stripe API Keys
```bash
# Salvare in Secret Manager
gcloud secrets create stripe-secret-key \
  --data-file=- <<< "sk_live_***"
```

---

## Faza 6: Configurare LLM (Ziua 3)

### 6.1 Gemini API
```bash
# Creare cont Google AI Studio
# Generare API Key

# Salvare in Secret Manager
gcloud secrets create llm-api-key \
  --data-file=- <<< "AIzaSy***"
```

### 6.2 Update Services
```bash
gcloud run services update sentry-chat \
  --set-env-vars=LLM_API_KEY=***

gcloud run services update sentry-harness \
  --set-env-vars=LLM_API_KEY=***
```

---

## Faza 7: Testare si Validare (Ziua 4)

### 7.1 Health Checks
```bash
# Testare API
curl https://api.sentrydata.io/api/v1/health

# Testare autentificare
curl -X POST https://api.sentrydata.io/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sentrydata.io","password":"***"}'

# Testare login
curl -X POST https://api.sentrydata.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sentrydata.io","password":"***"}'
```

### 7.2 Testare Flow Complet
```bash
# 1. Creare organizatie
# 2. Creare proiect
# 3. Conectare Stripe
# 4. Verificare sync in BigQuery
# 5. Verificare harness genereaza specs
# 6. Verificare analytics afiseaza date
```

### 7.3 Testare Load
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 https://api.sentrydata.io/api/v1/health
```

---

## Faza 8: Monitorizare si Alerte (Ziua 5)

### 8.1 Cloud Monitoring
```bash
# Creare dashboard
gcloud monitoring dashboards create \
  --config-from-file=dashboard.json
```

### 8.2 Alerting Policies
```bash
# CPU > 80%
gcloud alpha monitoring policies create \
  --policy-from-file=alert-cpu.json

# Memory > 90%
gcloud alpha monitoring policies create \
  --policy-from-file=alert-memory.json

# Error rate > 5%
gcloud alpha monitoring policies create \
  --policy-from-file=alert-errors.json
```

### 8.3 Uptime Checks
```bash
# API
gcloud monitoring uptime create \
  --display-name="API Health" \
  --resource-type=cloud-run \
  --resource-labels=service_name=sentry-backend \
  --resource-labels=location=europe-west1 \
  --request-path=/api/v1/health \
  --period=60

# Frontend
gcloud monitoring uptime create \
  --display-name="Frontend Health" \
  --resource-type=cloud-run \
  --resource-labels=service_name=sentry-frontend \
  --resource-labels=location=europe-west1 \
  --request-path=/ \
  --period=60
```

---

## Faza 9: Backup si Disaster Recovery (Ziua 5)

### 9.1 Firestore Backup
```bash
# Schedule daily backup
gcloud firestore backups schedules create \
  --database='(default)' \
  --retention=7d \
  --recurrence=daily
```

### 9.2 BigQuery Backup
```bash
# Table snapshots
bq mk --transfer_config \
  --data_source=cross_region_copy \
  --target_dataset=sentry_dataset_prod_backup \
  --display_name='Daily Backup' \
  --params='{"source_dataset_id":"sentry_dataset_prod","source_project_id":"sentry-data-prod"}' \
  --schedule='every 24 hours'
```

### 9.3 GCS Backup
```bash
# Lifecycle policy
gcloud storage buckets update gs://sentry-platform-data-prod \
  --lifecycle-file=lifecycle.json
```

---

## Faza 10: Go Live (Ziua 6)

### 10.1 Checklist Final
- [ ] Toate serviciile deployate si functionale
- [ ] Domeniu custom configurat cu SSL
- [ ] Stripe in modul productie
- [ ] LLM API key valida
- [ ] Monitorizare si alerte active
- [ ] Backup configurat
- [ ] Documentatie actualizata
- [ ] Echipa de suport instruita

### 10.2 Anuntare Utilizatori
```bash
# Email catre lista de asteptare
# Postare pe social media
# Update website landing page
```

### 10.3 Monitorizare Post-Launch
- Urmarire metrici in timp real
- Raspuns rapid la incidente
- Colectare feedback utilizatori
- Iteratie rapida

---

## Costuri Estimate Lunare (100 utilizatori)

| Serviciu | Cost |
|----------|------|
| Cloud Run (backend) | ~$50-100 |
| Cloud Run (chat) | ~$20-40 |
| Cloud Run (harness) | ~$30-60 |
| Cloud Run Job (sync) | ~$30-60 |
| Cloud Scheduler | ~$0.10 |
| Firestore | ~$10-20 |
| BigQuery | ~$20-50 |
| Cloud Storage | ~$5-15 |
| Pub/Sub | ~$2-5 |
| Secret Manager | ~$1-3 |
| Cloud Monitoring | ~$5-10 |
| **Total** | **~$175-360/luna** |

---

## Contact si Suport

- **Email**: support@sentrydata.io
- **Slack**: sentrydata.slack.com
- **Status Page**: status.sentrydata.io
- **Docs**: docs.sentrydata.io

---

*Plan creat pentru Sentry Data Platform v1.0*
*Ultima actualizare: 2024*
