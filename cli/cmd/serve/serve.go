package serve

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
	"github.com/spf13/cobra"
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Config describes the serve command's configuration.
// Env var keys must be prefixed with STATSPARROT_SERVE_ and are converted from snake_case to
// CamelCase. For example STATSPARROT_SERVE_PUBLIC_URL is mapped to Config.PublicURL.
//
// Only the settings that are shared between the admin server and the runtime live here.
// Everything specific to one of them (the database, secrets, OIDC, SMTP, buckets, AI keys) is
// read by the child process from its own STATSPARROT_ADMIN_* or STATSPARROT_RUNTIME_*
// variables, exactly as it would be for a non-serving deployment.
type Config struct {
	// Role selects which processes to run: "all", "admin" or "runtime".
	Role string `default:"all" split_words:"true"`
	// PublicURL is the origin the deployment is reachable on, for example
	// "https://bi.example.com". It is the single source of truth for the admin's external
	// URL, the frontend URL, the token issuer and the allowed origins.
	PublicURL string `required:"true" split_words:"true"`
	// HTTPPort is the public listener. The admin server (API, web UI and runtime proxy)
	// binds it.
	HTTPPort int `default:"8080" split_words:"true"`
	// RuntimePort is the runtime's private listener.
	RuntimePort int `default:"9009" split_words:"true"`
	// RuntimeTarget is the URL the admin server uses to reach the runtime. Defaults to the
	// loopback address on RuntimePort; set it when the runtime runs in another container.
	RuntimeTarget string `split_words:"true"`
	// RuntimePath is the path prefix on the public URL under which runtimes are exposed.
	RuntimePath string `default:"/runtime" split_words:"true"`
	// RuntimeDataDir holds per-project data (DuckDB files, downloaded sources) and the
	// metastore. It must be on persistent storage.
	RuntimeDataDir string `default:"./data" split_words:"true"`
	// RuntimeSlots is the number of deployments a single runtime accepts.
	RuntimeSlots int `default:"1000" split_words:"true"`
	// DrainTimeout is how long to wait for a child process to shut down gracefully before
	// it is killed.
	DrainTimeout time.Duration `default:"30s" split_words:"true"`
	LogLevel     zapcore.Level `default:"info" split_words:"true"`
}

// MetastoreURL is the SQLite metastore location. It defaults to a file in RuntimeDataDir so
// that deployments and instances survive a restart.
func (c Config) MetastoreURL() string {
	return filepath.Join(c.RuntimeDataDir, "metastore.db")
}

