package superuser

import (
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
	"github.com/spf13/cobra"
)

func RemoveCmd(ch *cmdutil.Helper) *cobra.Command {
	removeCmd := &cobra.Command{
		Use:   "remove <email>",
		Args:  cobra.ExactArgs(1),
		Short: "Remove a superuser",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			client, err := ch.Client()
			if err != nil {
				return err
			}

			_, err = client.SetSuperuser(ctx, &adminv1.SetSuperuserRequest{
				Email:     args[0],
				Superuser: false,
			})
			if err != nil {
				return err
			}

			ch.PrintfSuccess("Removed superuser from %q\n", args[0])

			return nil
		},
	}

	return removeCmd
}
