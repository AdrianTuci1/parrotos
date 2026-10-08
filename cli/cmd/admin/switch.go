package admin

import (
	"errors"

	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/spf13/cobra"
)

func SwitchCmd(ch *cmdutil.Helper) *cobra.Command {
	switchCmd := &cobra.Command{
		Use:   "switch {stage|prod|dev}",
		Short: "switch",
		RunE: func(cmd *cobra.Command, args []string) error {
			return errors.New("this command has been deprecated (use `statsparrot devtool switch-env` instead)")
		},
	}

	return switchCmd
}
