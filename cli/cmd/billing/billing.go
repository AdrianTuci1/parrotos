package billing

import (
	"github.com/staticlabs/statsparrot/cli/cmd/billing/plan"
	"github.com/staticlabs/statsparrot/cli/cmd/billing/subscription"
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/spf13/cobra"
)

func BillingCmd(ch *cmdutil.Helper) *cobra.Command {
	billingCmd := &cobra.Command{
		Use:   "billing",
		Short: "Billing related commands for org",
	}

	billingCmd.AddCommand(subscription.SubscriptionCmd(ch))
	billingCmd.AddCommand(plan.PlanCmd(ch))
	billingCmd.AddCommand(ListIssuesCmd(ch))

	return billingCmd
}
