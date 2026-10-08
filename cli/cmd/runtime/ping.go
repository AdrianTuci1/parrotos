package runtime

import (
	"fmt"
	"time"

	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	runtimev1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/runtime/v1"
	"github.com/staticlabs/statsparrot/runtime/client"
	"github.com/spf13/cobra"
)

func PingCmd(ch *cmdutil.Helper) *cobra.Command {
	var runtimeURL string

	pingCmd := &cobra.Command{
		Use:   "ping",
		Short: "Ping",
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := client.New(runtimeURL, "")
			if err != nil {
				return err
			}
			defer client.Close()

			ch.Printf("Ping: %s\n", time.Now().UTC().String())

			pong, err := client.Ping(cmd.Context(), &runtimev1.PingRequest{})
			if err != nil {
				return err
			}

			fmt.Printf("Pong: %s\n", pong.Time.AsTime().String())
			return nil
		},
	}

	pingCmd.Flags().StringVar(&runtimeURL, "url", "http://localhost:49009", "Base URL for the runtime")

	return pingCmd
}
