import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, PanelLeft } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useNavigate } from "react-router-dom";
import "@/styles/topbar.css";

export function ChatSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    currentOrganization, currentWorkspace,
    chatSessions, activeChatId, activeSection,
    selectChat, createChatSession,
  } = useAppStore();
  const navigate = useNavigate();

  const navToChat = (chatId) => {
    const orgSlug = currentOrganization?.slug || currentOrganization?.id;
    const pSlug = currentWorkspace?.slug || currentWorkspace?.id;
    navigate(`/app/${orgSlug}/${pSlug}/chat`);
  };

  const handleNewChat = () => {
    const session = createChatSession();
    navToChat(session.id);
  };

  const handleSelectChat = (id) => {
    selectChat(id);
    navToChat(id);
  };

  return (
    <div className={cn("chat-sidebar", collapsed && "collapsed")}>
      <div className="chat-sidebar-header">
        <div className="chat-sidebar-header-row">
          <span className={cn("chat-sidebar-title", collapsed && "chat-sidebar-label")}>Chat History</span>
          <button
            type="button"
            className="chat-sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <PanelLeft size={14} className={cn(collapsed && "rotate-180")} />
          </button>
        </div>
      </div>
      <div className="chat-sidebar-content">
        <div className="chat-sidebar-group">
          <button className="chat-sidebar-new" onClick={handleNewChat} title="New Chat">
            <Plus size={14} />
            <span className="chat-sidebar-new-label">New Chat</span>
          </button>
          {chatSessions.filter((s) => s.messages?.length > 0).map((session) => (
            <button
              key={session.id}
              className={cn(
                "chat-sidebar-item",
                activeSection === "chat" && activeChatId === session.id && "active"
              )}
              onClick={() => handleSelectChat(session.id)}
              title={session.title}
            >
              <span className="truncate">{session.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
