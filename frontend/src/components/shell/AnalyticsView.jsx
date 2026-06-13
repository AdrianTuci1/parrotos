import { useAppStore } from "@/stores/useAppStore";
import { DashboardLayout } from "@/components/widgets/DashboardLayout";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { MarketingView } from "@/components/shell/MarketingView";
import { SalesView } from "@/components/shell/SalesView";
import { FinancialView } from "@/components/shell/FinancialView";

const viewLayouts = {
  servers: "server-monitor",
  financial: "campaign-sales",
  sales: "campaign-sales",
  marketing: "marketing-performance",
  web: "analytics",
};

export function AnalyticsView() {
  const { activeAnalyticsView } = useAppStore();
  const layoutId = viewLayouts[activeAnalyticsView] || "server-monitor";

  return (
    <ViewFrame>
      {activeAnalyticsView === "marketing" ? (
        <MarketingView />
      ) : activeAnalyticsView === "sales" ? (
        <SalesView />
      ) : activeAnalyticsView === "financial" ? (
        <FinancialView />
      ) : (
        <DashboardLayout layoutId={layoutId} specViewId={activeAnalyticsView} isNested={false} />
      )}
    </ViewFrame>
  );
}
