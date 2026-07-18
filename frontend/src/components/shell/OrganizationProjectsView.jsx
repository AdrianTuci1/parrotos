import { useEffect } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ViewFrame } from '@/components/shell/ViewFrame';
import { useAppStore } from '@/stores/useAppStore';

export function OrganizationProjectsView() {
  const { currentOrganization, workspaces, fetchProjects, demoMode, devMode } = useAppStore();
  const navigate = useNavigate();
  const isMockMode = devMode || demoMode;

  useEffect(() => {
    if (currentOrganization?.id && !isMockMode) {
      fetchProjects(currentOrganization.id);
    }
  }, [currentOrganization?.id, isMockMode, fetchProjects]);

  const organizationProjects = workspaces.filter(
    (workspace) => workspace.organizationId === currentOrganization.id
  );

  return (
    <ViewFrame
      title="Projects"
      description="Review every client project, its current usage profile, and the connector footprint behind it."
      maxWidthClassName="full-width"
      actions={
        <button
          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
          onClick={() => navigate(`/app/${currentOrganization.slug || currentOrganization.id}/create-project`)}
        >
          <Plus size={14} />
          New project
        </button>
      }
    >
      <div className="grid gap-4">
        {organizationProjects.map((workspace) => (
          <div
            key={workspace.id}
            className="rounded-2xl border border-border bg-bg-secondary px-4 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-hover text-text-primary">
                  <Briefcase size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-text-primary">{workspace.name}</h3>
                  <p className="mt-1 text-sm text-text-muted">{workspace.domain}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    Connectors: {workspace.connectors.join(', ')}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-text-muted">
                <div>{workspace.monthlyEvents} events</div>
                <div className="mt-1">{workspace.dataConsumption}</div>
                <div className="mt-1">{workspace.lastUpdated}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ViewFrame>
  );
}
