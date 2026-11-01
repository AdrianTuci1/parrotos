# Statsparrot

Agent-augmented business intelligence: connect a data source, describe your metrics as files, and
get dashboards, an OLAP engine and an agent that explains what moved.

## Use it locally

Prebuilt binaries exist for macOS (arm64), Linux (amd64) and Windows (amd64). Building from a
checkout needs Go 1.26, Node 20 and a C toolchain, because DuckDB is a C library linked into the
binary.

```bash
curl -fsSL https://get.statsparrot.com | sh
statsparrot init my-project
statsparrot start my-project
```

`start` serves the app on <http://localhost:9009>. From a checkout, `make local-bin` builds the same
binary.

## Launch it hosted

One container serves the admin API, the complete web app and a runtime for every project.

You need a Linux host with Docker and the compose plugin, a domain, a managed Postgres 14+, an OIDC
provider and a bucket. Then:

```bash
cd deploy/hosted
cp .env.example .env     # fill in the variables marked as required
docker compose up -d --build
```

`make launch DOMAIN=example.com` does the same on a fresh Lightsail instance: it creates the host
with Terraform, writes `.env` and ships the stack. Every variable, the expected log lines and the
verification commands are in [`deploy/hosted/README.md`](deploy/hosted/README.md).

## License

Apache-2.0. The attribution notices are in [`LICENSE.md`](LICENSE.md) and [`NOTICE`](NOTICE).
