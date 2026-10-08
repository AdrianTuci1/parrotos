package superuser

import (
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
	"github.com/spf13/cobra"
)

func ListCmd(ch *cmdutil.Helper) *cobra.Command {
	listCmd := &cobra.Command{
		Use:   "list",
		Args:  cobra.NoArgs,
		Short: "List superusers",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			client, err := ch.Client()
			if err != nil {
				return err
			}

			res, err := client.ListSuperusers(ctx, &adminv1.ListSuperusersRequest{})
			if err != nil {
				return err
			}

			ch.PrintUsers(res.Users)

			return nil
		},
	}
	return listCmd
}
