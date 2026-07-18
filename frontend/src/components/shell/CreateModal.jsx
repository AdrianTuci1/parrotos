import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import "@/styles/organization-views.css";

export function CreateModal({
  open,
  onClose,
  title,
  description,
  label = "Name",
  placeholder,
  submitLabel = "Create",
  submittingLabel = "Creating...",
  onSubmit,
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setValue("");
      setError("");
      setIsSubmitting(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(`${label} is required.`);
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create.");
    } finally {
      setIsSubmitting(false);
    }
  }, [value, label, onSubmit, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="org-modal-backdrop" onClick={handleClose} />
      <div className="org-modal-frame">
        <div className="org-modal" onClick={(e) => e.stopPropagation()}>
          <div className="org-modal-header">
            <h3 className="org-modal-title">{title}</h3>
            {description && <p className="org-modal-description">{description}</p>}
          </div>
          <div className="org-modal-body">
            <div className="org-modal-field">
              <label className="org-modal-field-label">{label}</label>
              <Input
                className="org-modal-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                autoFocus
              />
              {error && <span className="create-project-error">{error}</span>}
            </div>
          </div>
          <div className="org-modal-footer">
            <button
              type="button"
              className="org-modal-secondary-btn"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="org-modal-primary-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !value.trim()}
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
