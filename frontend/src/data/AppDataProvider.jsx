import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeHostProvider } from "@/components/RuntimeHostProvider";

/**
 * App-root data provider.
 *
 * Mounts the TanStack React QueryClientProvider (required by the ported Rill leaf
 * components — MeasureBigNumber, Leaderboard, DimensionTable, PivotTable and the
 * dashboard filters/time-controls — which call `useQuery`) around Rill's
 * RuntimeClientProvider (mounted by RuntimeHostProvider).
 *
 * Single app-root provider mount for both; the RuntimeClientProvider connects the
 * BI UI to the live Rill runtime (see data/dataSource.js for how the host/instance
 * are resolved, dropping to the mock adapter when no runtime_url is configured).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppDataProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RuntimeHostProvider>{children}</RuntimeHostProvider>
    </QueryClientProvider>
  );
}
