
output "gcs_bucket_name" {
  description = "Name of the GCS bucket"
  value       = google_storage_bucket.sentry_data.name
}

output "backend_service_account" {
  description = "Email of the backend service account"
  value       = google_service_account.sentry_backend.email
}

output "agent_service_account" {
  description = "Email of the agent service account"
  value       = google_service_account.sentry_agents.email
}
