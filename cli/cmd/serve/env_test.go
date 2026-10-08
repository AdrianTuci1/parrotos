package serve

import (
	"encoding/json"
	"sort"
	"strings"
	"testing"
	"time"
)

func testConfig() Config {
	return Config{
		PublicURL:      "https://bi.example.com",
		HTTPPort:       8080,
		RuntimePort:    9009,
		RuntimePath:    "/runtime",
		RuntimeDataDir: "/var/lib/statsparrot",
		RuntimeSlots:   250,
		DrainTimeout:   30 * time.Second,
	}
}

func noEnv(string) (string, bool) { return "", false }

func envFrom(m map[string]string) envLookup {
	return func(key string) (string, bool) {
		v, ok := m[key]
		return v, ok
	}
}

func TestBuildEnvDerivesOneConsistentOrigin(t *testing.T) {
	env, err := buildEnv(testConfig(), RoleAll, noEnv)
	if err != nil {
		t.Fatalf("buildEnv: %v", err)
	}

	want := map[string]string{
		// The admin signs tokens with this issuer and the runtime validates it.
		"STATSPARROT_ADMIN_EXTERNAL_URL":      "https://bi.example.com",
		"STATSPARROT_RUNTIME_AUTH_ISSUER_URL": "https://bi.example.com",
		// The admin serves the UI itself, so the frontend is the public origin.
		"STATSPARROT_ADMIN_FRONTEND_URL":      "https://bi.example.com",
		"STATSPARROT_ADMIN_ALLOWED_ORIGINS":   "https://bi.example.com",
		"STATSPARROT_RUNTIME_ALLOWED_ORIGINS": "https://bi.example.com",
		// The audience the admin mints and the audience the runtime accepts must match.
		"STATSPARROT_ADMIN_RUNTIME_PUBLIC_URL":  "https://bi.example.com/runtime",
		"STATSPARROT_RUNTIME_AUTH_AUDIENCE_URL": "https://bi.example.com/runtime",
		// The admin reaches the runtime on the loopback interface, the browser through the
		// prefix on the public origin.
		"STATSPARROT_ADMIN_RUNTIME_PROXY_TARGET": "http://127.0.0.1:9009",
		"STATSPARROT_ADMIN_RUNTIME_PROXY_PREFIX": "/runtime",
		"STATSPARROT_ADMIN_SERVE_UI":             "true",
		"STATSPARROT_ADMIN_HTTP_PORT":            "8080",
		"STATSPARROT_ADMIN_GRPC_PORT":            "8080",
		"STATSPARROT_RUNTIME_HTTP_PORT":          "9009",
		"STATSPARROT_RUNTIME_GRPC_PORT":          "9009",
		"STATSPARROT_RUNTIME_AUTH_ENABLE":        "true",
		"STATSPARROT_RUNTIME_DATA_DIR":           "/var/lib/statsparrot",
		"STATSPARROT_RUNTIME_METASTORE_URL":      "/var/lib/statsparrot/metastore.db",
	}
	for key, value := range want {
		got, ok := lookupKey(env, key)
		if !ok {
			t.Errorf("%s is not set", key)
			continue
		}
		if got != value {
			t.Errorf("%s = %q, want %q", key, got, value)
		}
	}
}

func TestBuildEnvProvisionerSpecMatchesAuthAudience(t *testing.T) {
	conf := testConfig()
	env, err := buildEnv(conf, RoleAll, noEnv)
	if err != nil {
		t.Fatalf("buildEnv: %v", err)
	}

	raw, ok := env.admin["STATSPARROT_ADMIN_PROVISIONER_SET_JSON"]
	if !ok {
		t.Fatal("STATSPARROT_ADMIN_PROVISIONER_SET_JSON is not set")
	}
	if got := env.admin["STATSPARROT_ADMIN_DEFAULT_PROVISIONER"]; got != "static" {
		t.Errorf("default provisioner = %q, want %q", got, "static")
	}

	var spec struct {
		Static struct {
			Type string `json:"type"`
			Spec struct {
				Runtimes []struct {
					Host     string `json:"host"`
					Slots    int    `json:"slots"`
					Audience string `json:"audience_url"`
				} `json:"runtimes"`
			} `json:"spec"`
		} `json:"static"`
	}
	if err := json.Unmarshal([]byte(raw), &spec); err != nil {
		t.Fatalf("provisioner spec is not valid JSON: %v", err)
	}

	if spec.Static.Type != "static" {
		t.Errorf("provisioner type = %q, want %q", spec.Static.Type, "static")
	}
	if len(spec.Static.Spec.Runtimes) != 1 {
		t.Fatalf("got %d runtimes, want 1", len(spec.Static.Spec.Runtimes))
	}
	rt := spec.Static.Spec.Runtimes[0]
	if rt.Host != "http://127.0.0.1:9009" {
		t.Errorf("host = %q, want the private runtime address", rt.Host)
	}
	if rt.Slots != 250 {
		t.Errorf("slots = %d, want 250", rt.Slots)
	}
	// The audience ends up in the tokens the runtime receives, so it has to be the URL
	// browsers use, which is also what the runtime is configured to accept.
	if rt.Audience != env.runtime["STATSPARROT_RUNTIME_AUTH_AUDIENCE_URL"] {
		t.Errorf("audience_url = %q, but the runtime accepts %q",
			rt.Audience, env.runtime["STATSPARROT_RUNTIME_AUTH_AUDIENCE_URL"])
	}
}

