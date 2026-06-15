terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# GCS Bucket for data storage
resource "google_storage_bucket" "sentry_data" {
  name          = var.gcs_bucket_name
  location      = var.gcs_location
  force_destroy = false

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 7
      matches_prefix = ["*/landing_zone/"]
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age = 30
      matches_prefix = ["*/agent_snapshots/"]
    }
    action {
      type = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
      matches_prefix = ["*/agent_snapshots/"]
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    managed_by = "terraform"
    project    = "sentry-platform"
  }
}

# Firestore database (native mode)
resource "google_firestore_database" "sentry_db" {
  project     = var.gcp_project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  app_engine_integration_mode = "DISABLED"
  concurrency_mode            = "OPTIMISTIC"
}

# Service Account for backend
resource "google_service_account" "sentry_backend" {
  account_id   = "sentry-backend"
  display_name = "Sentry Backend Service Account"
  description  = "Service account for Sentry Platform backend"
}

# IAM bindings for backend SA
resource "google_project_iam_member" "backend_firestore" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.sentry_backend.email}"
}

resource "google_project_iam_member" "backend_storage" {
  project = var.gcp_project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.sentry_backend.email}"
}

resource "google_project_iam_member" "backend_bigquery" {
  project = var.gcp_project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.sentry_backend.email}"
}

resource "google_project_iam_member" "backend_bigquery_job" {
  project = var.gcp_project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.sentry_backend.email}"
}


# Service Account for Modal agents
resource "google_service_account" "sentry_agents" {
  account_id   = "sentry-agents"
  display_name = "Sentry Agent Service Account"
  description  = "Service account for Modal sandbox agents"
}

resource "google_project_iam_member" "agent_storage" {
  project = var.gcp_project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.sentry_agents.email}"
}

resource "google_project_iam_member" "agent_bigquery" {
  project = var.gcp_project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.sentry_agents.email}"
}

resource "google_project_iam_member" "agent_bigquery_job" {
  project = var.gcp_project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.sentry_agents.email}"
}


# Secret Manager for JWT secret
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "sentry-jwt-secret"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

# Secret Manager for Modal webhook
resource "google_secret_manager_secret" "modal_secret" {
  secret_id = "sentry-modal-secret"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "modal_secret" {
  secret      = google_secret_manager_secret.modal_secret.id
  secret_data = var.modal_webhook_secret
}

# Secret Manager for Stripe
resource "google_secret_manager_secret" "stripe_secret" {
  secret_id = "sentry-stripe-secret"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "stripe_secret" {
  secret      = google_secret_manager_secret.stripe_secret.id
  secret_data = var.stripe_secret_key
}
