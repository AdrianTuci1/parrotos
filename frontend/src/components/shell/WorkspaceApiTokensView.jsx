import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { Key, Plus, Copy, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSettingsHeader } from "@/components/shell/workspace-settings/WorkspaceSettingsHeader";
import { CreateModal } from "@/components/shell/CreateModal";

function formatDate(value) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function maskToken(value) {
  if (!value || value.length <= 8) return value || "—";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function displayToken(token) {
  if (token?.token) return maskToken(token.token);
  if (token?.prefix) return `${token.prefix}...`;
  return "—";
}

export function WorkspaceApiTokensView() {
  const currentOrganization = useAppStore((state) => state.currentOrganization);
  const apiTokens = useAppStore((state) => state.apiTokens);
  const isLoading = useAppStore((state) => state.isLoading);
  const [copiedId, setCopiedId] = useState(null);
  const [newToken, setNewToken] = useState(null);
  const [createTokenOpen, setCreateTokenOpen] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id && currentOrganization.id !== "__empty__") {
      useAppStore.getState().fetchApiTokens(currentOrganization.id);
    }
  }, [currentOrganization?.id]);

  const handleCreate = async (name) => {
    if (!currentOrganization?.id) return;
    const item = await useAppStore.getState().createApiToken(currentOrganization.id, name.trim());
    setNewToken(item);
    setCopiedId(null);
  };

  const handleCopy = (item) => {
    const value = item?.token || item?.prefix || "";
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((id) => (id === item.id ? null : id)), 2000);
  };

  const handleRevoke = async (id) => {
    if (!currentOrganization?.id) return;
    if (!confirm("Are you sure you want to revoke this token?")) return;
    await useAppStore.getState().revokeApiToken(currentOrganization.id, id);
    if (newToken?.id === id) setNewToken(null);
  };

  const headerActions = (
    <button
      type="button"
      className="workspace-page-header-btn"
      onClick={() => setCreateTokenOpen(true)}
    >
      <Plus size={14} />
      Create token
    </button>
  );

  return (
    <div className="workspace-page">
      <WorkspaceSettingsHeader
        title="API Tokens"
        currentOrganization={currentOrganization}
        docsHref="https://docs.sentrydata.com/api-tokens"
        actions={headerActions}
      />
      <p className="workspace-page-desc" style={{ marginTop: -8, marginBottom: 16 }}>
        Manage workspace API tokens used for data ingestion, queries, and integrations.
      </p>

      {newToken && (
        <div className="workspace-card workspace-card-flat" style={{ marginBottom: 16 }}>
          <div className="workspace-card-body">
            <div className="workspace-card-title" style={{ marginBottom: 4 }}>
              New token created
            </div>
            <p className="workspace-card-subtitle" style={{ marginBottom: 12 }}>
              Copy it now — you won&apos;t be able to see it again.
            </p>
            <div className="workspace-api-token-reveal">
              <code className="workspace-api-token-code">{newToken.token}</code>
              <button
                type="button"
                className="workspace-api-token-copy-btn"
                onClick={() => handleCopy(newToken)}
              >
                {copiedId === newToken.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="workspace-section-title">Workspace tokens</div>
      <p className="workspace-section-desc">Tokens scoped to this workspace and its projects.</p>

      <div className="workspace-card workspace-card-flat">
        <div className="workspace-card-body">
          <table className="workspace-api-tokens-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Token</th>
                <th>Scopes</th>
                <th>Last used</th>
                <th>Created</th>
                <th>Expires</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !apiTokens?.length && (
                <tr>
                  <td colSpan={7} className="workspace-placeholder-row">Loading tokens...</td>
                </tr>
              )}
              {!isLoading && !apiTokens?.length && (
                <tr>
                  <td colSpan={7} className="workspace-placeholder-row">
                    No API tokens yet. Create one to get started.
                  </td>
                </tr>
              )}
              {!isLoading && apiTokens?.map((token) => (
                <tr key={token.id}>
                  <td>
                    <div className="workspace-api-token-name-cell">
                      <Key size={14} className="workspace-api-token-icon" />
                      <span className="workspace-api-token-name">{token.name}</span>
                    </div>
                  </td>
                  <td className="workspace-api-token-value">{displayToken(token)}</td>
                  <td>
                    <div className="workspace-api-token-scopes">
                      {token.scopes?.map((scope) => (
                        <span key={scope} className="workspace-api-token-scope">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="workspace-api-token-meta">{formatDate(token.lastUsedAt)}</td>
                  <td className="workspace-api-token-meta">{formatDate(token.createdAt)}</td>
                  <td className="workspace-api-token-meta">{token.expiresAt ? formatDate(token.expiresAt) : "Never"}</td>
                  <td>
                    <div className="workspace-api-token-actions">
                      <button
                        type="button"
                        className={cn("workspace-api-token-action", copiedId === token.id && "copied")}
                        onClick={() => handleCopy(token)}
                        title="Copy token"
                      >
                        {copiedId === token.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        className="workspace-api-token-action danger"
                        onClick={() => handleRevoke(token.id)}
                        title="Revoke token"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <CreateModal
        open={createTokenOpen}
        onClose={() => setCreateTokenOpen(false)}
        title="Create API Token"
        description="Create a new API token for this workspace."
        label="Token name"
        placeholder="e.g. Production ETL"
        submitLabel="Create token"
        submittingLabel="Creating..."
        onSubmit={handleCreate}
      />
    </div>
  );
}