func TestBuildEnvRoleSelectsProcesses(t *testing.T) {
	tests := []struct {
		role    Role
		admin   bool
		runtime bool
	}{
		{RoleAll, true, true},
		{RoleAdmin, true, false},
		{RoleRuntime, false, true},
	}
	for _, tt := range tests {
		t.Run(string(tt.role), func(t *testing.T) {
			env, err := buildEnv(testConfig(), tt.role, noEnv)
			if err != nil {
				t.Fatalf("buildEnv: %v", err)
			}
			if got := len(env.admin) > 0; got != tt.admin {
				t.Errorf("admin env set = %v, want %v", got, tt.admin)
			}
			if got := len(env.runtime) > 0; got != tt.runtime {
				t.Errorf("runtime env set = %v, want %v", got, tt.runtime)
			}
		})
	}
}

// A split deployment (or a shared metastore across runtime replicas) needs to be able to
// override the derived values.
func TestBuildEnvLeavesOverridableValuesToTheOperator(t *testing.T) {
	lookup := envFrom(map[string]string{
		"STATSPARROT_ADMIN_PROVISIONER_SET_JSON": `{"static":{"type":"static","spec":{"runtimes":[]}}}`,
		"STATSPARROT_RUNTIME_METASTORE_URL":      "postgres://user:pass@db:5432/metastore",
		"STATSPARROT_RUNTIME_DATA_DIR":           "/mnt/shared",
	})

	env, err := buildEnv(testConfig(), RoleAll, lookup)
	if err != nil {
		t.Fatalf("buildEnv: %v", err)
	}

	if _, ok := env.admin["STATSPARROT_ADMIN_PROVISIONER_SET_JSON"]; ok {
		t.Error("an operator-provided provisioner set was overwritten")
	}
	if _, ok := env.admin["STATSPARROT_ADMIN_DEFAULT_PROVISIONER"]; ok {
		t.Error("the default provisioner was set even though the operator provided a set")
	}
	if _, ok := env.runtime["STATSPARROT_RUNTIME_METASTORE_URL"]; ok {
		t.Error("an operator-provided metastore URL was overwritten")
	}
	if _, ok := env.runtime["STATSPARROT_RUNTIME_DATA_DIR"]; ok {
		t.Error("an operator-provided data dir was overwritten")
	}
}

func TestBuildEnvRuntimeTargetOverride(t *testing.T) {
	conf := testConfig()
	conf.RuntimeTarget = "http://runtime.internal:9009"

	env, err := buildEnv(conf, RoleAll, noEnv)
	if err != nil {
		t.Fatalf("buildEnv: %v", err)
	}
	if got := env.admin["STATSPARROT_ADMIN_RUNTIME_PROXY_TARGET"]; got != "http://runtime.internal:9009" {
		t.Errorf("proxy target = %q, want the configured runtime target", got)
	}
}

func TestBuildEnvRejectsBadPublicURLs(t *testing.T) {
	tests := []string{
		"",
		"bi.example.com",              // no scheme
		"ftp://bi.example.com",        // unsupported scheme
		"https://",                    // no host
		"https://bi.example.com/?a=1", // query string
	}
	for _, publicURL := range tests {
		t.Run(publicURL, func(t *testing.T) {
			conf := testConfig()
			conf.PublicURL = publicURL
			if _, err := buildEnv(conf, RoleAll, noEnv); err == nil {
				t.Fatalf("buildEnv accepted public URL %q", publicURL)
			}
		})
	}
}

func TestBuildEnvNormalizesRuntimePath(t *testing.T) {
	for _, path := range []string{"runtime", "/runtime", "/runtime/", "//runtime/"} {
		conf := testConfig()
		conf.RuntimePath = path
		env, err := buildEnv(conf, RoleAll, noEnv)
		if err != nil {
			t.Fatalf("buildEnv with path %q: %v", path, err)
		}
		if got := env.runtime["STATSPARROT_RUNTIME_AUTH_AUDIENCE_URL"]; got != "https://bi.example.com/runtime" {
			t.Errorf("path %q produced audience %q", path, got)
		}
		if got := env.admin["STATSPARROT_ADMIN_RUNTIME_PROXY_PREFIX"]; got != "/runtime" {
			t.Errorf("path %q produced prefix %q", path, got)
		}
	}
}

