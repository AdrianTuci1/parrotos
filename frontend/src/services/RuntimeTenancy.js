import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';

/**
 * Canonical admin service URL. The Go admin service reads admin Postgres; it is
 * not the Node/Express backend that used to back `/api/v1`.
 */
const ADMIN_URL = import.meta.env.VITE_RILL_ADMIN_URL || 'http://localhost:8080';

/**
 * Resolve the runtime Connect target for a tenancy pair.
 *
 * Firestore-style tenancy (Organization/Project) is mapped to an admin Postgres
 * deployment over the Go admin service:
 *
 *   GET /v1/orgs/{org}/projects/{project}
 *     -> projects.id -> deployments.project_id (primary deployment)
 *     -> deployments.runtime_host / deployments.runtime_instance_id  (+ runtime jwt)
 *
 * The returned { host, instanceId, jwt } is exactly what the
 * RuntimeClientProvider needs to open a CreateConnectTransport straight to the
 * Go runtime service. This materializes the org -> project -> deployment ->
 * runtime host/instance mapping that previously existed only as migration columns.
 */
export async function resolveRuntimeTenancy(org, project) {
  const orgName = org?.name || org?.slug;
  const projectName = project?.name || project?.slug;

  if (!orgName || !projectName) {
    // Demo/local: no deployment exists yet, so there is no runtime endpoint to
    // resolve. The provider falls back to a locally configured instance.
    return { host: '', instanceId: '', jwt: undefined };
  }

  const response = await fetch(
    `${ADMIN_URL}/v1/orgs/${encodeURIComponent(orgName)}/projects/${encodeURIComponent(projectName)}`,
    { credentials: 'include' },
  );

  if (!response.ok) {
    throw new Error(`Runtime tenancy lookup failed: ${response.status}`);
  }

  const body = await response.json();
  const deployment = body?.deployment;
  return {
    host: deployment?.runtimeHost ?? '',
    instanceId: deployment?.runtimeInstanceId ?? '',
    jwt: body?.jwt,
  };
}

/**
 * React hook that resolves the deployment (host/instanceId/jwt) for the
 * currently selected organization + project and feeds it to the provider.
 *
 * Intentionally mirrors web-admin's project selector: runtime is derived from
 * the project's primary deployment record in admin Postgres.
 */
export function useRuntimeTenancy() {
  const { currentOrganization, currentWorkspace } = useAppStore();
  const [tenancy, setTenancy] = useState({ host: '', instanceId: '', jwt: undefined });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!currentOrganization || !currentWorkspace) {
      setReady(false);
      setTenancy({ host: '', instanceId: '', jwt: undefined });
      return undefined;
    }

    resolveRuntimeTenancy(currentOrganization, currentWorkspace)
      .then((result) => {
        if (!cancelled) {
          setTenancy(result);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTenancy({ host: '', instanceId: '', jwt: undefined });
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentOrganization, currentWorkspace]);

  return { ...tenancy, ready };
}
