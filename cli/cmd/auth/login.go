package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/staticlabs/statsparrot/cli/pkg/browser"
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/staticlabs/statsparrot/cli/pkg/deviceauth"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
	"github.com/staticlabs/statsparrot/runtime/pkg/activity"
	"github.com/spf13/cobra"
)

// LoginCmd is the command for logging into a Parrot account.
func LoginCmd(ch *cmdutil.Helper) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "login",
		Short: "Authenticate with the Parrot API",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			// Logout if already logged in
			if ch.AdminTokenDefault != "" {
				err := Logout(ctx, ch)
				if err != nil {
					return err
				}
			}

			// Login user
			err := Login(ctx, ch, "")
			if err != nil {
				return err
			}

			// Set default org after login
			err = SelectOrgFlow(ctx, ch, false)
			if err != nil {
				return err
			}

			return nil
		},
	}

	return cmd
}

func Login(ctx context.Context, ch *cmdutil.Helper, redirectURL string) error {
	authURL := ch.AdminURL()

	authenticator, err := deviceauth.New(authURL)
	if err != nil {
		return err
	}

	deviceVerification, err := authenticator.VerifyDevice(ctx, redirectURL)
	if err != nil {
		return err
	}

	ch.PrintfBold("\nConfirmation Code: ")
	ch.PrintfSuccess("%s\n", deviceVerification.UserCode)

	ch.PrintfBold("\nOpen this URL in your browser to confirm the login: %s\n\n", deviceVerification.VerificationCompleteURL)

	if ch.Interactive {
		_ = browser.Open(deviceVerification.VerificationCompleteURL)
	}

	res1, err := authenticator.GetAccessTokenForDevice(ctx, deviceVerification)
	if err != nil {
		return err
	}

	err = ch.DotStatsparrot.SetAccessToken(res1.AccessToken)
	if err != nil {
		return err
	}

	err = ch.ReloadAdminConfig()
	if err != nil {
		return err
	}

	ch.PrintfBold("Successfully logged in. Welcome to Parrot!\n")
	return nil
}

func LoginWithTelemetry(ctx context.Context, ch *cmdutil.Helper, redirectURL string) error {
	ch.PrintfBold("Please log in or sign up for Parrot. Opening browser...\n")
	select {
	case <-time.After(2 * time.Second):
	case <-ctx.Done():
		return ctx.Err()
	}

	ch.Telemetry(ctx).RecordBehavioralLegacy(activity.BehavioralEventLoginStart)

	if err := Login(ctx, ch, redirectURL); err != nil {
		if errors.Is(err, deviceauth.ErrAuthenticationTimedout) {
			ch.PrintfWarn("Parrot login has timed out as the code was not confirmed in the browser.\n")
			ch.PrintfWarn("Run the command again.\n")
			return nil
		} else if errors.Is(err, deviceauth.ErrCodeRejected) {
			ch.PrintfError("Login failed: Confirmation code rejected\n")
			return nil
		}
		return fmt.Errorf("login failed: %w", err)
	}

	// The cmdutil.Helper automatically detects the login and will add the user's ID to the telemetry.
	ch.Telemetry(ctx).RecordBehavioralLegacy(activity.BehavioralEventLoginSuccess)

	return nil
}

func SelectOrgFlow(ctx context.Context, ch *cmdutil.Helper, forceNoninteractive bool) error {
	interactive := ch.Interactive && !forceNoninteractive

	client, err := ch.Client()
	if err != nil {
		return err
	}

	res, err := client.ListOrganizations(ctx, &adminv1.ListOrganizationsRequest{
		PageSize: 1000,
	})
	if err != nil {
		return err
	}

	if len(res.Organizations) == 0 {
		ch.PrintfWarn("You are not part of an org. Run `statsparrot org create` to create one.\n")
		return nil
	}

	var orgNames []string
	for _, org := range res.Organizations {
		orgNames = append(orgNames, org.Name)
	}

	defaultOrg := orgNames[0]
	if interactive && len(orgNames) > 1 {
		defaultOrg, err = cmdutil.SelectPrompt("Select default org", orgNames, defaultOrg)
		if err != nil {
			return err
		}
	}

	err = ch.DotStatsparrot.SetDefaultOrg(defaultOrg)
	if err != nil {
		return err
	}
	ch.Org = defaultOrg

	ch.Printf("Set default org to %q (hint: to change, run `statsparrot org switch`).\n", defaultOrg)
	return nil
}
