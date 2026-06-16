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

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
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
  description = "LLM API Key"
  type        = string
  sensitive   = true
}

variable "llm_provider" {
  description = "LLM Provider (deepseek, openai, etc.)"
  type        = string
  default     = "deepseek"
}

variable "llm_model_id" {
  description = "LLM Model ID"
  type        = string
  default     = "deepseek-v4-flash"
}

variable "llm_base_url" {
  description = "LLM API Base URL"
  type        = string
  default     = "https://api.deepseek.com/v1"
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
