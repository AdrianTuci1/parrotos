# Lightsail + Cloudflare

Creates the host and the DNS record:

- a Lightsail instance (Ubuntu 24.04, `nano_3_0` by default) with a static IP,
- a firewall open on 22, 80 and 443,
- a cloud-init that installs Docker, the compose plugin and a swap file, and creates `/opt/statsparrot`,
- a Cloudflare `A` record for `bi.example.com` pointing at the static IP.

Shipping the application is `deploy/hosted/deploy.sh`'s job. The deployment's configuration is a
file of secrets and it stays out of Terraform state.

## What you need

| Requirement | Where it comes from |
|---|---|
| AWS credentials with Lightsail permissions | `AWS_PROFILE`, or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` |
| A Cloudflare API token with **Zone → DNS → Edit** | `CLOUDFLARE_API_TOKEN`, or `cloudflare_api_token` in the tfvars |
| The Cloudflare zone ID | The zone's overview page |
| Terraform 1.5 or newer | Providers are pinned in `.terraform.lock.hcl` for `darwin_arm64`, `darwin_amd64`, `linux_amd64` and `linux_arm64` |

## Use it

```bash
cd deploy/terraform/lightsail
cp terraform.tfvars.example terraform.tfvars   # set domain and cloudflare_zone_id
export CLOUDFLARE_API_TOKEN=...                # keep the token out of the tfvars file

terraform init -backend=false                  # keeps the state in this directory
terraform plan
terraform apply
```

The backend is declared but not configured, so `-backend=false` is what a run on your machine
wants. A run without a disk, such as a GitHub runner, sets `TF_STATE_BUCKET` (and `TF_STATE_KEY`,
`TF_STATE_REGION`, `TF_STATE_ENDPOINT` for R2 or another S3-compatible store) and lets the state
live there instead: `deploy/launch.sh` passes those settings to `terraform init`.

Then:

```bash
# Only when Terraform created the key pair.
terraform output -raw private_key_pem > lightsail.pem && chmod 600 lightsail.pem

# Wait for cloud-init. Takes a couple of minutes.
ssh -i lightsail.pem ubuntu@$(terraform output -raw static_ip) 'cloud-init status --wait'

# The two values for deploy/hosted/.env.
terraform output -raw next_steps
```

## Choosing the instance

`bundle_id` defaults to `nano_3_0`: 512 MB RAM, 2 vCPU, 20 GB SSD, $5 per month. That is enough
because Postgres and the object storage live elsewhere and the image is built on your machine. The
cloud-init creates a 1 GB swap file, which is what keeps the container off the OOM killer.

Give it more when projects are backed by local Parquet files or a DuckDB file, since the runtime
holds one DuckDB instance per active project. `micro_3_0` (1 GB, 40 GB) is $10, `small_3_0`
(2 GB, 60 GB) is $20.

```bash
aws lightsail get-bundles --region eu-central-1 \
  --query 'bundles[?isActive].{id:bundleId,ram:ramSizeInGb,cpu:cpuCount,disk:diskSizeInGb}' \
  --output table
```

The bundle listing does not show the CPU architecture, and you do not need it: the deploy script
reads the host's architecture over SSH (`uname -m`) and builds the image for it.

## State

| In `terraform.tfstate` | Not in it |
|---|---|
| The generated SSH private key, when `ssh_key_pair_name` is empty | The deployment's `.env`: session keys, signing key, database URL, OIDC client secret, bucket credentials |
| Resource IDs, the static IP, the Cloudflare record | The Cloudflare API token, when it comes from `CLOUDFLARE_API_TOKEN` |

Set `ssh_key_pair_name` to use your own key pair and keep the private key out of state entirely.
Use a remote backend with encryption once more than one person runs this.

## The Cloudflare proxy

`cloudflare_proxied` is `false`: Caddy obtains its Let's Encrypt certificate over the plain DNS
record and the deployment works right after `apply`.

Set it to `true` to put Cloudflare in front (CDN, WAF, access policies), and set the zone's
**SSL/TLS encryption mode to Full (strict)** first. On "Flexible" the origin redirects to HTTPS
while Cloudflare talks to it over plain HTTP, which loops. With the proxy on, `ttl` is forced to
"auto".

## Resizing and destroying

```bash
terraform apply     # after changing bundle_id; Lightsail reboots the instance
terraform destroy   # instance, static IP and DNS record
```

`destroy` leaves the host's data volume, the zone's other records and the Postgres database alone.
Back those up separately.

## Cost

The instance and, above the bundle's allowance, data transfer. The static IP is free while it is
attached to a running instance. Nothing else in this module bills.
