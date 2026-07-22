import { useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { Topbar } from "@/components/shell/Topbar";
import { ProjectSubNavbar } from "@/components/shell/ProjectSubNavbar";
import { ChatSidebar } from "@/components/shell/ChatSidebar";
import { cn } from "@/lib/utils";
import "@/styles/shell.css";

export function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeSection = useAppStore((state) => state.activeSection);
  const isChat = activeSection === "chat";

  return (
    <div className="layout-root">
      <Topbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <ProjectSubNavbar open={mobileMenuOpen} setOpen={setMobileMenuOpen} />
      <div className={cn("layout-body", isChat && "layout-body-chat")}>
        {isChat && <ChatSidebar />}
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
}
