import { useEffect } from "react";
import { useChatController } from "@/components/chat/useChatController";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatConversation } from "@/components/chat/ChatConversation";
import "@/styles/chat.css";

/**
 * Rill-style `/ai` view: full-page chat with a conversation rail.
 *
 * Reuses the shared chat controller for the send/stream/approve path and Rill's
 * `Messages` React port for the message stream (text / thinking / tool-call / chart
 * blocks). The rail lists the project's chat sessions from the app store.
 */
export function AiView() {
  const {
    chatSessions,
    activeChatId,
    messages,
    input,
    setInput,
    streaming,
    pendingAction,
    approvalStates,
    handleSend,
    handleApprove,
    handleReject,
    selectChat,
    createChatSession,
    metricsView,
  } = useChatController();

  // Keyboard shortcuts for the pending action bar (Enter → approve, Esc → deny).
  useEffect(() => {
    if (!pendingAction) return;
    const handler = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (event.key === "Enter") { event.preventDefault(); handleApprove(pendingAction.key); }
      else if (event.key === "Escape") { event.preventDefault(); handleReject(pendingAction.key); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pendingAction, handleApprove, handleReject]);

  return (
    <div className="ai-full-page">
      <div className="ai-layout">
        <ConversationSidebar
          chatSessions={chatSessions}
          activeChatId={activeChatId}
          onSelect={selectChat}
          onNew={() => createChatSession()}
        />
        <ChatConversation
          messages={messages}
          streaming={streaming}
          pendingAction={pendingAction}
          approvalStates={approvalStates}
          metricsView={metricsView}
          onApprove={handleApprove}
          onReject={handleReject}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}

export default AiView;
