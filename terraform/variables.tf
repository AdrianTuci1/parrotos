variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain" {
  description = "Main domain"
  type        = string
  default     = "sentrydata.io"
}

variable "vps_host" {
  description = "Public IPv4 address or hostname of the Contabo VPS serving api.<domain>"
  type        = string
}

variable "jwt_secret" {
  description = "JWT Secret"
  type        = string
  sensitive   = true
}

variable "internal_token" {
  description = "Internal API Token"
  type        = string
  sensitive   = true
}

variable "llm_api_key" {
  description = "LLM API Key (Gemini)"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe Secret Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe Webhook Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_bigquery_analytics" {
  description = "Enable BigQuery analytics"
  type        = bool
  default     = true
}
