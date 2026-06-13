# Connectors — GCP-native data ingestion

## Arhitectură

```
┌─────────────────────────────────────────────────────────┐
│                     SOURCES                              │
│                                                          │
│  Google sources (GA4, Ads, Search Console)               │
│  ─────────────────────────────────────                   │
│  BigQuery Data Transfer Service                          │
│  Config: GCP Console → Data Transfers → Create           │
│  Zero code. Scheduled automatically by GCP.              │
│  ─────────────────────────────────────                   │
│                                                          │
│  Ecommerce / SaaS / Ads (Stripe, Shopify, WooCommerce,    │
│  HubSpot, Meta Ads, TikTok Ads)                           │
│  ─────────────────────────────────────                   │
│  Cloud Function + Cloud Scheduler                        │
│  sources/stripe/index.js  →  Stripe API  → BigQuery      │
│  sources/shopify/index.js →  Shopify API → BigQuery      │
│  sources/woocommerce/index.js → WooCommerce API → BQ     │
│  sources/meta_ads/index.js → Meta Ads API → BigQuery     │
│  sources/tiktok_ads/index.js → TikTok Ads API → BQ       │
│  ─────────────────────────────────────                   │
│                                                          │
│  Databases & Infra (MongoDB, PostgreSQL, MySQL, Prometheus, Sentry)│
│  ─────────────────────────────────────                   │
│  Cloud Function / CDC / REST → BigQuery                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Deploy un connector

```bash
cd sources/stripe

gcloud functions deploy sentry-connector-stripe \
  --runtime nodejs22 \
  --trigger-http \
  --entry-point ingest \
  --set-env-vars STRIPE_API_KEY=...CS_BUCKET=... \
  --region europe-west1
```

Apoi creezi un Cloud Scheduler job care cheamă funcția la fiecare oră.

## Structură

```
connector/
├── README.md
├── sources/
│   ├── google/           # Config docs for BigQuery Data Transfer
│   │   └── README.md     # Setup instructions per Google source
│   ├── stripe/
│   │   └── index.js      # Stripe → BigQuery
│   ├── shopify/
│   │   └── index.js      # Shopify → BigQuery
│   ├── woocommerce/
│   │   └── index.js      # WooCommerce → BigQuery
│   ├── postgresql/
│   │   └── index.js      # PostgreSQL → BigQuery
│   ├── mysql/
│   │   └── index.js      # MySQL → BigQuery
│   ├── mongodb/
│   │   └── index.js      # MongoDB → BigQuery
│   └── _template/
│       └── index.js      # Template for new connectors
└── deploy.sh             # Deploy all connectors
