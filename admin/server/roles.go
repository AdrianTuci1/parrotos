package server

import (
	"context"

	"github.com/staticlabs/statsparrot/admin"
	"github.com/staticlabs/statsparrot/admin/database"
	adminv1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/admin/v1"
)

func (s *Server) ListRoles(ctx context.Context, req *adminv1.ListRolesRequest) (*adminv1.ListRolesResponse, error) {
	orgRoles, err := s.admin.DB.FindOrganizationRoles(ctx)
	if err != nil {
		return nil, err
	}

	projRoles, err := s.admin.DB.FindProjectRoles(ctx)
	if err != nil {
		return nil, err
	}

	orgRolesPB := make([]*adminv1.OrganizationRole, len(orgRoles))
	for i, r := range orgRoles {
		orgRolesPB[i] = organizationRoleToDTO(r)
	}

	projRolesPB := make([]*adminv1.ProjectRole, len(projRoles))
	for i, r := range projRoles {
		projRolesPB[i] = projectRoleToDTO(r)
	}

	return &adminv1.ListRolesResponse{
		OrganizationRoles: orgRolesPB,
		ProjectRoles:      projRolesPB,
	}, nil
}

func organizationRoleToDTO(r *database.OrganizationRole) *adminv1.OrganizationRole {
	perms := admin.UnionOrgRoles(&adminv1.OrganizationPermissions{}, r)
	return &adminv1.OrganizationRole{
		Id:          r.ID,
		Name:        r.Name,
		Permissions: perms,
	}
}

func projectRoleToDTO(r *database.ProjectRole) *adminv1.ProjectRole {
	perms := admin.UnionProjectRoles(&adminv1.ProjectPermissions{}, r)
	return &adminv1.ProjectRole{
		Id:          r.ID,
		Name:        r.Name,
		Permissions: perms,
	}
}
