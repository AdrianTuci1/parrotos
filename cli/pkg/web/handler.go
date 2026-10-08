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

// StaticHandler serves the web-local UI.
func StaticHandler() http.Handler {
	return webui.Handler(uiAssetFS(), webui.Options{})
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
