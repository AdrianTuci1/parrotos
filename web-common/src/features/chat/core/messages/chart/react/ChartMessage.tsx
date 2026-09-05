import { useMemo } from "react";
import type { V1Message, V1Tool } from "@rilldata/web-common/runtime-client";
import { createChartBlock } from "../chart-block";
import ChartBlock from "./ChartBlock";

/**
 * React entry point for rendering a `create_chart` tool call as a chart in chat.
 *
 * Reuses the framework-agnostic `createChartBlock` parser (chart-block.ts) to turn a
 * tool-call message + its result message into a ChartBlock, then renders it with the
 * React `ChartBlock`. Returns null when the message is not a renderable chart, so the
 * chat message stream can drop it without a guard.
 */
export interface ChartMessageProps {
  message: V1Message;
  resultMessage?: V1Message | undefined;
  tools?: V1Tool[] | undefined;
}

export default function ChartMessage(props: ChartMessageProps) {
  const { message, resultMessage, tools } = props;

  const block = useMemo(
    () => createChartBlock(message, resultMessage),
    [message, resultMessage],
  );

  if (!block) {
    return null;
  }

  return <ChartBlock block={block} tools={tools} />;
}
