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
      const isUser = tb.message.role === "user";
      if (tb.isError) {
        return (
          <div className="ai-message ai-message--error" data-testid="text-message">
            {content}
          </div>
        );
      }
      return (
        <div
          className={`ai-message ${isUser ? "ai-message--user" : "ai-message--assistant"}`}
          data-testid="text-message"
        >
          {isUser ? content : <MarkdownText content={content} />}
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

/** Lightweight markdown render for assistant text (headings, lists, bold, code). */
function MarkdownText({ content }: { content: string }) {
  const blocks = (content || "").split(/\n{2,}/);
  return (
    <div className="chat-markdown">
      {blocks.map((block, i) => {
        const t = block.trim();
        if (/^###\s+/.test(t)) return <h4 key={i}>{t.replace(/^###\s+/, "")}</h4>;
        if (/^##\s+/.test(t)) return <h3 key={i}>{t.replace(/^##\s+/, "")}</h3>;
        if (/^#\s+/.test(t)) return <h2 key={i}>{t.replace(/^#\s+/, "")}</h2>;
        if (/^[-*]\s+/.test(t)) {
          const items = t.split("\n").filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ""));
          return <ul key={i}>{items.map((it, j) => <li key={j}>{inlineMd(it)}</li>)}</ul>;
        }
        return <p key={i}>{inlineMd(t)}</p>;
      })}
    </div>
  );
}

function inlineMd(text: string) {
  return (text || "").split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}
