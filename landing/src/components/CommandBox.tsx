import { useEffect, useRef, useState } from "react";

export const INSTALL_COMMAND = "curl -fsSL https://get.statsparrot.com | sh";

type CopyState = "idle" | "copied" | "failed";

// navigator.clipboard is unavailable on insecure origins, so the fallback keeps
// the button working for previews served over plain http.
async function writeClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the selection-based copy
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CommandBox({ className }: { className?: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleCopy() {
    const ok = await writeClipboard(INSTALL_COMMAND);
    setState(ok ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className={`cmd-box${className ? ` ${className}` : ""}`}>
      <code className="cmd-text">
        <span className="cmd-prompt">$</span> {INSTALL_COMMAND}
      </code>
      <button type="button" className="cmd-copy" onClick={handleCopy}>
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "Install command copied to clipboard" : ""}
      </span>
    </div>
  );
}
