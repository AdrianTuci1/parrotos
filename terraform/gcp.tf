# APIs
data "google_client_config" "default" {}

resource "google_project_service" "apis" {
  for_each = toset([
    "firestore.googleapis.com",
    "bigquery.googleapis.com",
    "storage.googleapis.com",
    "storage-component.googleapis.com",
    "secretmanager.googleapis.com",
    "run.googleapis.com",
    "cloudscheduler.googleapis.com",
    "cloudbuild.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "bigquerydatatransfer.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "serviceusage.googleapis.com",
  ])
  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# Service Accounts
resource "google_service_account" "backend" {
  account_id   = "sentry-backend"
  display_name = "Sentry Backend API"
  description  = "Main backend API service"
}

resource "google_service_account" "chat" {
  account_id   = "sentry-chat"
  display_name = "Sentry Chat AI"
  description  = "AI chat service"
}

resource "google_service_account" "harness" {
  account_id   = "sentry-harness"
  display_name = "Sentry Harness"
  description  = "BigQuery discovery and spec generation"
}

resource "google_service_account" "observer" {
  account_id   = "sentry-observer"
  display_name = "Sentry Observer"
  description  = "Technical data health observer"
}

resource "google_service_account" "compute" {
  account_id   = "sentry-compute"
  display_name = "Sentry Compute"
  description  = "Default compute service account"
}

# IAM Roles
locals {
  backend_roles = [
    "roles/datastore.user",
    "roles/bigquery.dataEditor",
    "roles/bigquery.jobUser",
    "roles/storage.objectAdmin",
    "roles/secretmanager.admin",
    "roles/run.admin",
    "roles/cloudscheduler.admin",
    "roles/iam.serviceAccountAdmin",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]
  chat_roles = [
    "roles/datastore.user",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
  ]
  harness_roles = [
    "roles/bigquery.dataViewer",
    "roles/bigquery.jobUser",
    "roles/storage.objectAdmin",
    "roles/datastore.user",
    "roles/logging.logWriter",
  ]
  observer_roles = [
    "roles/bigquery.dataViewer",
    "roles/bigquery.jobUser",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
  ]
  compute_roles = [
    "roles/run.invoker",
  ]
}

resource "google_project_iam_member" "backend" {
  for_each = toset(local.backend_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "chat" {
  for_each = toset(local.chat_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.chat.email}"
}

resource "google_project_iam_member" "harness" {
  for_each = toset(local.harness_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.harness.email}"
}

resource "google_project_iam_member" "observer" {
  for_each = toset(local.observer_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.observer.email}"
}

resource "google_project_iam_member" "compute" {
  for_each = toset(local.compute_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.compute.email}"
}

# Firestore Database
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  app_engine_integration_mode = "DISABLED"

  depends_on = [google_project_service.apis["firestore.googleapis.com"]]
}

# GCS Bucket
resource "google_storage_bucket" "main" {
  name          = "sentry-platform-data-${var.project_id}"
  location      = "EU"
  force_destroy = true
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

# BigQuery Dataset
resource "google_bigquery_dataset" "main" {
  dataset_id  = "sentry_dataset_${var.environment}"
  description   = "Sentry Data Platform main dataset"
  location      = "EU"
  project       = var.project_id

  depends_on = [google_project_service.apis["bigquery.googleapis.com"]]
}

# Secrets
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret != "" ? var.jwt_secret : "placeholder-change-me"
}

resource "google_secret_manager_secret" "internal_token" {
  secret_id = "internal-token"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "internal_token" {
  secret      = google_secret_manager_secret.internal_token.id
  secret_data = var.internal_token != "" ? var.internal_token : "placeholder-change-me"
}

resource "google_secret_manager_secret" "llm_api_key" {
  secret_id = "llm-api-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "llm_api_key" {
  secret      = google_secret_manager_secret.llm_api_key.id
  secret_data = var.llm_api_key != "" ? var.llm_api_key : "placeholder-change-me"
}

# Cloudflare DNS Records
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  type    = can(regex("^[0-9.]+$", var.vps_host)) ? "A" : "CNAME"
  content = var.vps_host
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  type    = "CNAME"
  content = "statsparrot-app.pages.dev"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"
  content = "statsparrot-app.pages.dev"
  proxied = true
  ttl     = 1
}

# Cloudflare Pages domain binding
resource "cloudflare_pages_domain" "app" {
  account_id   = var.cloudflare_account_id
  project_name = "statsparrot-app"
  domain       = "app.${var.domain}"
}

# Cloudflare HTTPS redirect — configure manually in dashboard:
#   SSL/TLS → Edge Certificates → Always Use HTTPS = ON
