package cmd

import (
	"os"

	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"github.com/spf13/cobra"
)

// See: https://github.com/spf13/cobra/blob/main/shell_completions.md
func completionCmd(ch *cmdutil.Helper) *cobra.Command {
	return &cobra.Command{
		Use:   "completion [bash|zsh|fish|powershell]",
		Short: "Generate completion script for your shell",
		Long: `To load completions:
Bash:
  $ source <(statsparrot completion bash)
  # To load completions for each session, execute once:
  # Linux:
  $ statsparrot completion bash > /etc/bash_completion.d/statsparrot
  # macOS:
  $ statsparrot completion bash > /usr/local/etc/bash_completion.d/statsparrot
Zsh:
  # If shell completion is not already enabled in your environment,
  # you will need to enable it.  You can execute the following once:
  $ echo "autoload -U compinit; compinit" >> ~/.zshrc
  # To load completions for each session, execute once:
  $ statsparrot completion zsh > "${fpath[1]}/_statsparrot"
  # You will need to start a new shell for this setup to take effect.
fish:
  $ statsparrot completion fish | source
  # To load completions for each session, execute once:
  $ statsparrot completion fish > ~/.config/fish/completions/statsparrot.fish
PowerShell:
  PS> statsparrot completion powershell | Out-String | Invoke-Expression
  # To load completions for every new session, run:
  PS> statsparrot completion powershell > statsparrot.ps1
  # and source this file from your PowerShell profile.
`,
		DisableFlagsInUseLine: true,
		Hidden:                !ch.IsDev(),
		ValidArgs:             []string{"bash", "zsh", "fish", "powershell"},
		Args:                  cobra.MatchAll(cobra.ExactArgs(1), cobra.OnlyValidArgs),
		RunE: func(cmd *cobra.Command, args []string) error {
			var err error

			switch args[0] {
			case "bash":
				err = cmd.Root().GenBashCompletion(os.Stdout)
			case "zsh":
				err = cmd.Root().GenZshCompletion(os.Stdout)
			case "fish":
				err = cmd.Root().GenFishCompletion(os.Stdout, true)
			case "powershell":
				err = cmd.Root().GenPowerShellCompletionWithDesc(os.Stdout)
			}

			return err
		},
	}
}