// ServeCmd runs the admin server and the runtime in one process group.
//
// It starts itself once per role, so each role keeps its own process: one crashing or being
// killed by the kernel (DuckDB runs cgo code in-process) does not take the other down, and
// each keeps its own metrics registry and log stream.
func ServeCmd(ch *cmdutil.Helper) *cobra.Command {
	var roleFlag string

	serveCmd := &cobra.Command{
		Use:   "serve",
		Short: "Run the hosted admin server and runtime together",
		Long: `Run the hosted deployment: the admin API, the complete web app, and a runtime that
serves every project, on a single origin.

It is configured with STATSPARROT_SERVE_* environment variables for the shared settings and
with the usual STATSPARROT_ADMIN_* and STATSPARROT_RUNTIME_* variables for everything else,
so anything a standalone "admin start" or "runtime start" accepts also works here.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Load .env (note: fails silently if .env has errors)
			_ = godotenv.Load()

			var conf Config
			if err := envconfig.Process("statsparrot_serve", &conf); err != nil {
				return fmt.Errorf("failed to load config: %w", err)
			}

			// The flag wins over the environment variable, so a container image can set a
			// default role and still be overridden per deployment.
			role := conf.Role
			if roleFlag != "" {
				role = roleFlag
			}
			parsedRole, err := parseRole(role)
			if err != nil {
				return err
			}

			logger, err := newLogger(conf.LogLevel)
			if err != nil {
				return err
			}
			defer func() { _ = logger.Sync() }()

			env, err := buildEnv(conf, parsedRole, os.LookupEnv)
			if err != nil {
				return err
			}

			if err := checkSecrets(parsedRole, os.LookupEnv); err != nil {
				return err
			}

			if err := ensureRuntimeDataDir(conf, parsedRole, os.LookupEnv); err != nil {
				return err
			}

			sup, err := newSupervisor(conf, parsedRole, env, logger)
			if err != nil {
				return err
			}

			// Cancelled on SIGINT/SIGTERM, which is what an orchestrator sends to stop the
			// container.
			ctx, stop := signal.NotifyContext(cmd.Context(), syscall.SIGINT, syscall.SIGTERM)
			defer stop()

			logger.Info("serving",
				zap.String("role", string(parsedRole)),
				zap.String("public_url", conf.PublicURL),
				zap.Int("http_port", conf.HTTPPort),
				zap.Int("runtime_port", conf.RuntimePort),
			)

			return sup.run(ctx)
		},
	}

	serveCmd.Flags().StringVar(&roleFlag, "role", "", `Which processes to run: "all", "admin" or "runtime" (default "all")`)

	return serveCmd
}

// ensureRuntimeDataDir creates the directory the runtime keeps its state in. The runtime's
// SQLite metastore lives there, and SQLite reports a missing directory as "unable to open
// database file: out of memory", which says nothing about the real problem.
func ensureRuntimeDataDir(conf Config, role Role, lookup envLookup) error {
	if !role.runsRuntime() {
		return nil
	}

	// The operator's value wins, because buildEnv leaves an explicitly set data directory
	// alone.
	dir := conf.RuntimeDataDir
	if value, ok := lookup("STATSPARROT_RUNTIME_DATA_DIR"); ok && strings.TrimSpace(value) != "" {
		dir = value
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("failed to create the runtime data directory %q: %w", dir, err)
	}
	return nil
}

// adminSecrets are the settings the admin server cannot start without and that have no safe
// default, so an operator has to provide them.
//
// They are checked here because the child process's own error does not always name the
// variable that is missing: the admin server reports "provided SessionKeyPairs is empty" and
// "invalid JWKS", neither of which says which environment variable to set.
var adminSecrets = []struct {
	key  string
	hint string
}{
	{"STATSPARROT_ADMIN_SESSION_KEY_PAIRS", "hex-encoded keys, generated with `openssl rand -hex 32`"},
	{"STATSPARROT_ADMIN_SIGNING_JWKS", "generated by `statsparrot admin generate-signing-key`"},
	{"STATSPARROT_ADMIN_SIGNING_KEY_ID", "printed by `statsparrot admin generate-signing-key`"},
}

// checkSecrets reports every missing admin secret at once, with the command that produces it.
func checkSecrets(role Role, lookup envLookup) error {
	if !role.runsAdmin() {
		return nil
	}

	var missing []string
	for _, secret := range adminSecrets {
		if value, ok := lookup(secret.key); !ok || strings.TrimSpace(value) == "" {
			missing = append(missing, fmt.Sprintf("  %s (%s)", secret.key, secret.hint))
		}
	}
	if len(missing) == 0 {
		return nil
	}
	return fmt.Errorf("missing required configuration:\n%s", strings.Join(missing, "\n"))
}

func newLogger(level zapcore.Level) (*zap.Logger, error) {
	cfg := zap.NewProductionConfig()
	cfg.Level.SetLevel(level)
	cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, err := cfg.Build()
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}
	return logger, nil
}

// child is one supervised process.
type child struct {
	name string
	cmd  *exec.Cmd
	// exited is closed when the process has been reaped.
	exited chan struct{}
}

// start launches the process. The caller must have built cmd.Env and cmd.Stdout/Stderr.
func (c *child) start() error {
	if err := c.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start %s: %w", c.name, err)
	}
	return nil
}

// terminate asks the process to shut down gracefully. A process that cannot be signalled
// (Windows does not implement SIGTERM) is killed instead.
func (c *child) terminate(logger *zap.Logger) {
	if c.cmd.Process == nil {
		return
	}
	if err := c.cmd.Process.Signal(syscall.SIGTERM); err != nil {
		logger.Warn("failed to signal child process, killing it",
			zap.String("name", c.name),
			zap.Int("pid", c.cmd.Process.Pid),
			zap.Error(err),
		)
		c.kill(logger)
	}
}

func (c *child) kill(logger *zap.Logger) {
	if c.cmd.Process == nil {
		return
	}
	// A process that has already exited cannot be killed, and that is not a failure.
	if err := c.cmd.Process.Kill(); err != nil && !errors.Is(err, os.ErrProcessDone) {
		logger.Warn("failed to kill child process",
			zap.String("name", c.name),
			zap.Int("pid", c.cmd.Process.Pid),
			zap.Error(err),
		)
	}
}

// supervisor runs the child processes and shuts them down together.
type supervisor struct {
	conf         Config
	logger       *zap.Logger
	children     []*child
	drainTimeout time.Duration
}

// exit is a child process that has been reaped.
type exit struct {
	name string
	err  error
}

func newSupervisor(conf Config, role Role, env *childEnv, logger *zap.Logger) (*supervisor, error) {
	// Serving uses the same binary for the children, so that a deployment is a single
	// artifact. A container image needs to contain nothing but this executable.
	executable, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("failed to locate the current executable: %w", err)
	}

	var children []*child
	if role.runsRuntime() {
		// The runtime reads its whole configuration from the environment and takes no
		// arguments.
		children = append(children, newChild(executable, "runtime", []string{"runtime", "start"}, env.runtime))
	}
	if role.runsAdmin() {
		// No service argument, so the admin runs its HTTP server, its background worker and
		// its startup jobs. The worker is what advances deployments, so it is not optional
		// in a single-container deployment.
		children = append(children, newChild(executable, "admin", []string{"admin", "start"}, env.admin))
	}

	return &supervisor{
		conf:         conf,
		logger:       logger,
		children:     children,
		drainTimeout: conf.DrainTimeout,
	}, nil
}

func newChild(executable, name string, args []string, env map[string]string) *child {
	cmd := exec.Command(executable, args...)
	cmd.Env = mergeEnv(os.Environ(), env)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = nil
	return &child{name: name, cmd: cmd, exited: make(chan struct{})}
}

// run starts every child and blocks until the context is cancelled or a child exits. It
// stops the remaining children and reports why it stopped.
func (s *supervisor) run(ctx context.Context) error {
	results := make(chan exit, len(s.children))

	for _, c := range s.children {
		if err := c.start(); err != nil {
			// Stop whatever started before the failure.
			s.stop()
			return err
		}
		s.logger.Info("child process started",
			zap.String("name", c.name),
			zap.Int("pid", c.cmd.Process.Pid),
			zap.Strings("args", c.cmd.Args[1:]),
		)
		go func(c *child) {
			err := c.cmd.Wait()
			close(c.exited)
			results <- exit{name: c.name, err: err}
		}(c)
	}

	var runErr error
	received := 0

	select {
	case <-ctx.Done():
		s.logger.Info("shutdown signal received, stopping child processes")
	case e := <-results:
		received++
		runErr = unexpectedExit(e)
	}

	s.stop()

	// Reap the remaining children so that none is left as a zombie.
	for received < len(s.children) {
		<-results
		received++
	}

	return runErr
}

// stop asks every child to terminate, waits for the drain timeout, then kills the rest.
func (s *supervisor) stop() {
	for _, c := range s.children {
		c.terminate(s.logger)
	}

	deadline := time.After(s.drainTimeout)
	expired := false
	for _, c := range s.children {
		if expired {
			c.kill(s.logger)
			continue
		}
		select {
		case <-c.exited:
		case <-deadline:
			expired = true
			s.logger.Warn("child process did not shut down in time, killing it",
				zap.String("name", c.name),
				zap.Duration("drain_timeout", s.drainTimeout),
			)
			c.kill(s.logger)
		}
	}
}

// unexpectedExit turns a child's exit status into an error. A child that stops is always a
// failure of the whole deployment: serve has nothing left to do, and exiting lets the
// container runtime restart it.
func unexpectedExit(e exit) error {
	if e.err == nil {
		return fmt.Errorf("the %s process exited; stopping", e.name)
	}
	return fmt.Errorf("the %s process exited: %w", e.name, e.err)
}
