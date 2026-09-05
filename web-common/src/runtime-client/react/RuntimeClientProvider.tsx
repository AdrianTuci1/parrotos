import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { getRuntimeClient, evictRuntimeClient } from "../v2/context";
import type { RuntimeClient } from "../v2/runtime-client";
import type { AuthContext } from "../v2/runtime-client";

const RuntimeClientContext = createContext<RuntimeClient | null>(null);

export interface RuntimeClientProviderProps {
  host: string;
  instanceId: string;
  jwt?: string;
  authContext?: AuthContext;
  children?: ReactNode;
}

/**
 * React translation of runtime-client/v2/RuntimeProvider.svelte.
 *
 * Builds (or reuses) a RuntimeClient aimed at the Go admin/runtime Connect
 * service and exposes it through React context. Unlike the Svelte provider it
 * does not require a Svelte <RuntimeProvider> ancestor, so a pure React host
 * can wire the BI UI straight to the Go Connect service. The client itself is
 * the existing framework-agnostic RuntimeClient (createConnectTransport -> Go),
 * imported verbatim from runtime-client/v2; nothing is rewritten.
 *
 * The host/instanceId pair maps onto a project's deployment record in admin
 * Postgres (deployments.runtime_host / deployments.runtime_instance_id), i.e.
 * tenancy: organization -> project -> deployment -> runtime Connect service.
 */
export function RuntimeClientProvider(props: RuntimeClientProviderProps) {
  const { host, instanceId, jwt, authContext = "user", children } = props;

  const [client, setClient] = useState<RuntimeClient>(() =>
    getRuntimeClient({ host, instanceId, jwt, authContext }),
  );

  // Recreate the client when host/instanceId change. The Svelte provider gets
  // this behaviour for free from the parent's {#key} re-mount; React needs it
  // explicit. JWT/authContext changes are applied in place via updateJwt.
  useEffect(() => {
    if (host !== client.host || instanceId !== client.instanceId) {
      const next = getRuntimeClient({ host, instanceId, jwt, authContext });
      setClient(next);
      return;
    }
    client.updateJwt(jwt, authContext);
  }, [host, instanceId, jwt, authContext, client]);

  // Dispose/evict on unmount, matching RuntimeProvider.svelte's onDestroy.
  useEffect(() => {
    return () => {
      client.dispose();
      evictRuntimeClient(client);
    };
  }, [client]);

  const value = useMemo(() => client, [client]);

  return (
    <RuntimeClientContext.Provider value={value}>
      {children}
    </RuntimeClientContext.Provider>
  );
}

/**
 * React counterpart of the Svelte useRuntimeClient() (runtime-client/v2).
 * Reads the RuntimeClient injected by the nearest <RuntimeClientProvider>.
 * Must be called from a component rendered underneath a provider.
 */
export function useRuntimeClient(): RuntimeClient {
  const client = useContext(RuntimeClientContext);
  if (!client) {
    throw new Error(
      "useRuntimeClient() was called outside of a <RuntimeClientProvider>. " +
        "Wrap the component tree in a RuntimeClientProvider to connect the " +
        "React UI to the Go admin/runtime Connect service.",
    );
  }
  return client;
}
