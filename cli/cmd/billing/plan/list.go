package plan

import (
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
	"github.com/spf13/cobra"
)

func ListCmd(ch *cmdutil.Helper) *cobra.Command {
	listCmd := &cobra.Command{
		Use:   "list",
		Short: "List plans",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			client, err := ch.Client()
			if err != nil {
				return err
			}

			resp, err := client.ListPublicBillingPlans(ctx, &adminv1.ListPublicBillingPlansRequest{})
			if err != nil {
				return err
			}

			if len(resp.Plans) == 0 {
				ch.PrintfWarn("No plans found\n")
				return nil
			}

			ch.PrintPlans(resp.Plans)
			return nil
		},
	}

	return listCmd
}
