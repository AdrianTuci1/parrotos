import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, PanelLeft, MessageSquare, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useNavigate } from "react-router-dom";
import "@/styles/topbar.css";

export function ChatSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    currentOrganization,
    currentWorkspace,
    chatSessions,
    activeChatId,
    activeSection,
    selectChat,
    createChatSession,
    deleteChatSession,
  } = useAppStore();
  const navigate = useNavigate();

  const validSessions = chatSessions.filter((s) => s.messages?.length > 0);

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

  const handleDeleteChat = (e, id) => {
    e.stopPropagation();
    deleteChatSession(id);
  };

  return (
    <aside
      className={cn("chat-sidebar", collapsed && "collapsed")}
      aria-label="Chat navigation sidebar"
    >
      <div className="chat-sidebar-header">
        <div className="chat-sidebar-header-row">
          {!collapsed && (
            <div className="chat-sidebar-title-group">
              <span className="chat-sidebar-title">Chat History</span>
              {validSessions.length > 0 && (
                <span className="chat-sidebar-count">{validSessions.length}</span>
              )}
            </div>
          )}
          <button
            type="button"
            className="chat-sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={16} className={cn("chat-sidebar-toggle-icon", collapsed && "rotated")} />
          </button>
        </div>
      </div>

      <div className="chat-sidebar-content">
        <div className="chat-sidebar-group">
          <button
            type="button"
            className="chat-sidebar-new"
            onClick={handleNewChat}
            title="New Chat"
          >
            <div className="chat-sidebar-new-icon">
              <Plus size={15} />
            </div>
            {!collapsed && <span className="chat-sidebar-new-label">New Chat</span>}
          </button>

          <div className="chat-sidebar-list">
            {validSessions.map((session) => {
              const isActive = activeSection === "chat" && activeChatId === session.id;
              return (
                <div
                  key={session.id}
                  className={cn("chat-sidebar-item-wrapper", isActive && "active")}
                >
                  <button
                    type="button"
                    className={cn("chat-sidebar-item", isActive && "active")}
                    onClick={() => handleSelectChat(session.id)}
                    title={session.title}
                  >
                    <MessageSquare size={15} className="chat-sidebar-item-icon" />
                    {!collapsed && (
                      <span className="chat-sidebar-item-title truncate">
                        {session.title || "Untitled Chat"}
                      </span>
                    )}
                  </button>
                  {!collapsed && (
                    <button
                      type="button"
                      className="chat-sidebar-item-delete"
                      onClick={(e) => handleDeleteChat(e, session.id)}
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}

            {validSessions.length === 0 && !collapsed && (
              <div className="chat-sidebar-empty">
                <MessageSquare size={18} className="chat-sidebar-empty-icon" />
                <span>No chat history</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

