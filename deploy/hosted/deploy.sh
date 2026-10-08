#!/usr/bin/env bash
#
# Ships the hosted Statsparrot deployment to a Linux host.
#
# The image is built here, where there is a toolchain and memory to spare, and transferred to the
# host as a tar stream. Nothing is compiled on the host and no container registry is involved.
#
#   ./deploy/hosted/deploy.sh --host 203.0.113.10
#   ./deploy/hosted/deploy.sh --host bi.example.com --ssh-key deploy/terraform/lightsail/lightsail.pem
#
# It reads STATSPARROT_SERVE_PUBLIC_URL and STATSPARROT_DOMAIN from deploy/hosted/.env, which has to
# exist and be filled in. The public URL is what the script uses to verify the deployment
# afterwards.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: deploy.sh --host HOST [options]

  --host HOST         Hostname or IP of the deployment host. Required.
  --user USER         SSH user (default: ubuntu)
  --ssh-key PATH      SSH private key
  --ssh-port PORT     SSH port (default: 22)
  --host-dir DIR      Directory on the host (default: /opt/statsparrot)
  --platform ARCH     Image platform: linux/arm64, linux/amd64, or auto to read it from the
                      host with uname (default: auto)
  --tag TAG           Image tag (default: the current git short SHA, or "latest" outside a repo)
  --skip-build        Reuse the image that is already built locally
  --skip-transfer     Skip sending the image; only copy the files and restart the stack
  --no-verify         Skip the post-deploy checks
  -h, --help          This text
EOF
}

host=""
ssh_user="ubuntu"
ssh_key=""
ssh_port="22"
host_dir="/opt/statsparrot"
platform="auto"
tag=""
skip_build=0
skip_transfer=0
verify=1

while [ $# -gt 0 ]; do
  case "$1" in
    --host) host="${2:-}"; shift 2 ;;
    --user) ssh_user="${2:-}"; shift 2 ;;
    --ssh-key) ssh_key="${2:-}"; shift 2 ;;
    --ssh-port) ssh_port="${2:-}"; shift 2 ;;
    --host-dir) host_dir="${2:-}"; shift 2 ;;
    --platform) platform="${2:-}"; shift 2 ;;
    --tag) tag="${2:-}"; shift 2 ;;
    --skip-build) skip_build=1; shift ;;
    --skip-transfer) skip_transfer=1; shift ;;
    --no-verify) verify=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[ -n "$host" ] || { echo "Missing --host." >&2; usage >&2; exit 2; }

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
env_file="$repo_root/deploy/hosted/.env"
compose_file="$repo_root/deploy/hosted/docker-compose.yml"
caddyfile="$repo_root/deploy/hosted/Caddyfile"
dockerfile="$repo_root/deploy/hosted/Dockerfile"
image_name="statsparrot-hosted"

log() { printf '\033[1m==>\033[0m %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

# ─── Read the two values that have to agree with the host ────────────────────

[ -f "$env_file" ] || die "$env_file does not exist. Copy .env.example to .env and fill it in."

# Read a single variable out of the file. Sourcing is not an option: several values are JSON with
# quotes and spaces, which a shell would mangle.
read_env_var() {
  sed -n "s/^$1=//p" "$env_file" | head -1
}

public_url="$(read_env_var STATSPARROT_SERVE_PUBLIC_URL)"
domain="$(read_env_var STATSPARROT_DOMAIN)"
[ -n "$public_url" ] || die "STATSPARROT_SERVE_PUBLIC_URL is not set in $env_file."
[ -n "$domain" ] || die "STATSPARROT_DOMAIN is not set in $env_file."

expected_host="${public_url#*://}"
expected_host="${expected_host%%/*}"
[ "$expected_host" = "$domain" ] || die "STATSPARROT_SERVE_PUBLIC_URL ($public_url) and STATSPARROT_DOMAIN ($domain) name different hosts. Caddy would obtain a certificate for $domain while the web app calls $expected_host."

[ -f "$compose_file" ] && [ -f "$caddyfile" ] && [ -f "$dockerfile" ] ||
  die "Expected docker-compose.yml, Caddyfile and Dockerfile next to this script."

# ─── SSH plumbing ───────────────────────────────────────────────────────────

ssh_opts=(-p "$ssh_port" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
scp_opts=(-P "$ssh_port" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [ -n "$ssh_key" ]; then
  [ -f "$ssh_key" ] || die "SSH key not found: $ssh_key"
  ssh_opts+=(-i "$ssh_key")
  scp_opts+=(-i "$ssh_key")
fi

remote="$ssh_user@$host"
# shellcheck disable=SC2029  # Expanding locally is the point: the remote command strings embed
# $host_dir and $image, which are known here and not on the host.
on_host() { ssh "${ssh_opts[@]}" "$remote" "$@"; }

log "Connecting to $remote"
on_host true || die "Cannot reach $remote over SSH."

# ─── Platform ───────────────────────────────────────────────────────────────

if [ "$platform" = "auto" ]; then
  case "$(on_host uname -m)" in
    aarch64|arm64) platform="linux/arm64" ;;
    x86_64|amd64) platform="linux/amd64" ;;
    *) die "Unsupported host architecture: $(on_host uname -m)" ;;
  esac
  log "Host architecture detected: $platform"
