import { useEffect } from "react";
import { useChatController } from "@/components/chat/useChatController";
import { ChatConversation } from "@/components/chat/ChatConversation";
import "@/styles/chat.css";

/**
 * Parrot-style `/ai` view: full-page chat.
 *
 * Reuses the shared chat controller for the send/stream/approve path and Parrot's
 * `Messages` React port for the message stream (text / thinking / tool-call / chart
 * blocks). The conversation rail lives in the main project sidebar (see ParrotSidebar),
 * which swaps the file tree for the session list while on this menu.
 */
export function AiView() {
  const {
    messages,
    streaming,
    pendingAction,
    handleSend,
    handleApprove,
    handleReject,
    metricsView,
  } = useChatController();

  // Keyboard shortcuts for the pending action bar (Enter → approve, Esc → deny).
  useEffect(() => {
    if (!pendingAction) return;
    const handler = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleApprove(pendingAction.key);
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleReject(pendingAction.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pendingAction, handleApprove, handleReject]);

  return (
    <div className="ai-full-page">
      <ChatConversation
        messages={messages}
        streaming={streaming}
        pendingAction={pendingAction}
        metricsView={metricsView}
        onApprove={handleApprove}
        onReject={handleReject}
        onSend={handleSend}
      />
    </div>
  );
}

export default AiView;
