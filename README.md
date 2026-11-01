# Statsparrot

Agent-augmented business intelligence: connect a data source, describe your metrics as files, and
get dashboards, an OLAP engine and an agent that explains what moved.

## Use it locally

Prebuilt binaries exist for macOS (arm64) and Linux (amd64). Building from a checkout needs Go 1.26,
Node 20 and a C toolchain, because DuckDB is a C library linked into the binary.

```bash
curl -fsSL https://get.statsparrot.com | sh
statsparrot init my-project
statsparrot start my-project
```

`start` serves the app on <http://localhost:9009>. From a checkout, `make local-bin` builds the same
binary.

## Launch it hosted

One container runs `statsparrot serve`: the admin API (`/v1/*`, `/auth/*`), the complete web app and
every project's runtime under `/runtime/*`.

It needs a Linux host with Docker and the compose plugin, a domain, a managed Postgres 14+, an OIDC
provider and a bucket.

```bash
cd deploy/hosted
cp .env.example .env
```

### Configure the admin

All of them are required. The three secrets are checked at boot, and the error prints the command
that generates each; the rest fail in the admin server with the missing variable named.

| Variable | Value |
|---|---|
| `STATSPARROT_SERVE_PUBLIC_URL`, `STATSPARROT_DOMAIN` | The origin users open, and its host. Register `${STATSPARROT_SERVE_PUBLIC_URL}/auth/login/callback` as a redirect URI in the OIDC provider |
| `STATSPARROT_ADMIN_DATABASE_URL`, `STATSPARROT_ADMIN_RIVER_DATABASE_URL` | An empty managed Postgres; the admin runs its migrations on boot |
| `STATSPARROT_ADMIN_SESSION_KEY_PAIRS`, `STATSPARROT_RUNTIME_SESSION_KEY_PAIRS` | `openssl rand -hex 32` |
| `STATSPARROT_ADMIN_SIGNING_JWKS`, `STATSPARROT_ADMIN_SIGNING_KEY_ID` | `statsparrot admin generate-signing-key` prints both lines |
| `STATSPARROT_ADMIN_AUTH_DOMAIN`, `STATSPARROT_ADMIN_AUTH_CLIENT_ID`, `STATSPARROT_ADMIN_AUTH_CLIENT_SECRET` | Your OIDC tenant |
| `STATSPARROT_ADMIN_ASSETS_DRIVER`, `STATSPARROT_ADMIN_ASSETS_BUCKET` | `gcs` or `s3`, plus that bucket's credentials: organization branding and project archives |

```bash
docker compose up -d --build
```

The first user to sign in has no organization, so create one, then create a project.

`make launch DOMAIN=example.com` does the same on a fresh Lightsail instance: it creates the host
with Terraform, writes `.env` and ships the stack. `.env.example` lists the optional variables, and
[`deploy/hosted/README.md`](deploy/hosted/README.md) is the runbook for verification, splitting the
admin and runtime roles, backups and troubleshooting.

## License

Apache-2.0. The attribution notices are in [`LICENSE.md`](LICENSE.md) and [`NOTICE`](NOTICE).
