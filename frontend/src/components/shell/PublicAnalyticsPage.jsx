import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PublicShell } from "@/components/shell/PublicShell";
import { AnalyticsView } from "@/components/shell/AnalyticsView";
import { apiClient } from "@/services/ApiClient";
import { useAppStore } from "@/stores/useAppStore";

export function PublicAnalyticsPage() {
  const { token } = useParams();
  const { devMode } = useAppStore();
  const [projectInfo, setProjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function validateToken() {
      if (devMode) {
        // Mock mode - simulăm un proiect valid
        if (!cancelled) {
          setProjectInfo({
            project: {
              id: "mock-public",
              name: "Demo Project",
              slug: "demo-project",
              description: "Public analytics demo",
            },
            orgId: "mock-org",
            projectId: "mock-public",
          });
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.get(`/public/p/${token}`);
        if (!cancelled) {
          setProjectInfo(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Invalid or expired public link");
          setLoading(false);
        }
      }
    }

    validateToken();
    return () => { cancelled = true; };
  }, [token, devMode]);

  if (loading) {
    return (
      <div className="public-loading">
        <div className="public-loading-spinner" />
        <span>Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-error">
        <h2>Link Invalid or Expired</h2>
        <p>This public analytics link is no longer available. The project owner may have revoked it.</p>
      </div>
    );
  }

  const projectName = projectInfo?.project?.name || "Project";

  return (
    <PublicShell projectName={projectName}>
      <div className="public-analytics-view">
        <AnalyticsView publicMode={true} projectInfo={projectInfo} />
      </div>
    </PublicShell>
  );
}
