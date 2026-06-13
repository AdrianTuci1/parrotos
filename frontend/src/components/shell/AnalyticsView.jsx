import { useAppStore } from "@/stores/useAppStore";
import { DashboardLayout } from "@/components/widgets/DashboardLayout";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { ProjectEmptyState, isProjectEmpty } from "@/components/shell/ProjectEmptyState";

const viewLayouts = {
  servers: "server-monitor",
  financial: "campaign-sales",
  sales: "campaign-sales",
  marketing: "marketing-performance",
  web: "analytics",
};

export function AnalyticsView() {
  const { activeAnalyticsView, currentWorkspace } = useAppStore();
  const layoutId = viewLayouts[activeAnalyticsView] || "server-monitor";
  const shouldShowEmptyState = isProjectEmpty(currentWorkspace);

  return (
    <ViewFrame>
      {shouldShowEmptyState ? (
        <ProjectEmptyState mode="analytics" />
      ) : (
        <DashboardLayout layoutId={layoutId} specViewId={activeAnalyticsView} isNested={false} />
      )}
    </ViewFrame>
  );
}
