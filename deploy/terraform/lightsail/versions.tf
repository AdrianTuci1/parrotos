terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# The token only needs Zone -> DNS -> Edit on the zone that holds the record. Leave
# cloudflare_api_token unset and the provider reads CLOUDFLARE_API_TOKEN from the environment,
# which keeps the token out of every file.
provider "cloudflare" {
  api_token = var.cloudflare_api_token != "" ? var.cloudflare_api_token : null
}
