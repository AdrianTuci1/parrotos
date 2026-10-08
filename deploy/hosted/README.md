# Hosted deployment

One container running `statsparrot serve`. On a single origin it serves the admin API
(`/v1/*`, `/auth/*`), the complete web app (organizations, projects, roles, dashboards), and every
project's runtime under `/runtime/*`.

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
terraform init && terraform apply
```

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

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Error: missing required configuration:` | The listed variables are unset. The message names the command that generates each. |
| `error creating runtime jwt issuer: invalid JWKS` | `STATSPARROT_ADMIN_SIGNING_JWKS` is not valid JSON, or the shell mangled it. Keep it on one line in `.env`. |
| `failed to create the assets bucket client` | The credentials for the asset bucket are missing or wrong. |
| `Get "https:///.well-known/openid-configuration"` | `STATSPARROT_ADMIN_AUTH_DOMAIN` is empty. |
| `JWKS fetch failed, retrying in 5s` at startup | Normal for the first few seconds, while the admin server migrates. It stops on its own. |
| The web app loads but every request fails | `STATSPARROT_SERVE_PUBLIC_URL` differs from the origin in the browser's address bar. |
| The container restarts | The cause is in the log line just before it: `serve` stops everything when one of its processes exits. |
