import { useState } from "react";
import { Plus, PanelLeftClose, PanelLeftOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Parrot `/ai` conversation rail. Lists the project's chat sessions, lets you start a
 * new conversation, and highlights the active one. Collapsible (280px ↔ 56px) like
 * Parrot's `ConversationSidebar`.
 *
 * When `embedded` is set it renders inside the main project sidebar (in place of the
 * file tree on the AI menu): it fills the container, drops its own collapse toggle and
 * stays expanded, so the project rail remains the single collapsible surface.
 */
export function ConversationSidebar({ chatSessions, activeChatId, onSelect, onNew, embedded = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = embedded ? false : collapsed;

  return (
    <aside className={cn("ai-sidebar", embedded && "ai-sidebar--embedded", isCollapsed && "ai-sidebar--collapsed")}>
      <div className="ai-sidebar-header">
        {!isCollapsed && <span className="ai-sidebar-title">Conversations</span>}
        <div className="ai-sidebar-header-actions">
          {!isCollapsed && (
            <button type="button" className="ai-sidebar-new" onClick={onNew} title="New conversation">
              <Plus size={14} />
              <span>New</span>
            </button>
          )}
          {!embedded && (
            <button
              type="button"
              className="ai-sidebar-collapse"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          )}
        </div>
      </div>

      <div className="ai-sidebar-list">
        {chatSessions.map((chat) => {
          const active = chat.id === activeChatId;
          return (
            <button
              key={chat.id}
              type="button"
              className={cn("ai-sidebar-item", active && "ai-sidebar-item--active")}
              onClick={() => onSelect(chat.id)}
              title={isCollapsed ? chat.title : undefined}
            >
              <MessageSquare size={15} className="ai-sidebar-item-icon" />
              {!isCollapsed && (
                <span className="ai-sidebar-item-title">{chat.title}</span>
              )}
            </button>
          );
        })}
        {chatSessions.length === 0 && !isCollapsed ? (
          <div className="ai-sidebar-empty">No conversations yet.</div>
        ) : null}
      </div>
    </aside>
  );
}

export default ConversationSidebar;