func TestParseRole(t *testing.T) {
	tests := []struct {
		in      string
		want    Role
		wantErr bool
	}{
		{"", RoleAll, false},
		{"all", RoleAll, false},
		{"ADMIN", RoleAdmin, false},
		{" admin ", RoleAdmin, false},
		{"runtime", RoleRuntime, false},
		{"serve", "", true},
	}
	for _, tt := range tests {
		got, err := parseRole(tt.in)
		if tt.wantErr {
			if err == nil {
				t.Errorf("parseRole(%q) accepted an invalid role", tt.in)
			}
			continue
		}
		if err != nil {
			t.Errorf("parseRole(%q): %v", tt.in, err)
			continue
		}
		if got != tt.want {
			t.Errorf("parseRole(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestMergeEnv(t *testing.T) {
	base := []string{"PATH=/bin", "STATSPARROT_ADMIN_HTTP_PORT=1111", "HOME=/root"}

	got := mergeEnv(base, map[string]string{
		"STATSPARROT_ADMIN_HTTP_PORT": "8080", // replaced in place
		"NEW_A":                       "1",    // appended
		"NEW_B":                       "2",    // appended after NEW_A
	})

	want := []string{"PATH=/bin", "STATSPARROT_ADMIN_HTTP_PORT=8080", "HOME=/root", "NEW_A=1", "NEW_B=2"}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Errorf("mergeEnv = %v, want %v", got, want)
	}

	// No key may appear twice, or the child inherits an ambiguous environment.
	seen := map[string]int{}
	for _, kv := range got {
		key, _, _ := strings.Cut(kv, "=")
		seen[key]++
	}
	for key, count := range seen {
		if count > 1 {
			t.Errorf("key %s appears %d times", key, count)
		}
	}

	// An empty override must still shadow a non-empty inherited value, which is how the
	// autoscaler is disabled.
	got = mergeEnv([]string{"STATSPARROT_ADMIN_AUTOSCALER_CRON=* * * * *"}, map[string]string{
		"STATSPARROT_ADMIN_AUTOSCALER_CRON": "",
	})
	if len(got) != 1 || got[0] != "STATSPARROT_ADMIN_AUTOSCALER_CRON=" {
		t.Errorf("mergeEnv with an empty override = %v", got)
	}
}

func TestMergeEnvKeepsValuesContainingEquals(t *testing.T) {
	got := mergeEnv([]string{"A=1"}, map[string]string{"JWKS": "a=b=c"})
	sorted := append([]string{}, got...)
	sort.Strings(sorted)
	want := []string{"A=1", "JWKS=a=b=c"}
	if strings.Join(sorted, "\n") != strings.Join(want, "\n") {
		t.Errorf("mergeEnv = %v, want %v", got, want)
	}
}

func TestCheckSecrets(t *testing.T) {
	complete := map[string]string{
		"STATSPARROT_ADMIN_SESSION_KEY_PAIRS": "abcdef",
		"STATSPARROT_ADMIN_SIGNING_JWKS":      `{"keys":[]}`,
		"STATSPARROT_ADMIN_SIGNING_KEY_ID":    "kid",
	}

	if err := checkSecrets(RoleAll, envFrom(complete)); err != nil {
		t.Errorf("checkSecrets rejected a complete configuration: %v", err)
	}
	// A runtime-only role does not need the admin's secrets.
	if err := checkSecrets(RoleRuntime, noEnv); err != nil {
		t.Errorf("checkSecrets rejected role=runtime: %v", err)
	}

	// Every missing secret is reported at once, each with the command that produces it.
	err := checkSecrets(RoleAll, envFrom(map[string]string{
		"STATSPARROT_ADMIN_SIGNING_KEY_ID": "kid",
		// An empty value counts as missing: the admin server rejects it too.
		"STATSPARROT_ADMIN_SESSION_KEY_PAIRS": "",
	}))
	if err == nil {
		t.Fatal("checkSecrets accepted an incomplete configuration")
	}
	msg := err.Error()
	for _, want := range []string{
		"STATSPARROT_ADMIN_SESSION_KEY_PAIRS",
		"STATSPARROT_ADMIN_SIGNING_JWKS",
		"openssl rand -hex 32",
		"statsparrot admin generate-signing-key",
	} {
		if !strings.Contains(msg, want) {
			t.Errorf("error message does not mention %q:\n%s", want, msg)
		}
	}
	if strings.Contains(msg, "STATSPARROT_ADMIN_SIGNING_KEY_ID") {
		t.Errorf("error message reports a secret that was provided:\n%s", msg)
	}
}

// lookupKey reads a derived value from whichever role's map holds it.
func lookupKey(env *childEnv, key string) (string, bool) {
	if v, ok := env.admin[key]; ok {
		return v, true
	}
	v, ok := env.runtime[key]
	return v, ok
}
