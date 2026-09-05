import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import { resolveRuntimeConfig } from "@/data/dataSource";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/shell/ChatPanel";
import { ChatComposer } from "@/components/shell/ChatComposer";
import { sendToRillRouter, DEFAULT_AGENT } from "@/components/shell/rillRouter";
import "@/styles/chat.css";

// Metrics view targeted by the ported Rill chart path. Injected into chart specs
// that omit one so ChartBlock queries a real metrics view from the runtime.
const CHART_METRICS_VIEW = resolveRuntimeConfig().defaultMetricsView;

/**
 * ChatView — orchestrator.
 * Layout: ChatPanel (scrollable) + ChatComposer at bottom.
 * When an action is waiting, ChatComposer hides and the action
 * form renders inside ChatPanel at the end of the message stream.
 */
export function ChatView() {
  const runtimeClient = useRuntimeClient();
  const {
    chatSessions,
    activeChatId,
    createChatSession,
    addMessage,
    setChatConversationId,
    currentOrganization,
    currentWorkspace,
    submitToolResponse,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [approvalStates, setApprovalStates] = useState({});
  const messagesEndRef = useRef(null);

  const activeChat = chatSessions.find((chat) => chat.id === activeChatId);
  const messages = activeChat?.messages || [];

  // Find the first pending action toolCall across all messages
  const pendingAction = (() => {
    for (const msg of messages) {
      if (!msg.toolCalls) continue;
      for (let idx = 0; idx < msg.toolCalls.length; idx++) {
        const tc = msg.toolCalls[idx];
        const isAction = (tc.type === "action" && tc.action === "open_integration_modal")
                      || tc.type === "choice"
                      || tc.action === "show_choices";
        if (!isAction) continue;
        const state = approvalStates[`${msg.id}-${idx}`] || tc.status || "pending";
        if (state === "pending") {
          return { toolCall: tc, msgId: msg.id, idx, key: `${msg.id}-${idx}` };
        }
      }
    }
    return null;
  })();

  useEffect(() => {
    if (currentOrganization?.id && currentWorkspace?.id) {
      useAppStore.getState().fetchChatSessions(currentOrganization.id, currentWorkspace.id);
    }
  }, [currentOrganization?.id, currentWorkspace?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamContent]);

  // ═══════════════════════════════════════════════
  // RILL AGENT ROUTER SEND
  // ═══════════════════════════════════════════════

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming || pendingAction) return;

    if (!currentWorkspace?.id) {
      alert("Please select or create a workspace first.");
      return;
    }

    let currentChatId = activeChatId;
    const chatTitle = text.length > 50 ? text.slice(0, 47) + '...' : text;

    if (!currentChatId) {
      const newSession = createChatSession(chatTitle);
      currentChatId = newSession.id;
    } else if (messages.length === 0) {
      useAppStore.setState((state) => ({
        chatSessions: state.chatSessions.map((chat) =>
          chat.id === currentChatId ? { ...chat, title: chatTitle } : chat
        ),
      }));
    }

    // Continue the same Rill runtime conversation (if any) for this session.
    const rillConversationId = activeChat?.conversationId;

    addMessage(currentChatId, { role: "user", content: text });
    setInput("");
    setStreaming(true);
    setStreamContent("");

    try {
      // Route the prompt through Rill's agent router (analyst_agent). The runtime
      // emits router_agent text + create_chart tool calls, which the adapter maps
      // into product-shaped toolCalls so ChatPanel renders a real chart.
      const result = await sendToRillRouter({
        runtimeClient,
        prompt: text,
        conversationId: rillConversationId,
        agent: DEFAULT_AGENT,
      });

      if (result.conversationId) {
        setChatConversationId(currentChatId, result.conversationId);
      }

      addMessage(currentChatId, {
        role: "assistant",
        content: result.text || null,
        toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
      });
    } catch (error) {
      void error;
      addMessage(currentChatId, { role: "assistant", content: "Sorry, I couldn\u2019t reach the AI service." });
    }

    setStreaming(false);
    setStreamContent("");
  };

  // ═══════════════════════════════════════════════
  // INLINE ACTION HANDLERS
  // ═══════════════════════════════════════════════

  const handleApprove = useCallback(async (key, payload = null) => {
    setApprovalStates(prev => ({ ...prev, [key]: "executing" }));

    const pending = pendingAction;
    if (!pending) return;

    const tc = pending.toolCall;
    const isKeyInput = tc.action === "open_integration_modal";

    try {
      let finalPayload = payload;

      if (isKeyInput) {
        const connector = tc.connector || "integration";
        const values = {};
        // Extract values from the rendered credential fields (generic)
        const container = document.querySelector('.chat-pending-action-fields');
        if (container) {
          container.querySelectorAll('input').forEach((input, idx) => {
            values[`field${idx}`] = input.value;
          });
        }
        finalPayload = { connector_type: connector, credentials: values };
      } else if (tc.type === "choice" || tc.action === "show_choices") {
        if (!finalPayload || !finalPayload.selected) {
          finalPayload = { selected: tc.choices?.[0]?.label };
        } else {
          finalPayload = { selected: finalPayload.selected };
        }
      }

      await submitToolResponse(
        currentOrganization?.id,
        currentWorkspace?.id,
        tc.id,
        isKeyInput ? "open_integration_modal" : (tc.type === "choice" ? "show_choices" : tc.action),
        finalPayload
      );

      setApprovalStates(prev => ({ ...prev, [key]: "approved" }));
    } catch {
      setApprovalStates(prev => ({ ...prev, [key]: "rejected" }));
    }
  }, [pendingAction, currentOrganization, currentWorkspace, submitToolResponse]);

  const handleReject = useCallback((key) => {
    setApprovalStates(prev => ({ ...prev, [key]: "rejected" }));
  }, []);

  // Keyboard shortcuts: Enter → approve, Escape → deny (skip when focused in input)
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

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

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
            metricsView={CHART_METRICS_VIEW}
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
