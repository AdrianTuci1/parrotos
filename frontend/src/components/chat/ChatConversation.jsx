import { useEffect, useRef } from "react";
import { CornerDownLeft } from "lucide-react";
import { Messages } from "@rilldata/web-common/features/chat/core/messages/react";
import { ContextComposer } from "@/components/chat/ContextComposer";
import { toV1Messages } from "@/components/chat/v1Messages";

/**
 * Full-page conversation pane for the AI view.
 *
 * Renders the message stream with Rill's `Messages` React port (text / thinking /
 * tool-call / chart blocks fed from the store's messages through `toV1Messages`),
 * plus a pinned composer and a sticky approve/deny bar when a tool action is pending.
 */
export function ChatConversation({
  messages,
  streaming,
  pendingAction,
  metricsView,
  onApprove,
  onReject,
  onSend,
}) {
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const v1Messages = toV1Messages(messages, { metricsView });

  useEffect(() => {
    const node = containerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, v1Messages.length, streaming]);

  return (
    <div className="ai-main">
      <div ref={containerRef} className="ai-messages chat-rill-chart-blocks">
        <Messages messages={v1Messages} isStreaming={streaming} />
        <div ref={messagesEndRef} />
      </div>

      {pendingAction ? (
        <PendingBar action={pendingAction} onApprove={onApprove} onReject={onReject} />
      ) : (
        <div className="ai-composer">
          <ContextComposer onSend={onSend} streaming={streaming} />
        </div>
      )}
    </div>
  );
}

/** Compact approve/deny bar for a pending tool action (e.g. credential / choice). */
function PendingBar({ action, onApprove, onReject }) {
  const tc = action.toolCall;
  const isKeyInput = tc.action === "open_integration_modal";
  return (
    <div className="ai-pending-bar">
      <div className="ai-pending-info">
        <span className="ai-pending-title">
          {isKeyInput ? `Requesting ${tc.connector || "integration"} credentials` : (tc.title || "Action required")}
        </span>
      </div>
      <div className="ai-pending-actions">
        <button type="button" className="ai-pending-btn ai-pending-btn--deny" onClick={() => onReject(action.key)}>
          Deny <kbd>Esc</kbd>
        </button>
        <button type="button" className="ai-pending-btn ai-pending-btn--approve" onClick={() => onApprove(action.key)}>
          Approve <kbd><CornerDownLeft size={11} /></kbd>
        </button>
      </div>
    </div>
  );
}

export default ChatConversation;
