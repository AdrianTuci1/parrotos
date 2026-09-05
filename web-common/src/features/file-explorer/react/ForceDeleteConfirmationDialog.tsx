// React translation of `features/file-explorer/ForceDeleteConfirmationDialog.svelte`.
// Renders a compact confirm dialog when a non-empty directory is deleted. The
// confirmation modal is a lightweight stand-in for the Rill dialog primitive.
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";

export default function ForceDeleteConfirmationDialog({
  open,
  filePath,
  onClose,
  onDelete,
}: {
  open: boolean;
  filePath?: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-delete-title"
        className="relative z-10 rounded-md border bg-surface-base p-4 shadow-xl max-w-md"
      >
        <h2 id="force-delete-title" className="text-sm font-medium">
          {m.force_delete_title ? m.force_delete_title() : "Force delete folder"}
        </h2>
        <p className="mt-2 text-xs text-fg-muted">
          {filePath ? `${filePath} ` : ""}
          {m.force_delete_body
            ? m.force_delete_body()
            : "This folder is not empty. Delete it and all its contents?"}
        </p>
        <div className="mt-4 flex justify-end gap-x-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded bg-destructive px-3 py-1 text-xs text-destructive-foreground"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
