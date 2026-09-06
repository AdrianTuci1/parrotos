import { useState, useCallback } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import { resolveRuntimeConfig } from "@/data/dataSource";
import { sendToRillRouter, DEFAULT_AGENT } from "@/components/shell/rillRouter";

const CHART_METRICS_VIEW = resolveRuntimeConfig().defaultMetricsView;

/**
 * Shared chat controller: send / stream / approve / reject logic for the AI view.
 *
 * Drives the Rill agent router (analyst_agent) for a conversation identified by the
 * active chat session, streaming into the app store's message list. Exposes the
 * state and handlers both the full-page AI view and the legacy inline chat consume,
 * so the send path stays identical across surfaces.
 */
export function useChatController() {
  const runtimeClient = useRuntimeClient();
  const {
    chatSessions,
    activeChatId,
    createChatSession,
    addMessage,
    setChatConversationId,
    selectChat,
    currentOrganization,
    currentWorkspace,
    submitToolResponse,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [approvalStates, setApprovalStates] = useState({});

  const activeChat = chatSessions.find((chat) => chat.id === activeChatId);
  const messages = activeChat?.messages || [];

  // First pending action toolCall across the active conversation's messages.
  const pendingAction = (() => {
    for (const msg of messages) {
      if (!msg.toolCalls) continue;
      for (let idx = 0; idx < msg.toolCalls.length; idx++) {
        const tc = msg.toolCalls[idx];
        const isAction =
          (tc.type === "action" && tc.action === "open_integration_modal") ||
          tc.type === "choice" ||
          tc.action === "show_choices";
        if (!isAction) continue;
        const state = approvalStates[`${msg.id}-${idx}`] || tc.status || "pending";
        if (state === "pending") {
          return { toolCall: tc, msgId: msg.id, idx, key: `${msg.id}-${idx}` };
        }
      }
    }
    return null;
  })();

  const handleSend = useCallback(async (promptArg) => {
    const text = (promptArg ?? input).trim();
    if (!text || streaming || pendingAction) return;
    if (!currentWorkspace?.id) {
      alert("Please select or create a workspace first.");
      return;
    }

    let currentChatId = activeChatId;
    const chatTitle = text.length > 50 ? text.slice(0, 47) + "..." : text;

    if (!currentChatId) {
      const newSession = createChatSession(chatTitle);
      currentChatId = newSession.id;
    } else if (messages.length === 0) {
      useAppStore.setState((state) => ({
        chatSessions: state.chatSessions.map((chat) =>
          chat.id === currentChatId ? { ...chat, title: chatTitle } : chat,
        ),
      }));
    }

    const rillConversationId = activeChat?.conversationId;

    addMessage(currentChatId, { role: "user", content: text });
    setInput("");
    setStreaming(true);
    setStreamContent("");

    try {
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
    } catch {
      addMessage(currentChatId, {
        role: "assistant",
        content: "Sorry, I couldn’t reach the AI service.",
      });
    }

    setStreaming(false);
    setStreamContent("");
  }, [input, streaming, pendingAction, currentWorkspace, activeChatId, activeChat, messages.length, runtimeClient, createChatSession, addMessage, setChatConversationId]);

  const handleApprove = useCallback(async (key, payload = null) => {
    setApprovalStates((prev) => ({ ...prev, [key]: "executing" }));
    const pending = pendingAction;
    if (!pending) return;

    const tc = pending.toolCall;
    const isKeyInput = tc.action === "open_integration_modal";

    try {
      let finalPayload = payload;
      if (isKeyInput) {
        const connector = tc.connector || "integration";
        const values = {};
        const container = document.querySelector(".chat-pending-action-fields");
        if (container) {
          container.querySelectorAll("input").forEach((input, idx) => {
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
        finalPayload,
      );

      setApprovalStates((prev) => ({ ...prev, [key]: "approved" }));
    } catch {
      setApprovalStates((prev) => ({ ...prev, [key]: "rejected" }));
    }
  }, [pendingAction, currentOrganization, currentWorkspace, submitToolResponse]);

  const handleReject = useCallback((key) => {
    setApprovalStates((prev) => ({ ...prev, [key]: "rejected" }));
  }, []);

  return {
    runtimeClient,
    chatSessions,
    activeChatId,
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
    selectChat,
    createChatSession,
    metricsView: CHART_METRICS_VIEW,
  };
}

export default useChatController;
