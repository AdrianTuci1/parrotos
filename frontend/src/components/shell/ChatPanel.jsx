import { useRef, useEffect, useState } from "react";
import { BarChart3, Plug, Check, X, Loader2, ShieldCheck, CornerDownLeft } from "lucide-react";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { cn } from "@/lib/utils";
import { CONNECTOR_AUTH_FIELDS, DEFAULT_FIELDS } from "@/components/shell/connectorAuthFields";

// ═══════════════════════════════════════════════
// CHAT PANEL — scrollable messages + inline composers
// ═══════════════════════════════════════════════

/**
 * ChatPanel renders the scrollable message list, tool results,
 * inline action composers (key input, multi-choice), and streaming indicator.
 * When an inline composer is pending (waiting for user input),
 * the parent should hide the main ChatComposer.
 */
export function ChatPanel({ messages, streaming, streamContent, approvalStates, pendingAction, onApprove, onReject, messagesEndRef, connectorAuthFields = CONNECTOR_AUTH_FIELDS }) {
  const containerRef = useRef(null);

  // When pending action appears, scroll chat to bottom
  useEffect(() => {
    if (pendingAction && containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [pendingAction]);

  return (
    <div ref={containerRef} className="chat-messages-container">
      <div className="chat-messages-inner">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <div key={message.id} className={cn("chat-message-row", isUser ? "user" : "assistant")}>
            <div className="chat-message-content-wrapper">
              {message.content && (
                <div className={cn("chat-message-bubble", isUser ? "user" : "assistant")}>
                  {isUser ? message.content : <FormattedText text={message.content} />}
                </div>
              )}
              {(() => {
                const calls = message.toolCalls || [];
                const result = [];
                let smallGroup = [];
                const isSmall = (tc) => tc.type === "widget" && tc.size !== "4x1" && tc.size !== "4x2";

                const flushGroup = () => {
                  if (smallGroup.length === 0) return;
                  result.push(
                    <div key={`grp-${smallGroup[0].idx}`} className="chat-widget-row">
                      {smallGroup.map(({ tool, idx }) => (
                        <ToolResult
                          key={idx}
                          tool={tool}
                          msgId={message.id}
                          tcIdx={idx}
                          approvalState={approvalStates[`${message.id}-${idx}`] || tool.status || "pending"}
                          onApprove={onApprove}
                          onReject={onReject}
                          connectorAuthFields={connectorAuthFields}
                        />
                      ))}
                    </div>
                  );
                  smallGroup = [];
                };

                calls.forEach((tool, idx) => {
                  if (isSmall(tool)) {
                    smallGroup.push({ tool, idx });
                  } else {
                    flushGroup();
                    result.push(
                      <ToolResult
                        key={idx}
                        tool={tool}
                        msgId={message.id}
                        tcIdx={idx}
                        approvalState={approvalStates[`${message.id}-${idx}`] || tool.status || "pending"}
                        onApprove={onApprove}
                        onReject={onReject}
                        connectorAuthFields={connectorAuthFields}
                      />
                    );
                  }
                });
                flushGroup();
                return result;
              })()}
              {message.toolCalls?.find(t => t.type === "suggestion") && (
                <ConnectorSuggestions
                  tool={message.toolCalls.find(t => t.type === "suggestion")}
                  msgId={message.id}
                  onApprove={onApprove}
                />
              )}
            </div>
          </div>
        );
      })}

      {streaming && (
        <div className="chat-message-row assistant">
          <div className="chat-message-content-wrapper">
            <div className="chat-message-bubble assistant">
              {streamContent || <span className="chat-thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
      </div>
      {pendingAction && (
        <div className="chat-pending-action-sticky">
          <PendingActionBar
            action={pendingAction}
            onApprove={onApprove}
            onReject={onReject}
            connectorAuthFields={connectorAuthFields}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TOOL RESULT DISPATCHER
// ═══════════════════════════════════════════════

function ToolResult({ tool, msgId, tcIdx, approvalState, onApprove, onReject, connectorAuthFields = CONNECTOR_AUTH_FIELDS }) {
  const key = `${msgId}-${tcIdx}`;

  if (tool.type === "widget") {
    const widgetType = tool.widgetType || "metric";
    const widgetSize = tool.size || "2x1";
    const widgetConfig = tool.config || {};
    return (
      <div className="chat-embedded-widget">
        <div className="chat-embedded-widget-header">
          <BarChart3 size={14} />
          <span>{tool.title || tool.queryRef}</span>
        </div>
        <WidgetRenderer
          spec={{ id: tool.queryRef, type: widgetType, queryRef: tool.queryRef, size: widgetSize, config: widgetConfig }}
          layoutSpec={{ queries: [] }}
        />
      </div>
    );
  }

  // Actions: pending → shown at bottom; resolved → inline card
  if ((tool.type === "action" && tool.action === "open_integration_modal") || tool.type === "choice" || tool.action === "show_choices") {
    if (approvalState === "pending") return null; // rendered at end of chat via pendingAction
    return (
      <InlineActionComposer
        variant={tool.action === "open_integration_modal" ? "key-input" : "choice"}
        connector={tool.connector}
        choices={tool.choices}
        title={tool.title}
        subtitle={tool.subtitle || tool.reason}
        approvalKey={key}
        status={approvalState}
        onApprove={onApprove}
        onReject={onReject}
        connectorAuthFields={connectorAuthFields}
      />
    );
  }

  if (tool.type === "query_result") {
    return <QueryResultTable tool={tool} />;
  }

  return null;
}

// ═══════════════════════════════════════════════
// PENDING ACTION BAR — sticky at bottom, Approve/Deny in header
// ═══════════════════════════════════════════════



function PendingActionBar({ action, onApprove, onReject, connectorAuthFields = CONNECTOR_AUTH_FIELDS }) {
  const tc = action.toolCall;
  const isKeyInput = tc.action === "open_integration_modal";
  const connector = tc.connector || "integration";
  const auth = isKeyInput ? (connectorAuthFields[connector] || DEFAULT_FIELDS) : null;
  const fields = auth?.fields || [];
  const [fieldValues, setFieldValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );

  const handleApprove = () => {
    if (isKeyInput) {
      onApprove(action.key, { credentials: fieldValues });
    } else {
      onApprove(action.key);
    }
  };

  const handleChoiceClick = (choice) => {
    onApprove(action.key, { selected: choice.label });
  };

  return (
    <div className="chat-pending-action-card">
      <div className="chat-pending-action-header">
        <span className="chat-pending-action-title">
          {isKeyInput ? `Requesting ${connector} credentials` : (tc.title || "Choose an option")}
        </span>
        <div className="chat-pending-key-hints">
          <button className="chat-pending-key-btn" onClick={() => onReject(action.key)}>
            Deny <kbd>Esc</kbd>
          </button>
          <button className="chat-pending-key-btn" onClick={handleApprove}>
            Approve <kbd><CornerDownLeft size={11} /></kbd>
          </button>
        </div>
      </div>

      {isKeyInput && fields.length > 0 && (
        <div className="chat-pending-action-fields">
          {fields.map((f, idx) => (
            <input
              key={f.key}
              type={f.type === "password" ? "password" : "text"}
              placeholder={f.placeholder || f.label}
              className="chat-command-input"
              autoComplete="off"
              autoFocus={idx === 0}
              value={fieldValues[f.key] || ""}
              onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApprove(); } }}
            />
          ))}
        </div>
      )}

      {!isKeyInput && tc.choices && (
        <div className="chat-pending-action-fields choice-row">
          {(tc.choices || []).map((choice, i) => (
            <button
              key={i}
              className="chat-command-choice-btn"
              onClick={() => handleChoiceClick(choice)}
            >
              {choice.label}
              {choice.description && <span className="chat-command-choice-desc">{choice.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// INLINE ACTION COMPOSER — for resolved states (approved/rejected/executing)
// ═══════════════════════════════════════════════

/**
 * InlineActionComposer — renders resolved action badges.
 * Pending state is handled by PendingActionBar (sticky at bottom).
 *
 * variant="key-input"  → form fields (API keys, domain, etc.) + Approve/Cancel
 * variant="choice"     → list of clickable option buttons
 */
function InlineActionComposer({ variant, connector, approvalKey, status, onApprove, onReject, choices, title, subtitle, connectorAuthFields = CONNECTOR_AUTH_FIELDS }) {
  // --- KEY-INPUT variant (connector auth form) ---
  if (variant === "key-input") {
    const auth = connectorAuthFields[connector] || { ...DEFAULT_FIELDS, method: `${connector} API` };

    if (status === "approved") {
      return (
        <div className="chat-command-card approved">
          <div className="chat-command-status"><Check size={16} /></div>
          <div className="chat-command-body">
            <span className="chat-command-title">{connector} connected</span>
            <span className="chat-command-subtitle">Credentials saved. Data sync will begin shortly.</span>
          </div>
        </div>
      );
    }

    if (status === "rejected") {
      return (
        <div className="chat-command-card rejected">
          <div className="chat-command-status"><X size={16} /></div>
          <div className="chat-command-body">
            <span className="chat-command-title">Cancelled</span>
            <span className="chat-command-subtitle">{connector} connection was not created.</span>
          </div>
        </div>
      );
    }

    if (status === "executing") {
      return (
        <div className="chat-command-card executing">
          <div className="chat-command-status"><Loader2 size={16} className="spin" /></div>
          <div className="chat-command-body">
            <span className="chat-command-title">Connecting {connector}...</span>
            <span className="chat-command-subtitle">Validating credentials and setting up data pipeline.</span>
          </div>
        </div>
      );
    }

    // pending — show approval form
    return (
      <div className="chat-command-card pending">
        <div className="chat-command-header">
          <ShieldCheck size={16} />
          <div>
            <span className="chat-command-title">Connect {connector}</span>
            <span className="chat-command-subtitle">{auth.method} · {auth.help}</span>
          </div>
        </div>
        <div className="chat-command-fields">
          {auth.fields.map((f) => (
            <label key={f.key} className="chat-command-field">
              <span className="chat-command-field-label">{f.label}</span>
              <input
                type={f.type === "password" ? "password" : "text"}
                placeholder={f.placeholder || ""}
                className="chat-command-input"
                autoComplete="off"
              />
            </label>
          ))}
        </div>
        <div className="chat-command-actions">
          <button className="chat-command-btn approve" onClick={() => onApprove(approvalKey)}>
            <Check size={14} /> Approve
          </button>
          <button className="chat-command-btn reject" onClick={() => onReject(approvalKey)}>
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  // --- CHOICE variant (multi-option selection) ---
  if (variant === "choice") {
    if (status === "approved") {
      return (
        <div className="chat-command-card approved">
          <div className="chat-command-status"><Check size={16} /></div>
          <div className="chat-command-body">
            <span className="chat-command-title">Selection confirmed</span>
            <span className="chat-command-subtitle">Your choice has been recorded.</span>
          </div>
        </div>
      );
    }

    if (status === "rejected") {
      return (
        <div className="chat-command-card rejected">
          <div className="chat-command-status"><X size={16} /></div>
          <div className="chat-command-body">
            <span className="chat-command-title">Selection skipped</span>
            <span className="chat-command-subtitle">No action was taken.</span>
          </div>
        </div>
      );
    }

    if (status === "executing") {
      return (
        <div className="chat-command-card executing">
          <div className="chat-command-status"><Loader2 size={16} className="spin" /></div>
          <div className="chat-command-body">
            <span className="chat-command-title">Applying selection...</span>
            <span className="chat-command-subtitle">Processing your choice.</span>
          </div>
        </div>
      );
    }

    // pending — show choices
    return (
      <div className="chat-command-card pending">
        <div className="chat-command-header">
          <ShieldCheck size={16} />
          <div>
            <span className="chat-command-title">{title || "Choose an option"}</span>
            {subtitle && <span className="chat-command-subtitle">{subtitle}</span>}
          </div>
        </div>
        <div className="chat-command-choices">
          {(choices || []).map((choice, i) => (
            <button
              key={i}
              className="chat-command-choice-btn"
              onClick={() => onApprove(approvalKey)}
            >
              {choice.label}
              {choice.description && <span className="chat-command-choice-desc">{choice.description}</span>}
            </button>
          ))}
        </div>
        <div className="chat-command-actions">
          <button className="chat-command-btn reject" onClick={() => onReject(approvalKey)}>
            <X size={14} /> Skip
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════
// CONNECTOR SUGGESTIONS
// ═══════════════════════════════════════════════

function ConnectorSuggestions({ tool, msgId, onApprove }) {
  if (!tool) return null;
  return (
    <div className="chat-suggestions">
      {tool.reason && <p className="chat-suggestion-reason">{tool.reason}</p>}
      <div className="chat-suggestion-list">
        {(tool.connectors || []).map((name) => (
          <button
            key={name}
            className="chat-suggestion-btn"
            onClick={() => {
              const fakeKey = `${msgId}-suggest-${name}`;
              onApprove(fakeKey);
            }}
          >
            <Plug size={14} />
            Connect {name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// FORMATTED TEXT
// ═══════════════════════════════════════════════

function FormattedText({ text }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, pi) => {
        const lines = p.split(/\n/);
        return (
          <p key={pi} className="chat-paragraph">
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                <FormatLine text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function FormatLine({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="chat-highlight">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="chat-inline-code">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ═══════════════════════════════════════════════
// QUERY RESULT TABLE
// ═══════════════════════════════════════════════

function QueryResultTable({ tool }) {
  const { result } = tool;
  if (!result) return null;
  const columns = result.columns || [];
  const rows = result.rows || [];
  const total = result.total;
  return (
    <div className="chat-query-result">
      <span className="chat-query-label">{tool.question}</span>
      <div className="chat-query-table-wrap">
        <table className="chat-query-table">
          <thead><tr>{columns.map((col, i) => <th key={i}>{col}</th>)}</tr></thead>
          <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {total && (
        <div className="chat-query-totals">
          {Object.entries(total).map(([key, val]) => (
            <span key={key} className="chat-query-total-item">
              <span className="chat-query-total-label">{key}</span>
              <span className="chat-query-total-value">{val}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
