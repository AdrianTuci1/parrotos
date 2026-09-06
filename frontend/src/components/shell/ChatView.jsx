import { useEffect, useRef } from "react";
import { useChatController } from "@/components/chat/useChatController";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/shell/ChatPanel";
import { ChatComposer } from "@/components/shell/ChatComposer";
import "@/styles/chat.css";

/**
 * ChatView — legacy inline chat orchestrator.
 *
 * The `/ai` route now renders the full-page AI view (see `AiView`); this remains for
 * any inline / legacy use. Both share `useChatController` so the send + approve path
 * is identical. Layout: ChatPanel (scrollable) + ChatComposer at bottom.
 */
export function ChatView() {
  const {
    messages,
    input,
    setInput,
    streaming,
    streamContent,
    pendingAction,
    approvalStates,
    handleSend,
    handleApprove,
    handleReject,
    metricsView,
  } = useChatController();

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamContent]);

  return (
    <div className={cn("chat-main-wrapper", messages.length > 0 ? "chat-active-mode" : "chat-empty-mode")}>
      {messages.length > 0 ? (
        <>
          <ChatPanel
            messages={messages}
            streaming={streaming}
            streamContent={streamContent}
            approvalStates={approvalStates}
            pendingAction={pendingAction}
            onApprove={handleApprove}
            onReject={handleReject}
            messagesEndRef={messagesEndRef}
            metricsView={metricsView}
          />
          {!pendingAction && (
            <ChatComposer
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              streaming={streaming}
            />
          )}
        </>
      ) : (
        <div className="chat-centered-container">
          <ChatComposer
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            streaming={streaming}
            isEmptyMode
          />
        </div>
      )}
    </div>
  );
}
