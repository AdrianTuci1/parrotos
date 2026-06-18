import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
} from "lucide-react";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/stores/useAppStore";
import "@/styles/settings.css";

const defaultModules = {
  onboarding: false,
  analytics: true,
  sources: true,
  destinations: true,
  storage: true,
  graph: true,
  chat: true,
};

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateProjectView() {
  const navigate = useNavigate();
  const { currentOrganization, createWorkspace, isLoading } = useAppStore();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [modules, setModules] = useState(defaultModules);
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  const organizationSlug = currentOrganization?.slug || currentOrganization?.id;

  const handleCancel = () => {
    navigate(`/app/${organizationSlug}/stats`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const normalizedSlug = slugify(slug);

    if (!trimmedName) {
      setSubmitError("Project name is required.");
      return;
    }

    if (!normalizedSlug) {
      setSubmitError("Project slug must contain letters or numbers.");
      return;
    }

    if (!currentOrganization?.id || currentOrganization.id === '__empty__') {
      setSubmitError("No organization selected. Please wait while data loads.");
      return;
    }

    setSubmitError("");

    try {
      const project = await createWorkspace({
        name: trimmedName,
        slug: normalizedSlug,
        description: description.trim(),
        modules,
      });
      const projectSlug = project.slug || project.id;
      navigate(`/app/${organizationSlug}/${projectSlug}/analytics`);
    } catch (error) {
      setSubmitError(error.message || "Project creation failed.");
    }
  };

  return (
    <ViewFrame
      title="Create Project"
      description="Set up a new project workspace using the same operating model as your existing project views."
      maxWidthClassName="max-w-7xl"
      actions={
        <button type="button" className="settings-btn-secondary" onClick={handleCancel}>
          Cancel
        </button>
      }
    >
      <form className="settings-wrapper create-project-wrapper" onSubmit={handleSubmit}>
        <div className="settings-section">
          <div className="settings-section-header">
            <h3 className="settings-section-title">Project Identity</h3>
            <span className="settings-section-desc">
              Define the name, route slug, and operating context for the new workspace.
            </span>
          </div>

          <div className="settings-group-card">
            <div className="settings-group-row create-project-field-row">
              <div className="settings-group-row-left">
                <span className="settings-row-title">Project name</span>
                <span className="settings-row-desc">
                  Primary label used across project navigation, settings, and analytics views.
                </span>
              </div>
              <div className="create-project-field-panel">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pixtooth"
                  className="create-project-input"
                />
              </div>
            </div>

            <div className="settings-group-row create-project-field-row">
              <div className="settings-group-row-left">
                <span className="settings-row-title">Project slug</span>
                <span className="settings-row-desc">
                  Used in URLs and internal routing. Lowercase letters, numbers, and dashes only.
                </span>
              </div>
              <div className="create-project-field-panel">
                <Input
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(event.target.value.toLowerCase());
                  }}
                  placeholder="pixtooth"
                  className="create-project-input"
                />
                <div className="create-project-field-hint">
                  Route preview: <span>{`/app/${organizationSlug || "organization"}/${slugify(slug) || "project"}/analytics`}</span>
                </div>
              </div>
            </div>

            <div className="settings-group-row create-project-field-row">
              <div className="settings-group-row-left">
                <span className="settings-row-title">Description</span>
                <span className="settings-row-desc">
                  Short operational context for the team managing this project.
                </span>
              </div>
              <div className="create-project-field-panel">
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Customer telemetry, commercial KPIs, and connector operations for this workspace."
                  className="create-project-textarea"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <h3 className="settings-section-title">Review</h3>
            <span className="settings-section-desc">
              Confirm the project footprint before the workspace is created.
            </span>
          </div>

          <div className="settings-group-card">
            <div className="settings-group-row">
              <div className="settings-group-row-left">
                <span className="settings-row-title">Organization</span>
                <span className="settings-row-desc">The new project will be attached to the active organization.</span>
              </div>
              <div className="create-project-summary-chip">
                <Briefcase size={14} />
                <span>{currentOrganization?.name || "Organization"}</span>
              </div>
            </div>

            <div className="settings-group-row">
              <div className="settings-group-row-left">
                <span className="settings-row-title">Workspace surface</span>
                <span className="settings-row-desc">All standard project views are enabled by default.</span>
              </div>
              <div className="create-project-summary-text">
                Analytics, integrations, graph, and chat are available after setup.
              </div>
            </div>

            <div className="settings-group-row create-project-actions-row">
              <div className="settings-group-row-left">
                <span className="settings-row-title">Create workspace</span>
                <span className="settings-row-desc">
                  You will land directly in the new project's analytics area after creation.
                </span>
                {submitError ? <span className="create-project-error">{submitError}</span> : null}
              </div>
              <div className="settings-action-row create-project-actions">
                <button type="button" className="settings-btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-btn-primary"
                  disabled={isLoading || !name.trim()}
                >
                  {isLoading ? "Creating..." : "Create project"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </ViewFrame>
  );
}
