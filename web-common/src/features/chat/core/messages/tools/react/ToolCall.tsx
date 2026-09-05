import { useMemo, useState } from "react";
import type { V1Message, V1Tool } from "@rilldata/web-common/runtime-client";
import { MessageContentType } from "../../../types";
import { getToolDisplayName } from "../tool-display-names";
import { isHiddenTool } from "../tool-registry";

/**
 * React translation of `ToolCall.svelte`. Reuses the framework-agnostic helpers
 * (getToolDisplayName / isHiddenTool) and renders a collapsible request/response
 * header. The Svelte `CodeBlock`/`Collapsible`/icon components are replaced with
 * minimal React equivalents; parity with their styling is a later increment.
 */
export interface ToolCallProps {
  message: V1Message;
  resultMessage?: V1Message | undefined;
  tools?: V1Tool[] | undefined;
  variant?: "inline" | "block";
}

export default function ToolCall(props: ToolCallProps) {
  const { message, resultMessage, tools, variant = "inline" } = props;

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");

  const isHidden = useMemo(
    () => isHiddenTool(message.tool),
    [message.tool],
  );
  const hasResult = !!resultMessage;
  const isError = resultMessage?.contentType === MessageContentType.ERROR;

  const toolDisplayName = getToolDisplayName(
    message.tool || "Unknown Tool",
    hasResult,
    tools,
  );

  const requestContent = formatContent(message);
  const responseContent = resultMessage ? formatContent(resultMessage) : "";

  if (isHidden) {
    return null;
  }

  return (
    <div className={`tool-call ${variant === "block" ? "block" : "inline"}`}>
      <button
        className="tool-button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <div className="tool-icon">
          {!hasResult && !isExpanded ? (
            <span className="tool-loading-spinner" aria-label="loading" />
          ) : (
            <span className="tool-caret">{isExpanded ? "▾" : "▸"}</span>
          )}
        </div>
        <div className="tool-name">{toolDisplayName}</div>
      </button>

      {isExpanded && (
        <div className="tool-content">
          <div className="tool-tabs">
            <button
              className={`tool-tab ${activeTab === "request" ? "active" : ""}`}
              onClick={() => setActiveTab("request")}
            >
              Request
            </button>
            <button
              className={`tool-tab ${activeTab === "response" ? "active" : ""}`}
              onClick={() => setActiveTab("response")}
            >
              {isError ? "Error" : "Response"}
            </button>
          </div>

          <div className="tool-tab-content">
            {activeTab === "request" ? (
              <pre className="tool-code">{requestContent}</pre>
            ) : hasResult ? (
              <pre className="tool-code">{responseContent}</pre>
            ) : (
              <div className="tool-loading">
                <span className="tool-loading-spinner" /> Waiting for response...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatContent(msg: V1Message): string {
  const rawContent = msg.contentData || "";

  switch (msg.contentType) {
    case MessageContentType.JSON:
      try {
        return JSON.stringify(JSON.parse(rawContent), null, 2);
      } catch {
        return rawContent;
      }
    case MessageContentType.TEXT:
    case MessageContentType.ERROR:
    default:
      return rawContent;
  }
}
