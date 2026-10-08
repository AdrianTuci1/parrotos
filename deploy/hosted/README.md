# Hosted deployment

One container running `statsparrot serve`. On a single origin it serves the admin API
(`/v1/*`, `/auth/*`), the complete web app (organizations, projects, roles, dashboards), and every
project's runtime under `/runtime/*`.

## Three ways to run it

| | How | Needs |
|---|---|---|
| One command on your machine | `make launch DOMAIN=example.com`, or `make launch HOST=1.2.3.4` for an instance that exists | Terraform, Docker, SSH and the values in `.env` |
| From GitHub, with nothing installed | **Actions → 🚀 Deploy Hosted**, started by hand | The secrets and variables listed at the top of `.github/workflows/deploy-hosted.yml` |
| On a PaaS | `render.yaml` or `railway.json`, both building the same `Dockerfile` | A managed Postgres and a volume at `/var/lib/statsparrot` |

All three end up running the same image, and the steps below are what they do.

The image is built without a hostname in it, so the web app calls whatever origin serves it. That is
what makes one image reusable across these paths, and it means `STATSPARROT_SERVE_PUBLIC_URL` is
needed for the TLS certificate and the OIDC redirect rather than for the build.

## What you need

| Requirement | Notes |
|---|---|
| A host with Docker and the compose plugin | 512 MB RAM is enough: the database and the object storage both live elsewhere. `deploy/terraform/lightsail` creates one on the cheapest Lightsail plan, with a swap file. |
| A domain | Caddy obtains the TLS certificate for it. |
| Managed Postgres 14+ | The only stateful dependency. Accounts, organizations, projects and the job queue. Neon, Lightsail Managed Databases, RDS. |
| An OIDC provider | Auth0, Keycloak, Authentik, Okta, Entra ID. Register `${STATSPARROT_SERVE_PUBLIC_URL}/auth/login/callback` as a redirect URI. |
| A bucket | Organization branding and project archives. Google Cloud Storage, or anything S3-compatible: AWS S3, Cloudflare R2, MinIO. |
| Ports 80 and 443 reachable from the internet | Nothing else. Do not open the runtime's own port; the admin server reaches it over the loopback interface and exposes it under `/runtime`. |

## 1. Create the host

```bash
cd deploy/terraform/lightsail
cp terraform.tfvars.example terraform.tfvars   # set domain and cloudflare_zone_id
export CLOUDFLARE_API_TOKEN=...
terraform init -backend=false && terraform apply
```

`-backend=false` keeps the state in that directory, which is what a local run wants. A run on a
machine that does not keep files, such as a GitHub runner, passes `TF_STATE_BUCKET` instead and
stores it in that bucket: the state holds the instance's generated private key.

