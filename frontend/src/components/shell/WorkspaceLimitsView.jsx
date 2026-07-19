import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSettingsHeader } from "@/components/shell/workspace-settings/WorkspaceSettingsHeader";

function formatLimit(limit) {
  if (typeof limit === "number" && Number.isFinite(limit)) {
    return limit.toLocaleString();
  }
  return String(limit);
}

function formatCurrent(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  return String(value ?? 0);
}

function percent(current, limit) {
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return Math.min(100, (current / limit) * 100);
  }
  return 0;
}

function useWorkspaceLimits(currentOrganization) {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const { fetchWorkspaceLimits } = useAppStore();

  useEffect(() => {
    if (currentOrganization?.id) {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const data = await fetchWorkspaceLimits(currentOrganization.id);
        if (!cancelled) {
          setLimits(data);
          setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }
  }, [currentOrganization?.id, fetchWorkspaceLimits]);

  return { limits, loading };
}

export function WorkspaceLimitsView() {
  const { currentOrganization } = useAppStore();
  const { limits, loading } = useWorkspaceLimits(currentOrganization);

  const limitRows = useMemo(() => {
    if (!limits) return [];
    return [
      {
        key: "connectors",
        name: "Connector limit",
        desc: "Workspace-wide limit on the number of connected data sources.",
        limit: limits.connectors?.limit ?? 10,
        current: limits.connectors?.current ?? 0,
        peak: limits.connectors?.peak ?? 0,
      },
      {
        key: "projects",
        name: "Project limit",
        desc: "Workspace-wide limit on the number of project workspaces.",
        limit: limits.projects?.limit ?? 20,
        current: limits.projects?.current ?? 0,
        peak: limits.projects?.peak ?? 0,
      },
      {
        key: "storage",
        name: "Storage limit",
        desc: "Workspace-wide limit on warehouse storage across all projects.",
        limit: limits.storage?.limit ?? 500,
        current: limits.storage?.current ?? 0,
        peak: limits.storage?.peak ?? 0,
        unit: "GB",
      },
      {
        key: "queries",
        name: "Query limit",
        desc: "Workspace-wide limit on monthly analytics queries.",
        limit: limits.queries?.limit ?? 50000,
        current: limits.queries?.current ?? 0,
        peak: limits.queries?.peak ?? 0,
      },
      {
        key: "ingestion",
        name: "Data ingestion rate limit",
        desc: "Workspace-wide data ingestion rate limit per second.",
        limit: limits.ingestion?.limit ?? "5/s + 150 burst",
        current: limits.ingestion?.current ?? 0,
        peak: limits.ingestion?.peak ?? "1/s",
      },
    ];
  }, [limits]);

  return (
    <div className="workspace-page">
      <WorkspaceSettingsHeader
        title="Limits"
        currentOrganization={currentOrganization}
        docsHref="https://docs.sentrydata.com/limits"
      />
      <p className="workspace-page-desc" style={{ marginTop: -8, marginBottom: 16 }}>
        View your workspace&apos;s resource limits and usage.
      </p>

      <div className="workspace-section-title">Workspace limits</div>
      <p className="workspace-section-desc">Maximum resources this workspace can use, across all environments.</p>

      <div className="workspace-card workspace-card-flat">
        <div className="workspace-card-body">
          <table className="workspace-limits-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Limit</th>
                <th>Current Usage</th>
                <th>Peak (30d)</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="workspace-placeholder-row">Loading limits...</td>
                </tr>
              )}
              {!loading && limitRows.map((row) => {
                const pct = percent(row.current, row.limit);
                const numericLimit = typeof row.limit === "number";
                return (
                  <tr key={row.key}>
                    <td>
                      <div className="workspace-limit-name-cell">
                        <ChevronRight size={14} className="workspace-limit-chevron" />
                        <div>
                          <div className="workspace-limit-name">{row.name}</div>
                          <div className="workspace-limit-desc">{row.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td className="workspace-limit-value">
                      {formatLimit(row.limit)}{numericLimit && row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td>
                      <div className="workspace-limit-usage">
                        <span className="workspace-limit-current">{formatCurrent(row.current)}</span>
                        {numericLimit && (
                          <>
                            <div className="workspace-limit-bar-bg">
                              <div
                                className={cn("workspace-limit-bar-fill", pct > 80 && "high")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="workspace-limit-pct">{pct.toFixed(0)}%</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="workspace-limit-peak">
                      {formatCurrent(row.peak)}{numericLimit && row.unit ? ` ${row.unit}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
