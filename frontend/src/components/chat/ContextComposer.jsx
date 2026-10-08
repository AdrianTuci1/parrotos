import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Mic, X } from "lucide-react";
import { mockMeasures, mockDimensions } from "@/data/mockCanvas";
import { MOCK_METRICS_VIEWS } from "@/data/dataSource";
import { cn } from "@/lib/utils";

/**
 * Parrot-style `@` inline-context composer.
 *
 * Typing `@` opens a picker of project context (measures / dimensions / canvases /
 * models). Selecting an item inserts it as a chip into the composer. On send the
 * prompt is composed from the serialized chips + free text (Parrot embeds these as
 * `InlineContext` inline nodes in the Tiptap editor; here we serialize them as
 * `@[kind:name]` tokens, which the real agent can parse and the mock router treats
 * as plain prompt text).
 */
const MODELS = [{ name: "orders" }, { name: "users" }];

function contextItems() {
  return [
    { group: "Measures", items: mockMeasures().map((m) => ({ kind: "measure", name: m })), icon: "M" },
    { group: "Dimensions", items: mockDimensions().map((m) => ({ kind: "dimension", name: m })), icon: "D" },
    { group: "Canvases", items: Object.keys(MOCK_METRICS_VIEWS).map((m) => ({ kind: "canvas", name: m })), icon: "C" },
    { group: "Models", items: MODELS.map((m) => ({ kind: "model", name: m.name })), icon: "T" },
  ];
}

export function ContextComposer({ onSend, streaming, placeholder = "Ask about your data…" }) {
  const [chips, setChips] = useState([]);
  const [text, setText] = useState("");
  const [picker, setPicker] = useState(null); // { query }
  const inputRef = useRef(null);

  const pickerData = contextItems();

  const filtered = useMemo(() => {
    if (!picker) return [];
    const q = picker.query.toLowerCase();
    return pickerData
      .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [picker, pickerData]);

  const onChange = (value) => {
    setText(value);
    const lastAt = value.lastIndexOf("@");
    if (lastAt >= 0 && value.slice(lastAt).length > 1) {
      setPicker({ query: value.slice(lastAt + 1) });
    } else if (value.endsWith("@")) {
      setPicker({ query: "" });
    } else {
      setPicker(null);
    }
  };

  const pick = (item) => {
    setChips((prev) => [...prev, { id: `${item.kind}-${item.name}-${Date.now()}`, kind: item.kind, name: item.name }]);
    setText("");
    setPicker(null);
    inputRef.current?.focus();
  };

  const send = () => {
    const inline = chips.map((c) => `@[${c.kind}:${c.name}]`).join(" ");
    const prompt = `${inline ? inline + "\n" : ""}${text.trim()}`.trim();
    if (!prompt || streaming) return;
    onSend(prompt);
    setChips([]);
    setText("");
    setPicker(null);
  };

  // Close the picker on outside click / Escape.
  useEffect(() => {
    if (!picker) return;
    const handler = (e) => {
      if (e.key === "Escape") { setPicker(null); return; }
      if (inputRef.current && !inputRef.current.contains(e.target)) setPicker(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [picker]);

  return (
    <div className="context-composer">
      <div className={cn("context-composer-box", streaming && "context-composer-box--busy")}>
        <div className="context-chips">
          {chips.map((c) => (
            <span key={c.id} className="context-chip">
              <AtSign size={11} />
              <span>{c.name}</span>
              <button type="button" className="context-chip-x" aria-label={`Remove ${c.name}`} onClick={() => setChips((prev) => prev.filter((x) => x.id !== c.id))}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          className="context-input"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); send(); }
            else if (e.key === "Escape") setPicker(null);
          }}
          placeholder={chips.length === 0 ? placeholder : "Add more…"}
          disabled={streaming}
        />
        <button className="context-mic" type="button" aria-label="Voice input">
          <Mic size={16} />
        </button>
      </div>

      {picker ? (
        <div className="context-picker">
          <div className="context-picker-title">Insert context</div>
          {filtered.length === 0 ? (
            <div className="context-picker-empty">No matches.</div>
          ) : (
            filtered.map((g) => (
              <div key={g.group} className="context-picker-group">
                <div className="context-picker-group-label">{g.group}</div>
                {g.items.map((i) => (
                  <button key={`${g.group}-${i.name}`} type="button" className="context-picker-item" onClick={() => pick(i)}>
                    <span className="context-picker-badge">{g.icon}</span>
                    <span>{i.name}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ContextComposer;
