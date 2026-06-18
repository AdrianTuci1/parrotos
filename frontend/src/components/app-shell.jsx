import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import "@/styles/shell.css";

export function AppShell({ children }) {
  const activeSection = useAppStore((state) => state.activeSection);
  const isGraphSection = activeSection === "graph";

  return (
    <SidebarProvider className="sidebar-provider-container">
      <AppSidebar />
      <SidebarInset className="app-main-layout">
        <AppHeader />
        <div className={cn("app-content-wrapper", isGraphSection && "app-content-wrapper-graph")}>
          <div className={cn("app-content-inner", isGraphSection && "app-content-inner-graph")}>
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
