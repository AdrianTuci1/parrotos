import { llmService } from './LlmService.js';

export class ChatFallbackService {
  constructor(llmServiceInstance = llmService) {
    this.llmService = llmServiceInstance;
  }

  async *stream({ message }) {
    try {
      const messages = [
        { role: 'system', content: 'You are a helpful data analytics assistant. Keep answers concise and actionable.' },
        { role: 'user', content: message },
      ];

      for await (const chunk of this.llmService.stream(messages)) {
        yield { type: 'text', content: chunk };
      }
    } catch (err) {
      if (err.message?.includes('LLM_API_KEY') || err.message?.includes('configured')) {
        yield { type: 'text', content: 'AI chat is not configured. Set LLM_PROVIDER, LLM_API_KEY, and LLM_MODEL in the backend environment.' };
        return;
      }
      throw err;
    }
  }
}

export const chatFallbackService = new ChatFallbackService();
