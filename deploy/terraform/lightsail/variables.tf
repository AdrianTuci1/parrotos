# ─── Naming and placement ────────────────────────────────────────────────────

variable "project_name" {
  description = "Name for every AWS resource this module creates. Lightsail names are global per account and region, so it has to be unique there."
  type        = string
  default     = "statsparrot"

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{1,40}$", var.project_name))
    error_message = "Use 2-41 letters, digits or dashes, starting with a letter or digit."
  }
}

variable "aws_region" {
  description = "AWS region for the instance and its static IP."
  type        = string
  default     = "eu-central-1"
}

variable "availability_zone" {
  description = "Availability zone for the instance. Empty means the first zone of aws_region."
  type        = string
  default     = ""

  validation {
    condition     = var.availability_zone == "" || can(regex("^[a-z]{2}-[a-z]+-[0-9][a-z]$", var.availability_zone))
    error_message = "Use a zone id such as eu-central-1a, or leave it empty."
  }
}

# ─── The instance ────────────────────────────────────────────────────────────

variable "blueprint_id" {
  description = "Lightsail blueprint (operating system image). ubuntu_24_04 is the one the runbook assumes."
  type        = string
  default     = "ubuntu_24_04"
}

variable "bundle_id" {
  description = <<-EOT
    Lightsail bundle (size and CPU architecture). The default is the 512 MB plan, which is enough
    because the database and the object storage both live elsewhere and the image is built on your
    machine rather than on the instance. Give it more RAM if the runtime serves projects backed by
    Parquet files or a local DuckDB.

    Run `aws lightsail get-bundles --region <region>` to list what the region offers, and check
    whether the bundle you pick is x86_64 or arm64: the deploy script builds the image for the
    instance's architecture, so they have to agree.
  EOT
  type        = string
  default     = "nano_3_0"
}

variable "swap_size_mb" {
  description = "Swap file size in MB. Swap is what keeps the container comfortable on the 512 MB plan. Set 0 to skip it."
  type        = number
  default     = 1024
}

variable "ssh_key_pair_name" {
  description = "Name of an existing Lightsail key pair to log in with. Empty creates one, whose private key this module outputs."
  type        = string
  default     = ""
}

variable "ssh_user" {
  description = "Login user for the instance. Ubuntu blueprints use ubuntu."
  type        = string
  default     = "ubuntu"
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to reach port 22. Narrow this to your own address once the host is set up."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ─── Where the app is reachable ──────────────────────────────────────────────

variable "domain" {
  description = "The registrable domain, which is also the Cloudflare zone, for example example.com."
  type        = string
}

variable "subdomain" {
  description = "Host label the app answers on. Empty puts the app on the apex of var.domain."
  type        = string
  default     = "bi"
}

variable "host_dir" {
  description = "Directory on the instance that holds docker-compose.yml, Caddyfile and .env."
  type        = string
  default     = "/opt/statsparrot"
}

# ─── DNS ─────────────────────────────────────────────────────────────────────

variable "enable_dns" {
  description = "Create the A record in Cloudflare. Turn it off if the record is managed elsewhere."
  type        = bool
  default     = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for var.domain. Found on the zone's overview page."
  type        = string
  default     = ""

  validation {
    condition     = !var.enable_dns || var.cloudflare_zone_id != ""
    error_message = "Set cloudflare_zone_id when enable_dns is true."
  }
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone -> DNS -> Edit on the zone. Prefer setting CLOUDFLARE_API_TOKEN in the environment over putting it in a tfvars file."
  type        = string
  default     = ""
  sensitive   = true
}

variable "cloudflare_proxied" {
  description = <<-EOT
    Route the hostname through Cloudflare's proxy instead of resolving straight to the instance.
    Off by default: with the proxy off, Caddy obtains its Let's Encrypt certificate over the plain
    DNS record and nothing else has to be configured. Turning it on makes the traffic pass through
    Cloudflare, and requires the zone's SSL/TLS mode to be "Full (strict)" — on "Flexible" the
    origin redirect loop never resolves.
  EOT
  type        = bool
  default     = false
}

# ─── Tags ────────────────────────────────────────────────────────────────────

variable "tags" {
  description = "Tags for the instance. Lightsail rejects tag values that contain uppercase letters."
  type        = map(string)
  default = {
    application = "statsparrot"
    managed-by  = "terraform"
  }

  validation {
    condition     = alltrue([for v in values(var.tags) : v == lower(v)])
    error_message = "Lightsail tag values must be lowercase."
  }
}