Creates the Lightsail instance, its static IP, the firewall, the swap file and the Cloudflare `A`
record. `terraform output next_steps` prints what to do next. To use a host you already have,
install Docker and the compose plugin and skip to step 2:

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"   # log out and back in
```

## 2. Configure

```bash
git clone <this repository> statsparrot && cd statsparrot/deploy/hosted
cp .env.example .env
```

Two values have to be generated rather than chosen:

```bash
openssl rand -hex 32                                            # STATSPARROT_ADMIN_SESSION_KEY_PAIRS
docker run --rm statsparrot-hosted:latest admin generate-signing-key   # SIGNING_JWKS + KEY_ID
```

The rest of the required values have no default: `STATSPARROT_SERVE_PUBLIC_URL`,
`STATSPARROT_DOMAIN`, `STATSPARROT_ADMIN_DATABASE_URL`, `STATSPARROT_ADMIN_RIVER_DATABASE_URL`,
`STATSPARROT_RUNTIME_SESSION_KEY_PAIRS`, `STATSPARROT_ADMIN_AUTH_DOMAIN`,
`STATSPARROT_ADMIN_AUTH_CLIENT_ID`, `STATSPARROT_ADMIN_AUTH_CLIENT_SECRET` and the asset bucket
(`STATSPARROT_ADMIN_ASSETS_BUCKET` plus `STATSPARROT_ADMIN_ASSETS_DRIVER` and the credentials for
it). `.env.example` lists every variable.

Create an empty database. The admin server runs its migrations on boot.

## 3. Start

```bash
./deploy/hosted/deploy.sh --host bi.example.com
```

Builds the image on your machine for the host's architecture, transfers it over SSH, copies
`docker-compose.yml`, `Caddyfile` and `.env` to `/opt/statsparrot`, starts the stack and checks
`/v1/ping`, `/` and `/runtime/v1/ping`. `--skip-build`, `--skip-transfer` and `--no-verify` exist
for iterating on one part; `--help` lists the rest.

Build on your machine. The Go build needs more memory than a 512 MB host has.

Verify, then open the site and sign in:

```bash
curl -fsS https://bi.example.com/v1/ping           # {"version":..., "time":...}
curl -fsS https://bi.example.com/runtime/v1/ping   # the runtime, through the proxy
```

The first user to sign in has no organization. Create one, then create a project.

## 4. Publish a project

From the machine where you develop it, with `statsparrot login` pointed at this deployment:

```bash
statsparrot deploy --managed
```

The project's files are uploaded to the asset bucket and the runtime downloads them. Nothing has
to be installed on the server, and no Git repository is needed.

## Operating it

**Update.** `./deploy/hosted/deploy.sh --host bi.example.com` again.

**Back up.** Postgres, through the provider's snapshots. The `statsparrot_statsparrot-data` volume
holds per-project state:

```bash
docker run --rm -v statsparrot_statsparrot-data:/d -v "$PWD":/b alpine tar czf /b/volume.tgz -C /d .
```

**Logs.** Both processes write JSON to stdout: `docker compose logs -f app`. The admin server
exposes Prometheus metrics on `/metrics`, the runtime on its private port. Neither is published;
scrape them from the host.

**Split the roles.** The same image runs either half:

```bash
statsparrot serve --role=admin     # API, web app, runtime proxy
statsparrot serve --role=runtime   # runtime only
```

For `--role=admin`, also set `STATSPARROT_SERVE_RUNTIME_TARGET` to the runtime's address and
supply `STATSPARROT_ADMIN_PROVISIONER_SET_JSON`, because the generated one points at the loopback
address. The admin server is then stateless and can be scaled out; the runtime keeps the volume.

**Put Cloudflare in front.** Set `cloudflare_proxied = true` in the Terraform variables, or turn the
record's proxy on in the dashboard, to cache the web app's assets at the edge. The server already
sends the headers that make this safe: everything under `_app/immutable/` is content-hashed and
served `max-age=31536000, immutable`, and every other response is `no-store`, so an HTML page never
goes stale. Turn the proxy on with the zone's SSL/TLS mode set to **Full (strict)**; on Flexible the
origin redirects in a loop. Nothing else is cacheable: `/v1/*`, `/runtime/*` and `/auth/*` are
per-user or streaming, and `no-store` keeps them out of the cache.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Error: missing required configuration:` | The listed variables are unset. The message names the command that generates each. |
| `error creating runtime jwt issuer: invalid JWKS` | `STATSPARROT_ADMIN_SIGNING_JWKS` is not valid JSON, or the shell mangled it. Keep it on one line in `.env`. |
| `failed to create the assets bucket client` | The credentials for the asset bucket are missing or wrong. |
| `Get "https:///.well-known/openid-configuration"` | `STATSPARROT_ADMIN_AUTH_DOMAIN` is empty. |
| `JWKS fetch failed, retrying in 5s` at startup | Normal for the first few seconds, while the admin server migrates. It stops on its own. |
| The web app loads but every request fails | The app calls the origin in the browser's address bar, so a failure here is a proxy or DNS problem between the browser and the container. Check `/v1/ping` from outside. |
| Sign-in redirects to the wrong host | `STATSPARROT_SERVE_PUBLIC_URL` does not match the host users actually open, and the OIDC redirect URI follows that value. |
| The container restarts | The cause is in the log line just before it: `serve` stops everything when one of its processes exits. |
