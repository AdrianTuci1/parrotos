package serve

import (
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

// Role selects which processes the serve command runs.
type Role string

const (
	// RoleAll runs the admin server and the runtime in one process group. This is the
	// single-container deployment.
	RoleAll Role = "all"
	// RoleAdmin runs only the admin server (API, web UI and the runtime reverse proxy).
	RoleAdmin Role = "admin"
	// RoleRuntime runs only the runtime server.
	RoleRuntime Role = "runtime"
)

func parseRole(s string) (Role, error) {
	switch Role(strings.ToLower(strings.TrimSpace(s))) {
	case "", RoleAll:
		return RoleAll, nil
	case RoleAdmin:
		return RoleAdmin, nil
	case RoleRuntime:
		return RoleRuntime, nil
	default:
		return "", fmt.Errorf("invalid role %q (expected %q, %q or %q)", s, RoleAll, RoleAdmin, RoleRuntime)
	}
}

func (r Role) runsAdmin() bool   { return r == RoleAll || r == RoleAdmin }
func (r Role) runsRuntime() bool { return r == RoleAll || r == RoleRuntime }

// envLookup resolves an environment variable. Tests pass a map-backed implementation.
type envLookup func(key string) (string, bool)

// childEnv is the environment the serve command builds for its child processes. It contains
// only the variables serve is responsible for; everything else is inherited untouched.
type childEnv struct {
	admin   map[string]string
	runtime map[string]string
}

// buildEnv derives the configuration shared between the admin server and the runtime from a
// single public URL.
//
// The admin signs runtime tokens with its own external URL as the issuer and the deployment's
// runtime audience as the audience; the runtime validates both claims against AUTH_ISSUER_URL
// and AUTH_AUDIENCE_URL. Deriving all four from one URL is what makes the deployment
// self-consistent: it is impossible to end up with an issuer or audience the other side
// rejects.
//
// Variables that a split deployment may legitimately want to point elsewhere (a separate
// runtime host, a shared metastore) are only set when the environment does not already
// define them, so they can still be overridden.
func buildEnv(conf Config, role Role, lookup envLookup) (*childEnv, error) {
	publicURL, err := url.Parse(conf.PublicURL)
	if err != nil {
		return nil, fmt.Errorf("invalid public URL %q: %w", conf.PublicURL, err)
	}
	if publicURL.Scheme != "http" && publicURL.Scheme != "https" {
		return nil, fmt.Errorf("invalid public URL %q: scheme must be http or https", conf.PublicURL)
	}
	if publicURL.Host == "" {
		return nil, fmt.Errorf("invalid public URL %q: host is missing", conf.PublicURL)
	}
	if publicURL.RawQuery != "" || publicURL.Fragment != "" {
		return nil, fmt.Errorf("invalid public URL %q: must not contain a query string or fragment", conf.PublicURL)
	}
	origin := publicURL.Scheme + "://" + publicURL.Host

	runtimePath := "/" + strings.Trim(conf.RuntimePath, "/")
	runtimePublicURL, err := url.JoinPath(publicURL.String(), runtimePath)
	if err != nil {
		return nil, fmt.Errorf("failed to build the runtime public URL: %w", err)
	}
	runtimePublicURL = strings.TrimSuffix(runtimePublicURL, "/")

	// The runtime is reached by the admin server on the loopback interface by default. A
	// split deployment points this at the runtime's own address instead.
	runtimeTarget := conf.RuntimeTarget
	if runtimeTarget == "" {
		runtimeTarget = fmt.Sprintf("http://127.0.0.1:%d", conf.RuntimePort)
	}

	env := &childEnv{admin: map[string]string{}, runtime: map[string]string{}}

	if role.runsAdmin() {
		// Locations. The admin serves the UI on its own origin, so the frontend URL is the
		// public URL.
		env.admin["STATSPARROT_ADMIN_EXTERNAL_URL"] = conf.PublicURL
		env.admin["STATSPARROT_ADMIN_EXTERNAL_GRPC_URL"] = conf.PublicURL
		env.admin["STATSPARROT_ADMIN_FRONTEND_URL"] = conf.PublicURL
		env.admin["STATSPARROT_ADMIN_ALLOWED_ORIGINS"] = origin

		// Listeners. HTTP and gRPC share one port through the h2c server, and the debug
		// (pprof) listener stays off because the admin port is public.
		env.admin["STATSPARROT_ADMIN_HTTP_PORT"] = strconv.Itoa(conf.HTTPPort)
		env.admin["STATSPARROT_ADMIN_GRPC_PORT"] = strconv.Itoa(conf.HTTPPort)
		env.admin["STATSPARROT_ADMIN_DEBUG_PORT"] = "0"
		env.admin["STATSPARROT_ADMIN_SERVE_UI"] = "true"

		// The runtime is exposed on the admin's own origin, under a path prefix. Browsers
		// then reach every project's runtime without per-project hostnames or CORS.
		env.admin["STATSPARROT_ADMIN_RUNTIME_PROXY_TARGET"] = runtimeTarget
		env.admin["STATSPARROT_ADMIN_RUNTIME_PROXY_PREFIX"] = runtimePath
		env.admin["STATSPARROT_ADMIN_RUNTIME_PUBLIC_URL"] = runtimePublicURL

		// The autoscaler only makes sense for a provisioner that can resize deployments,
		// which the static provisioner cannot. Leaving the cron empty disables the job
		// instead of letting it log warnings about slot changes it cannot apply.
		env.admin["STATSPARROT_ADMIN_AUTOSCALER_CRON"] = ""

		// The provisioner tells the admin where deployments run. It is generated for the
		// single-container case and left alone when an operator brings their own, for
		// example to add a second provisioner or to point at an external runtime fleet.
		if _, ok := lookup("STATSPARROT_ADMIN_PROVISIONER_SET_JSON"); !ok {
			spec, err := staticProvisionerSpec(runtimeTarget, runtimePublicURL, conf.RuntimeSlots)
			if err != nil {
				return nil, err
			}
			env.admin["STATSPARROT_ADMIN_PROVISIONER_SET_JSON"] = spec
			env.admin["STATSPARROT_ADMIN_DEFAULT_PROVISIONER"] = "static"
		}
	}

	if role.runsRuntime() {
		// Listeners. The runtime is private: the admin proxies browser traffic to it.
		env.runtime["STATSPARROT_RUNTIME_HTTP_PORT"] = strconv.Itoa(conf.RuntimePort)
		env.runtime["STATSPARROT_RUNTIME_GRPC_PORT"] = strconv.Itoa(conf.RuntimePort)
		env.runtime["STATSPARROT_RUNTIME_DEBUG_PORT"] = "0"
		env.runtime["STATSPARROT_RUNTIME_ALLOWED_ORIGINS"] = origin

		// Token validation. These must match what the admin signs and the audience it puts
		// in the provisioner spec.
		env.runtime["STATSPARROT_RUNTIME_AUTH_ENABLE"] = "true"
		env.runtime["STATSPARROT_RUNTIME_AUTH_ISSUER_URL"] = conf.PublicURL
		env.runtime["STATSPARROT_RUNTIME_AUTH_AUDIENCE_URL"] = runtimePublicURL

		// State. A shared metastore (for example Postgres, when several runtime replicas
		// serve the same admin) is left alone if the operator configured one.
		if _, ok := lookup("STATSPARROT_RUNTIME_METASTORE_URL"); !ok {
			env.runtime["STATSPARROT_RUNTIME_METASTORE_URL"] = conf.MetastoreURL()
		}
		if _, ok := lookup("STATSPARROT_RUNTIME_DATA_DIR"); !ok {
			env.runtime["STATSPARROT_RUNTIME_DATA_DIR"] = conf.RuntimeDataDir
		}
	}

	return env, nil
}

// staticProvisionerSpec renders the static provisioner spec for a single runtime.
//
// host is how the admin server reaches the runtime, so it stays on the private address.
// audience_url is the URL whose value ends up in the audience claim of every runtime token,
// so it must be the URL browsers use, because the same claim has to validate for both the
// admin's server-to-server calls and the browser's calls.
func staticProvisionerSpec(host, audienceURL string, slots int) (string, error) {
	spec := map[string]any{
		"static": map[string]any{
			"type": "static",
			"spec": map[string]any{
				"runtimes": []map[string]any{{
					"host":         host,
					"slots":        slots,
					"audience_url": audienceURL,
				}},
			},
		},
	}
	b, err := json.Marshal(spec)
	if err != nil {
		return "", fmt.Errorf("failed to render the provisioner spec: %w", err)
	}
	return string(b), nil
}

// mergeEnv returns base with overrides applied. A key already present in base is replaced in
// place; new keys are appended in sorted order so the result is deterministic.
func mergeEnv(base []string, overrides map[string]string) []string {
	if len(overrides) == 0 {
		return base
	}

	out := make([]string, 0, len(base)+len(overrides))
	applied := make(map[string]bool, len(overrides))
	for _, kv := range base {
		key, _, found := strings.Cut(kv, "=")
		if !found {
			out = append(out, kv)
			continue
		}
		value, ok := overrides[key]
		if !ok {
			out = append(out, kv)
			continue
		}
		out = append(out, key+"="+value)
		applied[key] = true
	}

	remaining := make([]string, 0, len(overrides))
	for key := range overrides {
		if !applied[key] {
			remaining = append(remaining, key)
		}
	}
	sort.Strings(remaining)
	for _, key := range remaining {
		out = append(out, key+"="+overrides[key])
	}

	return out
}
