variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

variable "gcs_bucket_name" {
  description = "GCS Bucket name for data storage"
  type        = string
  default     = "sentry-platform-data"
}

variable "gcs_location" {
  description = "GCS Bucket location"
  type        = string
  default     = "EU"
}

variable "firestore_location" {
  description = "Firestore database location"
  type        = string
  default     = "eur3"
}

variable "bigquery_location" {
  description = "BigQuery dataset location"
  type        = string
  default     = "EU"
}


variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "modal_webhook_secret" {
  description = "Modal webhook secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}
