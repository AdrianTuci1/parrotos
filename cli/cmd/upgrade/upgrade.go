package upgrade

import (
	goversion "github.com/hashicorp/go-version"
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/staticlabs/statsparrot/cli/pkg/installscript"
	"github.com/spf13/cobra"
)

func UpgradeCmd(ch *cmdutil.Helper) *cobra.Command {
	var version string
	var nightly bool

	upgradeCmd := &cobra.Command{
		Use:   "upgrade",
		Short: "Upgrade Parrot to the latest version",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			if version != "" {
				// Parse the version into the canonical form
				v, err := goversion.NewVersion(version)
				if err != nil {
					return err
				}
				version = "v" + v.String()

				return installscript.Install(cmd.Context(), version)
			}

			if nightly {
				return installscript.Install(cmd.Context(), "nightly")
			}

			return installscript.Install(cmd.Context(), "")
		},
	}

	upgradeCmd.Flags().StringVar(&version, "version", "", "Install a specific version of Parrot")
	upgradeCmd.Flags().BoolVar(&nightly, "nightly", false, "Install the latest nightly build")

	return upgradeCmd
}
