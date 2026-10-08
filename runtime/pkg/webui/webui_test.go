package webui

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

const shellMarker = "<title>Parrot UI</title>"

// shell is padded past gziphandler's minimum size so that compression is exercised.
func shell() string {
	padding := strings.Repeat("<!-- a padding comment so the shell is worth compressing -->", 40)
	return "<!DOCTYPE html><html><head>" + shellMarker + "</head><body>" + padding + "</body></html>"
}

func testAssets() fstest.MapFS {
	return fstest.MapFS{
		"index.html":                {Data: []byte(shell())},
		"_app/immutable/chunk.js":   {Data: []byte("console.log('hashed');")},
		"_app/immutable/chunk.css":  {Data: []byte("body{margin:0}")},
		"favicon.ico":               {Data: []byte("icon")},
		"version.json":              {Data: []byte(`{"version":"test"}`)},
		"nested/with.extension.png": {Data: []byte("png")},
	}
}

func do(t *testing.T, h http.Handler, method, target string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(method, target, http.NoBody)
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestServeIndexAndRoutes(t *testing.T) {
	h := Handler(testAssets(), Options{DisableCompression: true})

	for _, target := range []string{"/", "/explore", "/org/project/dashboards/sales"} {
		rec := do(t, h, http.MethodGet, target, nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("GET %s: expected 200, got %d", target, rec.Code)
		}
		if !strings.Contains(rec.Body.String(), shellMarker) {
			t.Fatalf("GET %s: expected the SPA shell, got %q", target, rec.Body.String())
		}
		if got := rec.Header().Get("Cache-Control"); !strings.Contains(got, "no-store") {
			t.Fatalf("GET %s: expected no-store, got %q", target, got)
		}
	}
}

func TestMissingAssetIsNotFound(t *testing.T) {
	h := Handler(testAssets(), Options{DisableCompression: true})

	for _, target := range []string{"/missing.png", "/_app/immutable/missing.js", "/nested/missing.extension.png"} {
		rec := do(t, h, http.MethodGet, target, nil)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("GET %s: expected 404, got %d", target, rec.Code)
		}
	}
}

func TestHashedAssetsAreImmutable(t *testing.T) {
	h := Handler(testAssets(), Options{DisableCompression: true})

	rec := do(t, h, http.MethodGet, "/_app/immutable/chunk.js", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if got := rec.Header().Get("Cache-Control"); !strings.Contains(got, "immutable") {
		t.Fatalf("expected an immutable Cache-Control, got %q", got)
	}
	if body, _ := io.ReadAll(rec.Body); !strings.Contains(string(body), "hashed") {
		t.Fatalf("expected the asset body, got %q", body)
	}
}

func TestUnhashedAssetsAreNotCached(t *testing.T) {
	h := Handler(testAssets(), Options{DisableCompression: true})

	for _, target := range []string{"/version.json", "/favicon.ico"} {
		rec := do(t, h, http.MethodGet, target, nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("GET %s: expected 200, got %d", target, rec.Code)
		}
		if got := rec.Header().Get("Cache-Control"); !strings.Contains(got, "no-store") {
			t.Fatalf("GET %s: expected no-store, got %q", target, got)
		}
	}
}

func TestExtraHeadersApplyToHTMLResponsesOnly(t *testing.T) {
	h := Handler(testAssets(), Options{
		DisableCompression: true,
		ExtraHeaders: map[string]string{
			"Content-Security-Policy": "frame-ancestors 'self'",
		},
	})

	rec := do(t, h, http.MethodGet, "/explore", nil)
	if got := rec.Header().Get("Content-Security-Policy"); got != "frame-ancestors 'self'" {
		t.Fatalf("expected the configured CSP on an HTML response, got %q", got)
	}
	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("expected nosniff, got %q", got)
	}

	rec = do(t, h, http.MethodGet, "/_app/immutable/chunk.js", nil)
	if got := rec.Header().Get("Content-Security-Policy"); got != "" {
		t.Fatalf("expected no CSP on an asset response, got %q", got)
	}
}

func TestCompressionIsEnabledByDefault(t *testing.T) {
	h := Handler(testAssets(), Options{})

	rec := do(t, h, http.MethodGet, "/", map[string]string{"Accept-Encoding": "gzip"})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if got := rec.Header().Get("Content-Encoding"); got != "gzip" {
		t.Fatalf("expected a gzip response, got Content-Encoding %q", got)
	}
}

func TestSubReportsMissingDirectory(t *testing.T) {
	if _, err := Sub(testAssets(), "does-not-exist"); err == nil {
		t.Fatal("expected an error for a missing directory")
	}
	if _, err := Sub(testAssets(), "_app"); err != nil {
		t.Fatalf("expected no error for an existing directory, got %v", err)
	}
}
