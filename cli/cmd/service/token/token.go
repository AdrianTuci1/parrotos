package token

import (
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/spf13/cobra"
)

func TokenCmd(ch *cmdutil.Helper) *cobra.Command {
	tokenCmd := &cobra.Command{
		Use:               "token",
		Short:             "Manage service tokens",
		PersistentPreRunE: cmdutil.CheckChain(cmdutil.CheckAuth(ch), cmdutil.CheckOrganization(ch)),
	}

	tokenCmd.AddCommand(ListCmd(ch))
	tokenCmd.AddCommand(IssueCmd(ch))
	tokenCmd.AddCommand(RevokeCmd(ch))

	return tokenCmd
}
