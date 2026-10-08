package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The admin UI is only embedded when the binary is built with the UI output present
// (make admin-ui). In a plain `go build`/`go test` the embed directory holds the
// placeholder page, which is what these tests exercise.

func TestHandlerServesEmbeddedUIIndex(t *testing.T) {
	h := StaticHandler(Options{})

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", http.NoBody))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 at /, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Fatalf("expected an HTML response, got Content-Type %q", ct)
	}
}

func TestHandlerServesClientSideRoutes(t *testing.T) {
	h := StaticHandler(Options{})

	// Routes like /[organization]/[project] are handled by the SPA, so a hard refresh
	// must return the entrypoint rather than a 404.
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/my-org/my-project", http.NoBody))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for a client-side route, got %d", rec.Code)
	}
}

func TestHandlerAppliesExtraHeadersToHTML(t *testing.T) {
	h := StaticHandler(Options{ExtraHeaders: map[string]string{"Content-Security-Policy": "frame-ancestors 'self'"}})

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", http.NoBody))

	if got := rec.Header().Get("Content-Security-Policy"); got != "frame-ancestors 'self'" {
		t.Fatalf("expected the configured header, got %q", got)
	}
	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("expected nosniff, got %q", got)
	}
}
