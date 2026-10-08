package uninstall

import (
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/staticlabs/statsparrot/cli/pkg/installscript"
	"github.com/spf13/cobra"
)

func UninstallCmd(ch *cmdutil.Helper) *cobra.Command {
	return &cobra.Command{
		Use:   "uninstall",
		Short: "Uninstall the Parrot binary",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return installscript.Uninstall(cmd.Context())
		},
	}
}
