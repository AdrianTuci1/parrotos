import { useMemo } from "react";
import type { V1Message, V1Tool } from "@rilldata/web-common/runtime-client";
import { transformToBlocks } from "../block-transform";
import type { Block } from "../block-transform";
import type { SimpleToolCall } from "../simple-tool-call/simple-tool-call";
import type { TextBlock } from "../text/text-block";
import type { ThinkingBlock } from "../thinking/thinking-block";
import type { ChartBlock as ChartBlockModel } from "../chart/chart-block";
import { MessageType } from "../../types";
import { extractMessageText } from "../../utils";
import ChartBlock from "../chart/react/ChartBlock";
import ToolCall from "../tools/react/ToolCall";

/**
 * React translation of `Messages.svelte` (Phase 4, "charts render in chat").
 *
 * Reuses the framework-agnostic `transformToBlocks` to route each chat message into a
 * UI block, then renders chart blocks with the React `ChartBlock` (so `create_chart`
 * tool calls render as charts inline in the conversation) and tool calls with the
 * React `ToolCall`. Text/working/thinking/file-diff blocks get lightweight React
 * fallbacks; parity with their Svelte counterparts is a later increment.
 */
export interface MessagesProps {
  messages: V1Message[];
  tools?: V1Tool[] | undefined;
  isStreaming?: boolean;
  isConversationLoading?: boolean;
}

export default function Messages(props: MessagesProps) {
  const { messages, tools, isStreaming = false, isConversationLoading = false } =
    props;

  const blocks = useMemo(
    () => transformToBlocks(messages, isStreaming, isConversationLoading),
    [messages, isStreaming, isConversationLoading],
  );

  return (
    <div className="messages">
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} tools={tools} />
      ))}
    </div>
  );
}

function BlockRenderer(props: { block: Block; tools?: V1Tool[] | undefined }) {
  const { block, tools } = props;

  switch (block.type) {
    case "chart":
      return <ChartBlock block={block as ChartBlockModel} tools={tools} />;

    case "simple-tool-call-block": {
      const stc = block as SimpleToolCall;
      return (
        <ToolCall
          message={stc.message}
          resultMessage={stc.resultMessage}
          tools={tools}
          variant="block"
        />
      );
    }

    case "text": {
      const tb = block as TextBlock;
      const content = extractMessageText(tb.message);
      return (
        <div
          className={`chat-message-content ${tb.isError ? "text-error" : ""}`}
          data-testid="text-message"
        >
          {content}
        </div>
      );
    }

    case "thinking": {
      const tb = block as ThinkingBlock;
      const calls = tb.messages.filter((m) => m.type === MessageType.CALL);
      if (calls.length === 0) {
        return null;
      }
      return (
        <details className="thinking-block" open={!tb.isComplete}>
          <summary>Thinking…</summary>
          <div className="thinking-calls">
            {calls.map((m) => (
              <ToolCall
                key={m.id}
                message={m}
                resultMessage={tb.resultMessagesByParentId.get(m.id)}
                tools={tools}
                variant="inline"
              />
            ))}
          </div>
        </details>
      );
    }

    case "working":
      return (
        <div className="working-block" data-testid="working-block">
          Generating…
        </div>
      );

    case "file-diff":
      // File-diff rendering is not yet ported to React; render a neutral placeholder.
      return <div className="file-diff block">File diff</div>;

    default:
      return null;
  }
}
