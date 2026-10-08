package docs

import (
	"fmt"

	"github.com/staticlabs/statsparrot/cli/pkg/browser"
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/spf13/cobra"
)

var docsURL = "https://docs.statsparrot.com"

func DocsCmd(ch *cmdutil.Helper, rootCmd *cobra.Command) *cobra.Command {
	docsCmd := &cobra.Command{
		Use:   "docs",
		Short: "Open docs.statsparrot.com",
		Run: func(cmd *cobra.Command, args []string) {
			err := browser.Open(docsURL)
			if err != nil {
				fmt.Printf("Could not open browser. Copy this URL into your browser: %s\n", docsURL)
			}
		},
	}
	docsCmd.AddCommand(GenerateCliDocsCmd(rootCmd, ch))
	docsCmd.AddCommand(GenerateProjectDocsCmd(rootCmd, ch))

	return docsCmd
}
