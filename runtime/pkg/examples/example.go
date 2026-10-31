package examples

import (
	"embed"
	"errors"
	"io/fs"
	"path"

	"gopkg.in/yaml.v2"
)

//go:embed all:embed
var examplesFS embed.FS

// exampleDirs are searched in order. Projects we ship in the repository live in
// "local" so they work even when the optional examples repository cannot be cloned.
var exampleDirs = []string{"embed/local", "embed/dist"}

var ErrExampleNotFound = errors.New("example not found")

type Example struct {
	Name          string
	DisplayName   string
	Description   string
	OLAPConnector string
}

func List() ([]Example, error) {
	exampleList := make([]Example, 0)
	seen := make(map[string]bool)

	for _, dir := range exampleDirs {
		entries, err := examplesFS.ReadDir(dir)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				continue
			}
			return nil, err
		}

		for _, entry := range entries {
			if !entry.IsDir() || seen[entry.Name()] {
				continue
			}

			statsparrotYamlContents, err := examplesFS.ReadFile(path.Join(dir, entry.Name(), "statsparrot.yaml"))
			if err != nil {
				return nil, err
			}

			contents := struct {
				DisplayName   string `yaml:"display_name"`
				Title         string `yaml:"title"`
				Description   string `yaml:"description"`
				OLAPConnector string `yaml:"olap_connector"`
			}{}
			if err := yaml.Unmarshal(statsparrotYamlContents, &contents); err != nil {
				return nil, err
			}
			if contents.DisplayName == "" { // Backwards compatibility
				contents.DisplayName = contents.Title
			}
			if contents.OLAPConnector == "" {
				contents.OLAPConnector = "duckdb"
			}

			seen[entry.Name()] = true
			exampleList = append(exampleList, Example{
				Name:          entry.Name(),
				DisplayName:   contents.DisplayName,
				Description:   contents.Description,
				OLAPConnector: contents.OLAPConnector,
			})
		}
	}

	return exampleList, nil
}

func Get(name string) (fs.FS, error) {
	if !fs.ValidPath(name) || name == "." {
		return nil, ErrExampleNotFound
	}

	for _, dir := range exampleDirs {
		exampleFS, err := fs.Sub(examplesFS, path.Join(dir, name))
		if err != nil {
			continue
		}

		if _, err := fs.Stat(exampleFS, "statsparrot.yaml"); err == nil {
			return exampleFS, nil
		} else if !errors.Is(err, fs.ErrNotExist) {
			return nil, err
		}
	}

	return nil, ErrExampleNotFound
}
