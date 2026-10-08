package publicurl

import (
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
	"github.com/spf13/cobra"
)

func DeleteCmd(ch *cmdutil.Helper) *cobra.Command {
	deleteCmd := &cobra.Command{
		Use:   "delete <id>",
		Short: "Delete a public URL",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := ch.Client()
			if err != nil {
				return err
			}

			_, err = client.RevokeMagicAuthToken(cmd.Context(), &adminv1.RevokeMagicAuthTokenRequest{
				TokenId: args[0],
			})
			if err != nil {
				return err
			}

			return nil
		},
	}
	return deleteCmd
}
