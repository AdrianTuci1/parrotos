# Statsparrot

**Agent-augmented business intelligence.** Connect a data source, describe your metrics as files,
and get dashboards, an OLAP query engine and an AI agent that can explore the data and explain it.

## What it does

- **Connect** — warehouses (BigQuery, Snowflake, Redshift, ClickHouse, Databricks, Athena, Druid,
  Pinot, StarRocks), databases (Postgres, MySQL, SQLite), object stores (S3, GCS, Azure Blob) and
  files (Parquet, CSV, JSON). DuckDB is the embedded engine for local data.
- **Model** — a project is a directory of files: sources, models, metrics views, dashboards.
  Versioned like code, reviewable in a pull request.
- **Analyze** — an OLAP engine over the metrics layer, with dashboards, charts, alerting and
  scheduled reports.
- **Ask** — an AI agent inside the project that queries the data, builds charts and answers questions
  about the metrics.
- **Govern** — in the hosted shape, projects live in organizations with members, roles, service
  accounts and per-user row and field level access rules.

## Use it locally

Requires Go 1.26 or newer, Node 20 or newer, and a C toolchain (DuckDB is a C library linked into
the binary).

```bash
make cli
./statsparrot init my-project
./statsparrot start my-project
```

`start` builds the project and serves the web app on <http://localhost:9009>. Add `--port` to change
the port, `--no-open` to skip opening a browser, `--reset` to re-ingest the sources. From the same
directory:

```bash
./statsparrot query --local --sql "select * from orders limit 10"   # run SQL against the project
./statsparrot chat --local                                           # talk to the agent
./statsparrot --help                                                # the rest
```

`make serve` builds the hosted binary, `make admin-ui` rebuilds the hosted web app, and
`make proto.generate` regenerates the clients from `proto/`.

## Launch it hosted

One container serves the admin API, the complete web app (organizations, projects, roles) and a
runtime for every project, all on one origin. A project is built from files, so publishing one is a
copy plus `statsparrot deploy`.

### What you need

| Requirement | Notes |
|---|---|
| A Linux host with Docker and the compose plugin | 512 MB RAM is enough. `deploy/terraform/lightsail` creates one on the cheapest Lightsail plan |
| A domain | Caddy obtains the TLS certificate |
| Managed Postgres 14+ | The control plane's only database. Neon, Lightsail Managed Databases, RDS |
| An OIDC provider | Auth0, Keycloak, Authentik, Okta, Entra ID |
| A bucket | Organization branding and project archives: Google Cloud Storage, AWS S3, Cloudflare R2 or MinIO |
| Ports 80 and 443 reachable | Nothing else |

### 1. Create the host

```bash
cd deploy/terraform/lightsail
cp terraform.tfvars.example terraform.tfvars   # set domain and cloudflare_zone_id
export CLOUDFLARE_API_TOKEN=...                # Zone -> DNS -> Edit

terraform init && terraform apply

# Only when Terraform created the key pair.
terraform output -raw private_key_pem > lightsail.pem && chmod 600 lightsail.pem

# Wait for cloud-init to install Docker.
ssh -i lightsail.pem ubuntu@$(terraform output -raw static_ip) 'cloud-init status --wait'
```

Your own host needs Docker and the compose plugin, nothing else. Details, including what ends up in
Terraform state: [`deploy/terraform/lightsail/README.md`](deploy/terraform/lightsail/README.md).

### 2. Configure it

```bash
cd deploy/hosted
cp .env.example .env
```

[`.env.example`](deploy/hosted/.env.example) documents every variable. These have no default:

| | Where it comes from |
|---|---|
| `STATSPARROT_SERVE_PUBLIC_URL`, `STATSPARROT_DOMAIN` | `terraform output -raw public_url` and `-raw hostname`. The URL's host and the domain must match |
| `STATSPARROT_ADMIN_DATABASE_URL`, `STATSPARROT_ADMIN_RIVER_DATABASE_URL` | Your managed Postgres, in an empty database. The server migrates on boot |
| `STATSPARROT_ADMIN_SESSION_KEY_PAIRS`, `STATSPARROT_RUNTIME_SESSION_KEY_PAIRS` | `openssl rand -hex 32` |
| `STATSPARROT_ADMIN_SIGNING_JWKS`, `STATSPARROT_ADMIN_SIGNING_KEY_ID` | `statsparrot admin generate-signing-key` |
| `STATSPARROT_ADMIN_ASSETS_DRIVER`, `STATSPARROT_ADMIN_ASSETS_BUCKET` and the credentials for it | Your bucket |

Register `${STATSPARROT_SERVE_PUBLIC_URL}/auth/login/callback` as a redirect URI in your OIDC
provider.

### 3. Ship it

```bash
./deploy/hosted/deploy.sh --host bi.example.com --ssh-key deploy/terraform/lightsail/lightsail.pem
```

It builds the image for the host's architecture, transfers it over SSH, copies the stack and your
`.env` to `/opt/statsparrot`, starts it, then checks `/v1/ping`, `/` and `/runtime/v1/ping`. Nothing
is compiled on the host and no registry is involved. Then open the deployment and sign in: the first
user has no organization yet, so create one, then create a project.

Updates are the same command. Logs are `docker compose logs -f app`; metrics are on `/metrics` inside
the host and are not published.

### 4. Publish a project to it

From the machine where you develop the project:

```bash
statsparrot login
statsparrot deploy --managed
```

The project's files are uploaded and the runtime reconciles them. Nothing has to be installed on the
server and no Git repository is required.

[`deploy/hosted/README.md`](deploy/hosted/README.md) is the runbook: expected log lines, verification
commands, splitting the admin and runtime roles, resource use and troubleshooting.

## License

Apache License 2.0. Statsparrot is a derivative work that incorporates source code from Rill
(Apache-2.0, Copyright 2022 Rill Data Inc.), together with the Statsparrot connector, reverse-ETL and
agent code. The required attribution notices are in [`LICENSE.md`](LICENSE.md) and [`NOTICE`](NOTICE).
