package file

import (
	"context"
	"errors"
	"path/filepath"

	"github.com/staticlabs/statsparrot/admin/client"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
	"github.com/staticlabs/statsparrot/runtime/drivers"
	"github.com/staticlabs/statsparrot/runtime/pkg/gitutil"
)

var errProjectNotFound = errors.New("not connected to a statsparrot project")

// loadGitConfig loads the git configuration for the repository
// Should be called with c.gitMu held.
func (c *connection) loadGitConfig(ctx context.Context) (*gitutil.Config, error) {
	if c.gitConfig != nil && !c.gitConfig.IsExpired() {
		return c.gitConfig, nil
	}

	// get authenticated admin client
	client, err := c.getAdminClient()
	if err != nil {
		return nil, err
	}

	// Build request
	req := &adminv1.ListProjectsForFingerprintRequest{
		DirectoryName: filepath.Base(c.root),
	}

	// extract subpath
	repoRoot, subpath, err := gitutil.InferRepoRootAndSubpath(c.root)
	if err == nil {
		req.SubPath = subpath
	}

	// extract remotes
	remote, err := gitutil.ExtractRemotes(repoRoot, false)
	if err == nil {
		for _, r := range remote {
			if r.Name == "__statsparrot_remote" {
				req.StatsparrotMgdGitRemote = r.URL
			} else {
				gitRemote, err := r.Github()
				if err == nil {
					req.GitRemote = gitRemote
				}
			}
		}
	}
	resp, err := client.ListProjectsForFingerprint(ctx, req)
	if err != nil {
		return nil, err
	}
	if len(resp.Projects) == 0 {
		return nil, errProjectNotFound
	}

	// filter by org
	org, err := c.dotStatsparrot.GetDefaultOrg()
	if err != nil {
		return nil, err
	}
	orgFiltered := make([]*adminv1.Project, 0)
	for _, p := range resp.Projects {
		if p.OrgName == org {
			orgFiltered = append(orgFiltered, p)
		}
	}
	if len(orgFiltered) == 0 {
		return nil, errProjectNotFound
	}
	p := orgFiltered[0]
	creds, err := client.GetCloneCredentials(ctx, &adminv1.GetCloneCredentialsRequest{
		Org:     p.OrgName,
		Project: p.Name,
	})
	if err != nil {
		return nil, err
	}

	c.gitConfig = &gitutil.Config{
		Remote:            creds.GitRepoUrl,
		Username:          creds.GitUsername,
		Password:          creds.GitPassword,
		PasswordExpiresAt: creds.GitPasswordExpiresAt.AsTime(),
		DefaultBranch:     creds.GitPrimaryBranch,
		Subpath:           creds.GitSubpath,
		ManagedRepo:       creds.GitManagedRepo,
	}
	return c.gitConfig, nil
}

func (c *connection) gitSignature(ctx context.Context, client *client.Client, path string) (gitutil.Signature, error) {
	if gitutil.IsGitRepo(path) {
		// User has git properly configured, use that.
		if sig, err := gitutil.UserSignature(ctx, path); err == nil {
			return sig, nil
		}
	}

	if client == nil {
		return gitutil.Signature{Name: "Parrot", Email: "noreply@staticlabs.com"}, nil
	}
	userResp, err := client.GetCurrentUser(ctx, &adminv1.GetCurrentUserRequest{})
	if err != nil {
		return gitutil.Signature{}, err
	}

	return gitutil.Signature{Name: userResp.User.DisplayName, Email: userResp.User.Email}, nil
}

func (c *connection) getAdminClient() (*client.Client, error) {
	if c.admin != nil {
		return c.admin, nil
	}
	accessToken, err := c.adminToken()
	if err != nil {
		return nil, err
	}
	if accessToken == "" {
		return nil, drivers.ErrNotAuthenticated
	}
	adminURL, err := c.adminURL()
	if err != nil {
		return nil, err
	}
	admin, err := client.New(adminURL, accessToken, "statsparrot-runtime")
	if err != nil {
		return nil, err
	}
	c.admin = admin
	return c.admin, nil
}

func (c *connection) adminToken() (string, error) {
	if c.driverConfig.AccessTokenOverride != "" {
		return c.driverConfig.AccessTokenOverride, nil
	}
	return c.dotStatsparrot.GetAccessToken()
}

func (c *connection) adminURL() (string, error) {
	if c.driverConfig.AdminURLOverride != "" {
		return c.driverConfig.AdminURLOverride, nil
	}
	adminURL, err := c.dotStatsparrot.GetDefaultAdminURL()
	if err != nil {
		return "", err
	}
	if adminURL == "" {
		adminURL = defaultAdminURL
	}
	return adminURL, nil
}

const defaultAdminURL = "https://admin.statsparrot.com"
