package web

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"

	"github.com/staticlabs/statsparrot/runtime/pkg/webui"
)

//go:embed all:embed
var distFS embed.FS

// Options configures the handler for the hosted admin UI.
type Options struct {
	// ExtraHeaders are set on HTML responses only. Use it for security headers that cannot
	// be expressed with a <meta> tag, such as Content-Security-Policy with frame-ancestors.
	ExtraHeaders map[string]string
}

// StaticHandler serves the hosted admin UI. When the UI was not built into the binary
// (API-only deployments), it serves a placeholder page instead.
func StaticHandler(opts Options) http.Handler {
	return webui.Handler(uiAssetFS(), webui.Options{ExtraHeaders: opts.ExtraHeaders})
}

// uiAssetFS returns the built UI, or the placeholder page if the UI was not built.
func uiAssetFS() fs.FS {
	if _, err := distFS.ReadFile("embed/dist/index.html"); err == nil {
		return mustSub("embed/dist")
	}
	return mustSub("embed")
}

func mustSub(dir string) fs.FS {
	sub, err := webui.Sub(distFS, dir)
	if err != nil {
		panic(fmt.Errorf("fs embed: %w", err))
	}
	return sub
}
