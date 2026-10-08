// Command embed_duckdb_ext downloads the DuckDB extensions that Parrot needs and
// writes them, gzipped, into runtime/drivers/duckdb/extensions/embed/<platform>/<duckdb_version>/.
//
// The runtime embeds whatever is present there (see runtime/drivers/duckdb/extensions)
// and installs it into the DuckDB extension cache on first run. Building without having
// run this script leaves the embed directories empty, which makes the build fail because
// the go:embed patterns match no files.
//
// Deployments that do not use DuckDB as a data engine only need the extensions used
// internally: "json" for the SQL parser (runtime/pkg/duckdbsql) and "parquet" for pivots
// on warehouses without native PIVOT support (runtime/metricsview/executor/executor_pivot.go).
// Override the list with STATSPARROT_DUCKDB_EXTENSIONS, for example:
//
//	STATSPARROT_DUCKDB_EXTENSIONS=json,parquet STATSPARROT_DUCKDB_PLATFORMS=linux_arm64 \
//	  go run scripts/embed_duckdb_ext/main.go
package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/duckdb/duckdb-go/v2"
)

// defaultExtensions are the DuckDB extensions Parrot depends on.
var defaultExtensions = []string{"json", "icu", "parquet", "httpfs", "sqlite_scanner", "spatial", "motherduck"}

// defaultPlatforms are the DuckDB platform names to download extensions for.
// They must match what "PRAGMA platform" reports, because that is how the runtime
// looks the embedded files up at install time.
var defaultPlatforms = []string{"linux_amd64", "linux_arm64", "osx_amd64", "osx_arm64", "windows_amd64"}

// embedDirRoot is the root of the embed directory tree, relative to the repository root.
const embedDirRoot = "runtime/drivers/duckdb/extensions/embed"

const defaultBaseURL = "https://extensions.duckdb.org"

func main() {
	log.SetFlags(0)

	baseURL := envOr("STATSPARROT_DUCKDB_EXTENSIONS_BASE_URL", defaultBaseURL)
	extensions := envList("STATSPARROT_DUCKDB_EXTENSIONS", defaultExtensions)
	platforms := envList("STATSPARROT_DUCKDB_PLATFORMS", defaultPlatforms)

	// Connect to DuckDB and get the version the embedded extensions must match.
	db, err := sql.Open("duckdb", "")
	if err != nil {
		log.Fatalf("failed to connect to DuckDB: %v", err)
	}
	defer db.Close()

	var duckdbVersion string
	if err := db.QueryRow("SELECT version();").Scan(&duckdbVersion); err != nil {
		log.Fatalf("failed to get DuckDB version: %v", err)
	}

	log.Printf("DuckDB version %s, extensions %s, platforms %s", duckdbVersion, strings.Join(extensions, ","), strings.Join(platforms, ","))

	client := &http.Client{Timeout: 5 * time.Minute}

	for _, platform := range platforms {
		destDir := filepath.Join(embedDirRoot, platform, duckdbVersion)
		if err := os.MkdirAll(destDir, os.ModePerm); err != nil {
			log.Fatalf("failed to create destination directory %s: %v", destDir, err)
		}

		for _, extension := range extensions {
			destPath := filepath.Join(destDir, fmt.Sprintf("%s.duckdb_extension.gz", extension))
			// Extensions are large and version-scoped. Reuse what is already there so
			// repeated builds only fetch what is missing.
			if _, err := os.Stat(destPath); err == nil {
				log.Printf("kept %s", destPath)
				continue
			}

			url := fmt.Sprintf("%s/%s/%s/%s.duckdb_extension.gz", baseURL, duckdbVersion, platform, extension)
			if err := downloadFile(client, url, destPath); err != nil {
				log.Fatalf("failed to download %s: %v", url, err)
			}
			log.Printf("downloaded %s", destPath)
		}
	}

	log.Print("All DuckDB extensions are in place.")
}

// downloadFile downloads a file from a URL and saves it to a destination path.
func downloadFile(client *http.Client, url, dest string) error {
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("failed to perform HTTP GET request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected HTTP status: %s", resp.Status)
	}

	// Write to a temporary file first so an interrupted download does not leave a
	// truncated extension behind that later builds would treat as complete.
	tmp, err := os.CreateTemp(filepath.Dir(dest), ".download-*")
	if err != nil {
		return fmt.Errorf("failed to create temporary file: %w", err)
	}
	defer func() {
		_ = os.Remove(tmp.Name())
	}()

	if _, err := io.Copy(tmp, resp.Body); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("failed to copy response body to file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("failed to close temporary file: %w", err)
	}

	if err := os.Rename(tmp.Name(), dest); err != nil {
		return fmt.Errorf("failed to move temporary file into place: %w", err)
	}

	return nil
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envList(key string, fallback []string) []string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}

	var res []string
	for _, item := range strings.Split(v, ",") {
		if item = strings.TrimSpace(item); item != "" {
			res = append(res, item)
		}
	}
	if len(res) == 0 {
		return fallback
	}
	return res
}
