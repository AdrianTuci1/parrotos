import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { ViewLoadingState } from "@/components/shell/ViewLoadingState";
import "@/styles/shell.css";

export function ViewFrame({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  maxWidthClassName,
  loading,
}) {
  const isLoading = useAppStore((state) => state.isLoading);
  const shouldShowLoading = loading ?? isLoading;

  return (
    <section className={cn("view-frame-section", className)}>
      <div className={cn("view-frame-inner", maxWidthClassName)}>
        {(title || description || actions) && (
          <div className="view-frame-header">
            <div className="view-frame-title-group">
              {title && <h1 className="view-frame-title">{title}</h1>}
              {description && <p className="view-frame-description">{description}</p>}
            </div>
            {actions && <div className="view-frame-actions">{actions}</div>}
          </div>
        )}

        <div className={cn("view-frame-content", contentClassName)}>
          {shouldShowLoading ? <ViewLoadingState /> : children}
        </div>
      </div>
    </section>
  );
}
