package server

import (
	"context"

	"github.com/staticlabs/statsparrot/admin/server/auth"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
	"github.com/staticlabs/statsparrot/runtime/pkg/observability"
	"go.opentelemetry.io/otel/attribute"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (s *Server) SudoIssueRuntimeManagerToken(ctx context.Context, req *adminv1.SudoIssueRuntimeManagerTokenRequest) (*adminv1.SudoIssueRuntimeManagerTokenResponse, error) {
	observability.AddRequestAttributes(ctx, attribute.String("args.host", req.Host))

	claims := auth.GetClaims(ctx)
	if !claims.Superuser(ctx) {
		return nil, status.Error(codes.PermissionDenied, "only superusers can request a manager token")
	}

	jwt, err := s.admin.IssueRuntimeManagementToken(req.Host)
	if err != nil {
		return nil, err
	}

	return &adminv1.SudoIssueRuntimeManagerTokenResponse{
		Token: jwt,
	}, nil
}
