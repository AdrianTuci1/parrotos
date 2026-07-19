import { useState, useEffect, useCallback } from "react";

/**
 * ChatComposer — sticky bottom input bar.
 * Always visible, pinned at bottom.
 */
export function ChatComposer({
  input,
  onInputChange,
  onSend,
  streaming,
  placeholder = "Ask Parrot",
  isEmptyMode = false,
}) {
  const [recording, setRecording] = useState(false);

  const toggleRecording = useCallback(() => {
    setRecording((prev) => !prev);
  }, []);

  // F5 toggles recording
  useEffect(() => {
    const handler = (event) => {
      if (event.key === "F5") {
        event.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleRecording]);

  return (
    <div className="chat-active-input-footer">
      <div
        className={`chat-centered-composer-wrapper pill-composer ${isEmptyMode ? "chat-centered-composer-empty" : ""}`}
      >
        {recording ? (
          <div className="chat-waveform">
            <span className="chat-waveform-bar" />
            <span className="chat-waveform-bar" />
            <span className="chat-waveform-bar" />
            <span className="chat-waveform-bar" />
            <span className="chat-waveform-bar" />
          </div>
        ) : (
          <input
            type="text"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onSend()}
            placeholder={placeholder}
            className="chat-centered-text-input"
            disabled={streaming}
          />
        )}
        <button
          className={recording ? "chat-mic-btn recording" : "chat-mic-btn"}
          type="button"
          aria-label={recording ? "Stop recording" : "Voice input"}
          onClick={toggleRecording}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>
      </div>
    </div>
  );
}