fi

# ─── Tag ────────────────────────────────────────────────────────────────────

if [ -z "$tag" ]; then
  if tag="$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null)"; then
    :
  else
    tag="latest"
  fi
fi
image="$image_name:$tag"

# ─── Build ──────────────────────────────────────────────────────────────────

if [ "$skip_build" -eq 0 ]; then
  log "Building $image for $platform"
  docker buildx build \
    --platform "$platform" \
    --load \
    -t "$image" \
    -f "$dockerfile" \
    "$repo_root"
else
  log "Skipping the build; expecting $image to exist locally"
  docker image inspect "$image" >/dev/null 2>&1 || die "$image is not present locally."
fi

# ─── Transfer the image ─────────────────────────────────────────────────────

if [ "$skip_transfer" -eq 0 ]; then
  log "Transferring $image to $remote (this sends the whole image, a few hundred MB)"
  # gzip -1 is the fast end of the scale on purpose: the image is mostly an already-compressed
  # binary, and the link is the bottleneck.
  docker save "$image" | gzip -1 | on_host "gunzip | docker load"
  # The compose file pins statsparrot-hosted:latest; give the transferred tag that name too, so a
  # plain `docker compose up -d` without --no-build would still find it.
  on_host "docker tag '$image' '$image_name:latest'"
else
  log "Skipping the image transfer"
fi

# ─── Copy the stack definition ──────────────────────────────────────────────

log "Copying docker-compose.yml, Caddyfile and .env to $host_dir"
on_host "mkdir -p '$host_dir'"
scp "${scp_opts[@]}" "$compose_file" "$caddyfile" "$env_file" "$remote:$host_dir/"
on_host "chmod 600 '$host_dir/.env'"

# ─── Start ──────────────────────────────────────────────────────────────────

log "Starting the stack"
on_host "cd '$host_dir' && docker compose up -d --no-build && docker compose ps"

if [ "$verify" -eq 0 ]; then
  log "Done."
  exit 0
fi

# ─── Verify ─────────────────────────────────────────────────────────────────

log "Waiting for the deployment to answer on $public_url"
# The runtime needs a few seconds to fetch the admin server's JWKS,  so the first requests can
# legitimately fail. Give it a minute before believing anything is wrong.
deadline=$((SECONDS + 120))
until curl -fsS -o /dev/null --max-time 5 "$public_url/v1/ping"; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    on_host "cd '$host_dir' && docker compose logs --tail 40 app" >&2 || true
    die "$public_url/v1/ping did not answer within 120s. Logs above, and: ssh $remote 'cd $host_dir && docker compose logs -f app'"
  fi
  sleep 3
done
log "  $public_url/v1/ping  ok"

log "Checking the web app and the runtime proxy"
app_status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$public_url/" || echo 000)"
[ "$app_status" = "200" ] || die "$public_url/ returned $app_status."
log "  $public_url/  ok"

curl -fsS -o /dev/null --max-time 10 "$public_url/runtime/v1/ping" ||
  die "$public_url/runtime/v1/ping failed: the admin server is not reaching the runtime."
log "  $public_url/runtime/v1/ping  ok"

log "Deployed $image"
log "Next: open $public_url and sign in. The first user has no organization yet."
