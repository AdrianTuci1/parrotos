import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { useAppStore } from "@/stores/useAppStore";
import {
  Link as LinkIcon,
  RefreshCw,
  Users,
  Trash2,
  Check,
  Copy,
  ChevronDown,
  Pencil
} from "lucide-react";
import "@/styles/settings.css";

export function SettingsView() {
  const {
    currentOrganization,
    currentWorkspace,
    deleteProject,
    generatePublicLink,
    revokePublicLink,
    regeneratePublicLink,
    isLoading,
  } = useAppStore();
  const navigate = useNavigate();

  const [publicShareLink, setPublicShareLink] = useState("");
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Sync cu publicLink din workspace când se schimbă
  useEffect(() => {
    if (currentWorkspace?.publicLink?.url) {
      setPublicShareLink(currentWorkspace.publicLink.url);
    } else {
      setPublicShareLink("");
    }
  }, [currentWorkspace?.publicLink]);

  const handleGeneratePublicLink = async () => {
    if (!currentOrganization || !currentWorkspace) return;
    setGeneratingLink(true);
    try {
      const result = await generatePublicLink(currentOrganization.id, currentWorkspace.id);
      if (result?.url) {
        setPublicShareLink(result.url);
      }
    } catch (err) {
      alert('Failed to generate public link: ' + err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyPublicLink = () => {
    if (!publicShareLink) return;
    navigator.clipboard.writeText(publicShareLink);
    setCopiedPublic(true);
    setTimeout(() => setCopiedPublic(false), 2000);
  };

  const handleRevokePublicLink = async () => {
    if (!currentOrganization || !currentWorkspace) return;
    if (!confirm("Are you sure you want to revoke the public link? This will immediately disable public access to the analytics dashboard.")) {
      return;
    }
    try {
      await revokePublicLink(currentOrganization.id, currentWorkspace.id);
      setPublicShareLink("");
    } catch (err) {
      alert('Failed to revoke public link: ' + err.message);
    }
  };

  const handleRegeneratePublicLink = async () => {
    if (!currentOrganization || !currentWorkspace) return;
    setGeneratingLink(true);
    try {
      const result = await regeneratePublicLink(currentOrganization.id, currentWorkspace.id);
      if (result?.url) {
        setPublicShareLink(result.url);
        setCopiedPublic(false);
      }
    } catch (err) {
      alert('Failed to regenerate public link: ' + err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleReanalyze = () => {
    setReanalyzing(true);
    setTimeout(() => {
      setReanalyzing(false);
      alert("Re-analysis request sent successfully!");
    }, 1500);
  };

  const handleDelete = async () => {
    if (!currentWorkspace || !currentOrganization) return;
    if (confirm("Are you sure you want to delete this project? This action is permanent and cannot be undone.")) {
      try {
        await deleteProject(currentOrganization.id, currentWorkspace.id);
        navigate('/app', { replace: true });
      } catch (err) {
        alert('Failed to delete project: ' + err.message);
      }
    }
  };

  return (
    <ViewFrame
      title="Settings"
      description="Manage workspace access permissions, link generation, re-analysis execution, and project removal."
      maxWidthClassName="max-w-3xl"
    >
      <div className="settings-wrapper">
        {/* Section 1: Access Links & Re-analysis */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3 className="settings-section-title">Integrations & Hooks</h3>
          </div>

          <div className="settings-group-card">
            {/* Row 1: Public Share Link */}
            <div className="settings-group-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>
              <div className="settings-group-row-left">
                <span className="settings-row-title">Public Analytics sharing</span>
                <span className="settings-row-desc">
                  Generate a public dashboard link to share this project's real-time analytics with external partners without requiring them to log in.
                </span>
              </div>
              <div className="settings-action-row" style={{ marginTop: "4px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                {!publicShareLink ? (
                  <button
                    onClick={handleGeneratePublicLink}
                    disabled={generatingLink || isLoading}
                    className="settings-btn-secondary"
                  >
                    <LinkIcon size={14} />
                    {generatingLink ? "Generating..." : "Generate Public Link"}
                  </button>
                ) : (
                  <>
                    <div className="settings-link-display" style={{ flex: 1, minWidth: "240px" }}>
                      <span className="settings-link-text">{publicShareLink}</span>
                      <button onClick={copyPublicLink} className="settings-copy-btn" title="Copy Link">
                        {copiedPublic ? <Check size={14} style={{ color: "#3b82f6" }} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={handleRegeneratePublicLink}
                      disabled={generatingLink}
                      className="settings-btn-secondary"
                      style={{ padding: "8px 12px", borderRadius: "8px", fontSize: "12px" }}
                      title="Regenerate Link"
                    >
                      <RefreshCw size={14} className={generatingLink ? "animate-spin" : ""} />
                    </button>
                    <button
                      onClick={handleRevokePublicLink}
                      className="settings-btn-danger"
                      style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px" }}
                    >
                      Disable Public Link
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Request Re-analysis */}
            <div className="settings-group-row">
              <div className="settings-group-row-left">
                <span className="settings-row-title">Request Re-analysis</span>
                <span className="settings-row-desc">
                  Force Sentry parser to re-scan all server nodes, log history, and telemetry streams to refresh security findings.
                </span>
              </div>
              <div className="settings-group-row-right">
                <button onClick={handleReanalyze} disabled={reanalyzing} className="settings-btn-secondary">
                  <RefreshCw size={14} className={reanalyzing ? "animate-spin" : ""} />
                  {reanalyzing ? "Re-analyzing..." : "Run Re-analysis Now"}
                </button>
              </div>
            </div>
          </div>
        </div>



        {/* Section 3: Danger Zone */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3 className="settings-section-title" style={{ color: "#ef4444" }}>Danger Zone</h3>
          </div>
          
          <div className="settings-danger-card">
            <div className="settings-danger-header">
              <Trash2 size={16} className="text-[#EF4444]" />
              <h3 className="settings-danger-title">Delete Project</h3>
            </div>
            <p className="settings-row-desc" style={{ color: "#f87171" }}>
              Permanently delete Sentry Observability Hub telemetry configurations, database integrations, and logs. This action is irreversible.
            </p>
            <div style={{ marginTop: "4px" }}>
              <button onClick={handleDelete} className="settings-btn-danger">
                Delete Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </ViewFrame>
  );
}
