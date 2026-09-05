import { useMemo } from "react";
import { Messages } from "@rilldata/web-common/features/chat/core/messages/react";
import { toRillChartMessages } from "./rillChatAdapter";

/**
 * RillChartStream — renders the chart portion of a product chat message.
 *
 * Maps the store's `toolCalls` onto the Rill `V1Message[]` shape (via
 * `rillChatAdapter`) and renders it with the ported `Messages` renderer, which
 * routes each `create_chart` call through `ChartBlock` (collapsible tool-call
 * header + live chart). Non-chart tool calls are not handled here — the product
 * keeps rendering those through its own dispatcher, so composer/tool behavior
 * is preserved. Returns `null` when the message has no chart tool calls.
 */
export function RillChartStream({ message, metricsView }) {
  const messages = useMemo(
    () => toRillChartMessages(message, { metricsView }),
    [message, metricsView],
  );

  if (messages.length === 0) return null;

  return (
    <div className="chat-rill-chart-blocks">
      <Messages messages={messages} />
    </div>
  );
}
