package local

import (
	"context"
	"fmt"

	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/staticlabs/statsparrot/runtime/parser"
)

func ParseDotenv(ctx context.Context, projectPath string) (map[string]string, error) {
	repo, instanceID, err := cmdutil.RepoForProjectPath(projectPath)
	if err != nil {
		return nil, err
	}
	p, err := parser.Parse(ctx, repo, instanceID, "prod", "duckdb", true)
	if err != nil {
		return nil, err
	}
	if p.ParrotYAML == nil {
		return nil, fmt.Errorf("not a valid Parrot project (missing a statsparrot.yaml file)")
	}

	return p.GetDotEnv(), nil
}
