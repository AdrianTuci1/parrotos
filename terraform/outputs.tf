# Sentry Data Platform - GCP Infrastructure

output "project_id" {
  value = var.project_id
}

output "region" {
  value = var.region
}

output "backend_url" {
  value = "https://api.${var.domain}"
}

output "frontend_url" {
  value = "https://app.${var.domain}"
}

output "gcs_bucket" {
  value = google_storage_bucket.main.name
}

output "bigquery_dataset" {
  value = google_bigquery_dataset.main.dataset_id
}

output "service_accounts" {
  value = {
    backend  = google_service_account.backend.email
    chat     = google_service_account.chat.email
    harness  = google_service_account.harness.email
    observer = google_service_account.observer.email
    compute  = google_service_account.compute.email
  }
}

output "scheduler_invoker_service_account_email" {
  value = google_service_account.compute.email
}

