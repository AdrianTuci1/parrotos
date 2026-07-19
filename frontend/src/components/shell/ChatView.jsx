import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { apiClient } from "@/services/ApiClient";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/shell/ChatPanel";
import { CONNECTOR_AUTH_FIELDS, DEFAULT_FIELDS } from "@/components/shell/connectorAuthFields";
import { ChatComposer } from "@/components/shell/ChatComposer";
import "@/styles/chat.css";

/**
 * ChatView — orchestrator.
 * Layout: ChatPanel (scrollable) + ChatComposer at bottom.
 * When an action is waiting, ChatComposer hides and the action
 * form renders inside ChatPanel at the end of the message stream.
 */
export function ChatView() {
  const {
    chatSessions,
    activeChatId,
    createChatSession,
    addMessage,
    demoMode,
    currentOrganization,
    currentWorkspace,
    fetchConnectorAuthConfig,
    submitToolResponse,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [approvalStates, setApprovalStates] = useState({});
  const [connectorAuthFields, setConnectorAuthFields] = useState({});
  const [demoBannerVisible, setDemoBannerVisible] = useState(false);
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

  const pendingConnector = pendingAction?.toolCall?.connector;

  useEffect(() => {
    if (!activeChatId && chatSessions.length > 0) {
      useAppStore.setState({ activeChatId: chatSessions[0].id });
    }
  }, [activeChatId, chatSessions]);

  useEffect(() => {
    const connector = pendingConnector;
    if (!connector || demoMode || !currentOrganization?.id || !currentWorkspace?.id) {
      return;
    }
    if (connectorAuthFields[connector]) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const config = await fetchConnectorAuthConfig(currentOrganization.id, currentWorkspace.id, connector);
        if (!cancelled && config) {
          setConnectorAuthFields((current) => ({ ...current, [connector]: config }));
        }
      } catch (error) {
        void error;
        if (!cancelled) {
          setConnectorAuthFields((current) => ({
            ...current,
            [connector]: CONNECTOR_AUTH_FIELDS[connector] || DEFAULT_FIELDS,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pendingConnector,
    demoMode,
    currentOrganization?.id,
    currentWorkspace?.id,
    fetchConnectorAuthConfig,
    connectorAuthFields,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamContent]);

  // ═══════════════════════════════════════════════
  // SSE STREAMING
  // ═══════════════════════════════════════════════

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming || pendingAction) return;

    if (demoMode) {
      setDemoBannerVisible(true);
      setTimeout(() => setDemoBannerVisible(false), 1000);
      return;
    }

    let currentChatId = activeChatId;

    if (!currentChatId) {
      const newSession = createChatSession(text.slice(0, 30));
      currentChatId = newSession.id;
    } else if (messages.length === 0) {
      useAppStore.setState((state) => ({
        chatSessions: state.chatSessions.map((chat) =>
          chat.id === currentChatId ? { ...chat, title: text.slice(0, 30) } : chat
        ),
      }));
    }

    addMessage(currentChatId, { role: "user", content: text });
    setInput("");
    setStreaming(true);
    setStreamContent("");

    try {
      const baseUrl = apiClient.baseUrl;
      const token = localStorage.getItem("token") || "";
      const url = `${baseUrl}/organizations/${currentOrganization?.id}/projects/${currentWorkspace?.id}/chat/message`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ sessionId: currentChatId, message: text }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      const toolResults = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") { fullContent += event.content; setStreamContent(fullContent); }
            else if (event.type === "tool_result") toolResults.push(event);
            else if (event.type === "error") { fullContent = event.message; setStreamContent(fullContent); }
          } catch (error) {
            void error;
          }
        }
      }

      if (fullContent || toolResults.length > 0) {
        addMessage(currentChatId, { role: "assistant", content: fullContent || null, toolCalls: toolResults.length > 0 ? toolResults : undefined });
      }
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

  const handleApprove = useCallback(async (key) => {
    setApprovalStates(prev => ({ ...prev, [key]: "executing" }));

    const pending = pendingAction;
    if (!pending) return;

    const tc = pending.toolCall;
    const isKeyInput = tc.action === "open_integration_modal";

    try {
      let payload = {};

      if (isKeyInput) {
        const connector = tc.connector || "integration";
        const authConfig = connectorAuthFields[connector] || CONNECTOR_AUTH_FIELDS[connector] || DEFAULT_FIELDS;
        const fields = authConfig.fields || DEFAULT_FIELDS.fields;
        const values = {};
        // Extract values from the pending action card inputs in the DOM
        const container = document.querySelector('.chat-pending-action-card');
        if (container) {
          const inputs = container.querySelectorAll('input, textarea');
          inputs.forEach((input, idx) => {
            if (fields[idx]) values[fields[idx].key] = input.value;
          });
        }
        payload = { connector_type: connector, credentials: values };
      } else if (tc.type === "choice" || tc.action === "show_choices") {
        payload = { selected: tc.choices?.[0]?.label };
      }

      await submitToolResponse(
        currentOrganization?.id,
        currentWorkspace?.id,
        tc.id,
        isKeyInput ? "open_integration_modal" : (tc.type === "choice" ? "show_choices" : tc.action),
        payload
      );

      setApprovalStates(prev => ({ ...prev, [key]: "approved" }));
    } catch {
      setApprovalStates(prev => ({ ...prev, [key]: "rejected" }));
    }
  }, [pendingAction, currentOrganization, currentWorkspace, connectorAuthFields, submitToolResponse]);

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
      {demoBannerVisible && (
        <div className="chat-demo-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>You can't send messages in demo mode.</span>
        </div>
      )}
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
            connectorAuthFields={connectorAuthFields}
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
