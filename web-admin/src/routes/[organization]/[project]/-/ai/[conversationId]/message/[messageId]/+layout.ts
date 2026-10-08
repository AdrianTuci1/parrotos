import { fetchMessage } from "@statsparrot/web-common/features/chat/core/citation-url-utils.ts";

export async function load({ params: { conversationId, messageId }, parent }) {
  const { runtime } = await parent();

  const { message, result } = await fetchMessage(
    runtime,
    conversationId,
    messageId,
  );

  return {
    message,
    result,
  };
}
