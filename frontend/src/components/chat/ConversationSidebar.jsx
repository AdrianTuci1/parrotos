import { useState } from "react";
import { Plus, PanelLeftClose, PanelLeftOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rill `/ai` conversation rail. Lists the project's chat sessions, lets you start a
 * new conversation, and highlights the active one. Collapsible (280px ↔ 56px) like
 * Rill's `ConversationSidebar`.
 */
export function ConversationSidebar({ chatSessions, activeChatId, onSelect, onNew }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn("ai-sidebar", collapsed && "ai-sidebar--collapsed")}>
      <div className="ai-sidebar-header">
        {!collapsed && <span className="ai-sidebar-title">Conversations</span>}
        <div className="ai-sidebar-header-actions">
          {!collapsed && (
            <button type="button" className="ai-sidebar-new" onClick={onNew} title="New conversation">
              <Plus size={14} />
              <span>New</span>
            </button>
          )}
          <button
            type="button"
            className="ai-sidebar-collapse"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
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
              title={collapsed ? chat.title : undefined}
            >
              <MessageSquare size={15} className="ai-sidebar-item-icon" />
              {!collapsed && (
                <span className="ai-sidebar-item-title">{chat.title}</span>
              )}
            </button>
          );
        })}
        {chatSessions.length === 0 && !collapsed ? (
          <div className="ai-sidebar-empty">No conversations yet.</div>
        ) : null}
      </div>
    </aside>
  );
}

export default ConversationSidebar;
