import {
  MessageContentType,
  ToolName,
} from "@rilldata/web-common/features/chat/core/types";
import { toRillChartMessagePair } from "@/components/shell/rillChatAdapter";

/**
 * Product chat message -> Rill `V1Message[]` bridge for the AI view.
 *
 * Rill's `Messages` React port renders `V1Message[]` through `transformToBlocks`:
 * router_agent messages become text blocks, `create_chart` CALL/RESULT pairs become
 * chart blocks. We map the store's messages onto that model so the AI view renders
 * Rill-style text + chart blocks:
 *   - a user message  -> `{ role:"user", tool:router_agent, contentData:{prompt} }`
 *   - an assistant    -> `{ role:"assistant", tool:router_agent, contentData:{response} }`
 *     plus one `create_chart` CALL/RESULT pair per chart toolCall.
 */
export function chatMessageToV1Messages(chatMessage, { metricsView } = {}) {
  if (!chatMessage) return [];

  const id = chatMessage.id || "msg";
  if (chatMessage.role === "user") {
    const content = chatMessage.content || "";
    return [
      {
        id: `${id}-user`,
        role: "user",
        tool: ToolName.ROUTER_AGENT,
        contentType: MessageContentType.JSON,
        contentData: JSON.stringify({ prompt: content }),
      },
    ];
  }

  const messages = [];
  if (chatMessage.content) {
    messages.push({
      id: `${id}-text`,
      role: "assistant",
      tool: ToolName.ROUTER_AGENT,
      contentType: MessageContentType.JSON,
      contentData: JSON.stringify({ response: chatMessage.content }),
    });
  }

  for (const tool of chatMessage.toolCalls || []) {
    const pair = toRillChartMessagePair(tool, { metricsView });
    if (pair) messages.push(pair.message, pair.resultMessage);
  }

  return messages;
}

/** Flatten a store's messages into a single Rill `V1Message[]` for `<Messages>`. */
export function toV1Messages(messages, { metricsView } = {}) {
  return (messages || []).flatMap((m) =>
    chatMessageToV1Messages(m, { metricsView }),
  );
}

export default toV1Messages;
