import { RuntimeClientProvider } from '@rilldata/web-common/runtime-client/react';
import { useRuntimeTenancy } from '@/services/RuntimeTenancy';

/**
 * Local dev escape hatches. In production the host/instanceId are resolved from
 * the deployment record in admin Postgres (see RuntimeTenancy.js). These make the
 * tree mountable when no deployment exists yet (demo mode): the widget data path
 * short-circuits to mocks before it ever calls into the runtime client.
 */
const FALLBACK_HOST = import.meta.env.VITE_RUNTIME_HOST || 'http://localhost:8081';
const FALLBACK_INSTANCE_ID = import.meta.env.VITE_RUNTIME_INSTANCE_ID || 'local';

/**
 * Wraps the React app in the Rill runtime-client <RuntimeClientProvider>, wiring
 * the BI UI directly to the Go admin/runtime Connect service. The host + instanceId
 * come from the org -> project -> deployment mapping (RuntimeTenancy); the jwt is
 * the runtime JWT minted by the admin service.
 */
export function RuntimeHostProvider({ children }) {
  const { host, instanceId, jwt } = useRuntimeTenancy();

  return (
    <RuntimeClientProvider
      host={host || FALLBACK_HOST}
      instanceId={instanceId || FALLBACK_INSTANCE_ID}
      jwt={jwt}
    >
      {children}
    </RuntimeClientProvider>
  );
}
