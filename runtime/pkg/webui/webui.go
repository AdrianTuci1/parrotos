// Package webui serves the single-page web applications that are embedded into the Go
// binaries at build time: the project UI served by `statsparrot start` and the hosted
// admin UI served by the admin server.
//
// The SvelteKit builds use @sveltejs/adapter-static with a fallback page, so the server
// must serve index.html for paths that do not resolve to a file. Hashed assets under
// _app/immutable can be cached forever; everything else is served with no-store.
package webui

import (
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/NYTimes/gziphandler"
)

// immutablePrefix is the path prefix under which SvelteKit writes content-hashed assets.
const immutablePrefix = "_app/immutable/"

// Options configures Handler.
type Options struct {
	// ExtraHeaders are set on non-asset (HTML) responses. Use it for headers that cannot be
	// expressed with a <meta> tag, such as Content-Security-Policy with frame-ancestors.
	ExtraHeaders map[string]string
	// DisableCompression turns off response compression. Intended for tests.
	DisableCompression bool
}

// Handler returns an http.Handler serving the SPA rooted at assets, which must contain
// index.html at its root.
func Handler(assets fs.FS, opts Options) http.Handler {
	fileServer := http.FileServer(&spaFileSystem{assets: http.FS(assets)})

	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		if isImmutable(path.Clean(r.URL.Path)) {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			// Responses without a content hash may be index.html, a version file, or an
			// unhashed asset that changes between releases. Never let them be cached.
			w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
			for name, value := range opts.ExtraHeaders {
				w.Header().Set(name, value)
			}
		}

		fileServer.ServeHTTP(w, r)
	})

	if opts.DisableCompression {
		return h
	}
	return gziphandler.GzipHandler(h)
}

// Sub returns the subtree of an embedded filesystem. It stats the directory first so that
// a missing build output fails here with a clear message instead of on the first request.
func Sub(embeddedFS fs.FS, dir string) (fs.FS, error) {
	if _, err := fs.Stat(embeddedFS, dir); err != nil {
		return nil, fmt.Errorf("webui: embedded UI directory %q not found: %w", dir, err)
	}
	return fs.Sub(embeddedFS, dir)
}

// isImmutable reports whether the given request path points at a hashed asset.
func isImmutable(p string) bool {
	return strings.HasPrefix(strings.TrimPrefix(p, "/"), immutablePrefix)
}

// spaFileSystem serves index.html for paths that look like client-side routes.
// Paths with a file extension are left alone so that a missing asset returns 404 instead
// of an HTML page with a 200 status, which would break content-type expectations.
type spaFileSystem struct {
	assets http.FileSystem
}

var _ http.FileSystem = (*spaFileSystem)(nil)

func (s *spaFileSystem) Open(name string) (http.File, error) {
	f, err := s.assets.Open(name)
	if err == nil {
		return f, nil
	}
	if !errors.Is(err, fs.ErrNotExist) {
		return nil, err
	}

	// Fall back to the SPA entrypoint for extensionless paths only.
	if name != "/" && path.Ext(name) != "" {
		return nil, err
	}

	return s.assets.Open("/index.html")
}
