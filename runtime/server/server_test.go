package server_test

import (
	"context"
	"testing"

	"github.com/staticlabs/statsparrot/runtime"
	"github.com/staticlabs/statsparrot/runtime/pkg/activity"
	"github.com/staticlabs/statsparrot/runtime/pkg/ratelimit"
	_ "github.com/staticlabs/statsparrot/runtime/resolvers"
	"github.com/staticlabs/statsparrot/runtime/server"
	"github.com/staticlabs/statsparrot/runtime/server/auth"
	"github.com/staticlabs/statsparrot/runtime/testruntime"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func getTestServer(t *testing.T) (*server.Server, string) {
	rt, instanceID := testruntime.NewInstance(t)

	server, err := server.NewServer(context.Background(), &server.Options{}, rt, zap.NewNop(), ratelimit.NewNoop(), activity.NewNoopClient())
	require.NoError(t, err)

	return server, instanceID
}

func testCtx() context.Context {
	return auth.WithClaims(context.Background(), &runtime.SecurityClaims{SkipChecks: true})
}
