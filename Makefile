.PHONY: all
all: cli

.PHONE: cli-only
cli-only:
	go run scripts/embed_duckdb_ext/main.go
	go build -o statsparrot cli/main.go

.PHONY: cli
cli: cli.prepare
	go build -o statsparrot cli/main.go 

# The local development binary with only this machine's DuckDB extensions. "make cli" fetches the
# extensions for every platform; this one fetches the platform this machine runs, which is the
# whole difference.
.PHONY: local-bin
local-bin: local-bin.prepare
	go build -trimpath -ldflags "-s -w" -o statsparrot cli/main.go

.PHONY: local-bin.prepare
local-bin.prepare:
	npm install
	npm run build
	rm -rf cli/pkg/web/embed/dist || true
	mkdir -p cli/pkg/web/embed/dist
	cp -r web-local/build/* cli/pkg/web/embed/dist
	STATSPARROT_DUCKDB_PLATFORMS="$$(go env GOOS | sed -e 's/darwin/osx/')_$$(go env GOARCH)" go run scripts/embed_duckdb_ext/main.go

.PHONY: cli.prepare
cli.prepare: runtime.examples.embed
	npm install
	npm run build
	rm -rf cli/pkg/web/embed/dist || true
	mkdir -p cli/pkg/web/embed/dist
	cp -r web-local/build/* cli/pkg/web/embed/dist
	go run scripts/embed_duckdb_ext/main.go

# The hosted binary: one artifact that serves the admin API, the complete web app (roles,
# organizations, projects) and a runtime for every project, all on a single origin.
.PHONY: serve
serve: serve.prepare
	go build -o statsparrot-hosted cli/main.go

.PHONY: serve.prepare
serve.prepare: admin-ui runtime.examples.embed
	go run scripts/embed_duckdb_ext/main.go

# Builds the hosted web app into the admin package's embed directory, so that the admin
# server can serve it straight from the binary.
.PHONY: admin-ui
admin-ui: admin-ui.build
	rm -rf admin/pkg/web/embed/dist || true
	mkdir -p admin/pkg/web/embed/dist
	cp -r web-admin/build/* admin/pkg/web/embed/dist

.PHONY: admin-ui.build
admin-ui.build:
	npm install
	npm run build -w web-admin

# ─── Launching the hosted stack ──────────────────────────────────────────────
# Everything these targets do is in deploy/launch.sh and deploy/hosted/deploy.sh, so the same
# commands run here, in the "Deploy Hosted" workflow, and by hand.
#
# Set SUBDOMAIN= (empty) to put the app on the apex of DOMAIN.
SUBDOMAIN ?= bi

# One command: create the instance with Terraform, write its addresses into deploy/hosted/.env, and
# ship the stack. With HOST= it skips Terraform and deploys to an instance that already exists.
#   make launch DOMAIN=example.com
#   make launch HOST=203.0.113.10 SSH_KEY=~/.ssh/lightsail.pem
.PHONY: launch
launch:
	./deploy/launch.sh $(if $(HOST),--host "$(HOST)") $(if $(DOMAIN),--domain "$(DOMAIN)") --subdomain "$(SUBDOMAIN)" $(if $(SSH_KEY),--ssh-key "$(SSH_KEY)")

# Ship to an instance that already exists, without touching Terraform.
.PHONY: deploy
deploy:
	@test -n "$(HOST)" || { echo 'usage: make deploy HOST=host-or-ip [SSH_KEY=path]' >&2; exit 2; }
	./deploy/hosted/deploy.sh --host "$(HOST)" $(if $(SSH_KEY),--ssh-key "$(SSH_KEY)")

# Create the instance only, and leave Terraform printing what to do next.
.PHONY: provision
provision:
	@test -n "$(DOMAIN)" || { echo 'usage: make provision DOMAIN=example.com [SUBDOMAIN=bi]' >&2; exit 2; }
	terraform -chdir=deploy/terraform/lightsail init -input=false
	terraform -chdir=deploy/terraform/lightsail apply -var "domain=$(DOMAIN)" -var "subdomain=$(SUBDOMAIN)"

.PHONY: coverage.go
coverage.go:
	rm -rf coverage/go.out
	mkdir -p coverage
	# Run tests with coverage output. First builds the list of packages to include in coverage, excluding generated code in 'proto/gen'.
	set -e ; \
		PACKAGES=$$(go list ./... | grep -v 'proto/gen/' | tr '\n' ',' | sed -e 's/,$$//' | sed -e 's/github.com\/staticlabs\/statsparrot/./g') ;\
		go test ./... -short -v -coverprofile ./coverage/go.out -coverpkg $$PACKAGES
	go tool cover -func coverage/go.out

.PHONY: docs.generate
docs.generate: runtime.examples.embed
	# Temporarily replaces ~/.statsparrot/config.yaml to avoid including user-defined defaults in generated docs.
	#
	# Sets main.Version to a fixed tag to simulate a production build, where certain commands are hidden.
	# Not using scripts/versiontag.sh since the actual version should not be emitted to the generated files as it would go stale on the next release.
	rm -rf docs/docs/reference/cli/*.md docs/docs/reference/project-files/*.md
	if [ -f ~/.statsparrot/config.yaml ]; then mv ~/.statsparrot/config.yaml ~/.statsparrot/config.yaml.tmp; fi;
	STATSPARROT_DOCS_GENERATE=true go run -ldflags="-X main.Version=1.0.0" ./cli docs generate-cli docs/docs/reference/cli/
	STATSPARROT_DOCS_GENERATE=true go run -ldflags="-X main.Version=1.0.0" ./cli docs generate-project docs/docs/reference/project-files/
	if [ -f ~/.statsparrot/config.yaml.tmp ]; then mv ~/.statsparrot/config.yaml.tmp ~/.statsparrot/config.yaml; fi;

.PHONY: proto.generate
proto.generate:
	cd proto && buf generate --exclude-path statsparrot/ui
	cd proto && buf generate --template buf.gen.openapi-admin.yaml --path statsparrot/admin
	cd proto && buf generate --template buf.gen.openapi-runtime.yaml --path statsparrot/runtime
	cd proto && buf generate --template buf.gen.runtime.yaml --path statsparrot/runtime
	cd proto && buf generate --template buf.gen.local.yaml --path statsparrot/local
	cd proto && buf generate --template buf.gen.ui.yaml
	go run scripts/convert-openapi-v2-to-v3/convert.go --force \
		proto/gen/statsparrot/admin/v1/admin.swagger.yaml proto/gen/statsparrot/admin/v1/openapi.yaml
	go run scripts/convert-openapi-v2-to-v3/convert.go --force --public-only \
		proto/gen/statsparrot/admin/v1/admin.swagger.yaml proto/gen/statsparrot/admin/v1/public.openapi.yaml
	npm install
	npm run generate:runtime-client -w web-common
	npm run generate:client -w web-admin

KEEP_EXAMPLES := statsparrot-openrtb-prog-ads statsparrot-github-analytics statsparrot-cost-monitoring

# The examples repository may be private or unavailable. A failed clone is a warning rather
# than an error: the binary builds fine without the example projects.
.PHONY: runtime.examples.embed
runtime.examples.embed:
	@rm -rf runtime/pkg/examples/embed/dist || true; \
	mkdir -p runtime/pkg/examples/embed/dist; \
	TMP_CLONE_DIR=$$(mktemp -d 2>/dev/null || mktemp -d -t statsparrot-examples); \
	trap 'rm -rf "$$TMP_CLONE_DIR"' EXIT; \
	if git clone --quiet --depth=1 https://github.com/staticlabs/statsparrot-examples.git "$$TMP_CLONE_DIR"; then \
		for d in $(KEEP_EXAMPLES); do \
			cp -R "$$TMP_CLONE_DIR/$$d" runtime/pkg/examples/embed/dist/; \
		done; \
	else \
		echo "warning: could not clone statsparrot-examples, building without example projects"; \
	fi
