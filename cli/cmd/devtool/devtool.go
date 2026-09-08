package devtool

import (
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/spf13/cobra"
)

func DevtoolCmd(ch *cmdutil.Helper) *cobra.Command {
	internalGroupID := ""
	devtoolCmd := &cobra.Command{
		Use:   "devtool",
		Short: "Utilities for developing Parrot",
		Example: `  statsparrot devtool start cloud
  statsparrot devtool seed cloud
  statsparrot devtool start cloud --reset
  statsparrot devtool start cloud --except runtime
  statsparrot devtool start cloud --only admin,deps
  statsparrot devtool start local
  statsparrot devtool start local --reset
  statsparrot devtool switch-env stage
  statsparrot devtool dotenv upload cloud`,
		Hidden:  !ch.IsDev(),
		GroupID: internalGroupID,
	}

	devtoolCmd.AddCommand(StartCmd(ch))
	devtoolCmd.AddCommand(SeedCmd(ch))
	devtoolCmd.AddCommand(DotenvCmd(ch))
	devtoolCmd.AddCommand(SwitchEnvCmd(ch))
	devtoolCmd.AddCommand(SubscriptionCmd(ch))

	return devtoolCmd
}
