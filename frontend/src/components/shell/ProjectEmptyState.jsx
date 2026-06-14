import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import "@/styles/project-empty-state.css";

function parseEventCount(value) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const numeric = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (Number.isNaN(numeric)) {
    return 0;
  }

  if (String(value).includes("M")) {
    return numeric * 1000000;
  }

  if (String(value).includes("K")) {
    return numeric * 1000;
  }

  return numeric;
}

export function isProjectEmpty(workspace) {
  if (!workspace) {
    return true;
  }

  const connectorCount = Array.isArray(workspace.connectors) ? workspace.connectors.length : 0;
  const eventCount = parseEventCount(workspace.monthlyEvents);
  const sessionCount = Number(workspace.stats?.sessionsCount || 0);

  return connectorCount === 0 && eventCount === 0 && sessionCount === 0;
}

export function ProjectEmptyState({ mode = "analytics" }) {
  const navigate = useNavigate();
  const { currentOrganization, currentWorkspace, createChatSession } = useAppStore();

  const organizationSlug = currentOrganization?.slug || currentOrganization?.id;
  const projectSlug = currentWorkspace?.slug || currentWorkspace?.id;

  const goTo = (section) => {
    navigate(`/app/${organizationSlug}/${projectSlug}/${section}`);
  };

  const handleNewChat = () => {
    createChatSession();
    goTo("chat");
  };

  const isGraph = mode === "graph";

  return (
    <div className="project-empty-state">
      <div className="project-empty-copy">
        <span className="project-empty-eyebrow">
          {isGraph ? "Graph is waiting for source data" : "New project"}
        </span>
        <h2 className="project-empty-title">
          {isGraph
            ? "The graph will populate after connectors start sending data."
            : "This project does not have live data yet."}
        </h2>
        <p className="project-empty-description">
          {isGraph
            ? "Add at least one connector and let the first sync complete to unlock entities, lineage, and relationships in the graph."
            : "Use chat and connector setup to bring the first live datasets into analytics."}
        </p>

        <div className="project-empty-actions">
          <button
            type="button"
            className="project-empty-action-row"
            onClick={handleNewChat}
          >
            Chat with our AI Assistant to help you with the onboarding process.
          </button>

          <button
            type="button"
            className="project-empty-action-row"
            onClick={() => goTo("sources")}
          >
            Add connectors so you can see live data.
          </button>
        </div>
      </div>
    </div>
  );
}
