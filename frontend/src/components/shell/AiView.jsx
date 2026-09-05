import { ChatView } from "@/components/shell/ChatView";

/**
 * Rill-style `/ai` artifact view.
 *
 * The product's AI assistant is the chat interface (see `ChatView`); `/ai` maps to
 * that same assistant so the artifact route is reachable at a Rill-style path while
 * reusing the chat internals verbatim (no data-layer rewrite here).
 */
export function AiView() {
  return <ChatView />;
}

export default AiView;
