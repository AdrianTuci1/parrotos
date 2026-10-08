# syntax=docker/dockerfile:1

# Builds the hosted Parrot deployment: one binary that serves the admin API, the complete web
# app (organizations, projects, roles) and a runtime for every project.
#
# Build from the repository root:
#   docker build -f deploy/hosted/Dockerfile -t statsparrot-hosted .

# --- Stage 1: build the hosted web app ---------------------------------------
FROM node:20-bookworm AS ui

WORKDIR /src

# Install dependencies first so the layer is reused while only sources change.
COPY package.json package-lock.json ./
COPY web-admin/package.json web-admin/
COPY web-common/package.json web-common/
COPY web-local/package.json web-local/
RUN npm install

COPY . .

# The web app can be compiled against a fixed admin URL, and left without one.
#
# Leave it empty (the default) and the app talks to the origin it was loaded from, which is the
# same server: the image then runs on any host, including one whose hostname is only known after
# the image is built. It is what makes the same image usable on Lightsail, Render, Railway and
# anywhere else.
#
# Set it to the origin the deployment is reachable on to bake that origin in instead. The app
# compares the two and switches to the "/api" path prefix when the second-level domain differs,
# so baking is only useful when the deployment is reachable on more than one hostname.
ARG STATSPARROT_UI_PUBLIC_STATSPARROT_ADMIN_URL=""
ENV STATSPARROT_UI_PUBLIC_STATSPARROT_ADMIN_URL=${STATSPARROT_UI_PUBLIC_STATSPARROT_ADMIN_URL}
RUN npm run build -w web-admin

# --- Stage 2: build the Go binary --------------------------------------------
FROM golang:1.26-bookworm AS build

# A C toolchain is required: DuckDB is a C library and the runtime links it for SQL parsing.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# The built web app is embedded into the admin package, so the binary serves it directly.
COPY --from=ui /src/web-admin/build ./admin/pkg/web/embed/dist

# Bake the DuckDB extensions for this platform into the binary, so the runtime never has to
# download them at startup.
ARG DUCKDB_EXTENSIONS="json,parquet"
ARG DUCKDB_PLATFORMS="linux_amd64,linux_arm64"
RUN STATSPARROT_DUCKDB_EXTENSIONS="${DUCKDB_EXTENSIONS}" \
    STATSPARROT_DUCKDB_PLATFORMS="${DUCKDB_PLATFORMS}" \
    go run scripts/embed_duckdb_ext/main.go

ARG VERSION=""
ARG COMMIT=""
ARG BUILD_DATE=""
RUN CGO_ENABLED=1 go build -trimpath \
      -ldflags "-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.BuildDate=${BUILD_DATE}" \
      -o /out/statsparrot cli/main.go

# --- Stage 3: runtime ---------------------------------------------------------
FROM debian:bookworm-slim

# ca-certificates for outbound TLS to warehouses and identity providers; tzdata so that
# report schedules and cron expressions resolve in the intended zone.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /out/statsparrot /usr/local/bin/statsparrot

# Everything the runtime persists (project data, DuckDB files, the metastore) lives in one
# directory, which is the directory to mount a volume on.
RUN useradd --system --uid 10001 --home-dir /var/lib/statsparrot --create-home statsparrot \
 && mkdir -p /var/lib/statsparrot \
 && chown -R statsparrot:statsparrot /var/lib/statsparrot
USER statsparrot

ENV STATSPARROT_SERVE_RUNTIME_DATA_DIR=/var/lib/statsparrot
VOLUME ["/var/lib/statsparrot"]

# The admin server (API, web app and the runtime proxy) listens here.
EXPOSE 8080

# With no arguments this runs "statsparrot serve", which runs the admin server and the
# runtime together. Use STATSPARROT_SERVE_ROLE or --role to split them across containers.
ENTRYPOINT ["statsparrot"]
CMD ["serve"]
