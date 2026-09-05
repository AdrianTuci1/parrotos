import { RuntimeClientProvider } from '@rilldata/web-common/runtime-client/react';
import { resolveRuntimeConfig } from '@/data/dataSource';
import { useRuntimeTenancy } from '@/services/RuntimeTenancy';

/**
 * Wraps the React app in the Rill runtime-client <RuntimeClientProvider>, wiring
 * the BI UI directly to the Go admin/runtime Connect service. The host + instanceId
 * come from the org -> project -> deployment mapping (RuntimeTenancy); the jwt is
 * the runtime JWT minted by the admin service.
 *
 * When no deployment is resolved (demo/local dev) the data layer's runtime config
 * (data/dataSource.js) supplies the default: the local `rill start` runtime at
 * localhost:9009 on the `default` instance.
 */
export function RuntimeHostProvider({ children }) {
  const { host, instanceId, jwt } = useRuntimeTenancy();
  const fallback = resolveRuntimeConfig();

  return (
    <RuntimeClientProvider
      host={host || fallback.host}
      instanceId={instanceId || fallback.instanceId}
      jwt={jwt || fallback.jwt}
    >
      {children}
    </RuntimeClientProvider>
  );
}
