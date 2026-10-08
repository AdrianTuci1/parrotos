package parser

import (
	"context"
	"fmt"
	"strings"

	"github.com/staticlabs/statsparrot/runtime/drivers"
)

// IsInit returns true if a Parrot project exists in the repo
func IsInit(ctx context.Context, repo drivers.RepoStore, instanceID string) bool {
	_, err := ParseParrotYAML(ctx, repo, instanceID)
	return err == nil
}

// InitEmpty initializes an empty project
func InitEmpty(ctx context.Context, repo drivers.RepoStore, instanceID, displayName, olap string) error {
	// If display name doesn't start with a letter, quote it
	if !isAlphabetic(displayName[0]) {
		displayName = fmt.Sprintf("%q", displayName)
	}

	// If olap is not specified we can default to duckdb
	if olap == "" {
		olap = "duckdb"
	}

	statsparrotYAML := fmt.Sprintf(`compiler: %s

display_name: %s

# The project's default OLAP connector.
# Learn more: https://docs.statsparrot.com/reference/olap-engines
olap_connector: %s

# These are example mock users to test your security policies.
# Learn more: https://docs.statsparrot.com/developers/build/statsparrot-project-file#test-access-policies-in-statsparrot-developer
mock_users:
- email: john@yourcompany.com
- email: jane@partnercompany.com

features:
  cloud_editing: true
`, Version, displayName, olap)

	err := repo.Put(ctx, "statsparrot.yaml", strings.NewReader(statsparrotYAML))
	if err != nil {
		return err
	}

	// Create the connector YAML
	var connectorYAML string
	switch olap {
	case "duckdb":
		connectorYAML = `type: connector

driver: duckdb
managed: true
`
	case "clickhouse":
		connectorYAML = `type: connector

driver: clickhouse
managed: true
`
	default:
		connectorYAML = fmt.Sprintf(`type: connector
driver: %s

# TODO: Configure the connection.
`, olap)
	}

	err = repo.Put(ctx, fmt.Sprintf("connectors/%s.yaml", olap), strings.NewReader(connectorYAML))
	if err != nil {
		return err
	}

	gitignore, _ := repo.Get(ctx, ".gitignore")
	if gitignore != "" {
		gitignore += "\n"
	}
	gitignore += ".DS_Store\n\n# Parrot\n.env\ntmp\n"

	err = repo.Put(ctx, ".gitignore", strings.NewReader(gitignore))
	if err != nil {
		return err
	}

	return nil
}

func isAlphabetic(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}
