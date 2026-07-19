import { config } from '../config/index.js';

export class LlmService {
  constructor() {
    this.provider = (config.llmProvider || 'openai').toLowerCase();
    this.apiKey = config.llmApiKey || '';
    this.model = config.llmModel || 'gpt-4o-mini';
    this.baseUrl = config.llmBaseUrl || '';
  }

  async *stream(messages) {
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY is not configured');
    }

    switch (this.provider) {
      case 'openai':
      case 'deepseek':
      case 'openai-compatible':
        yield* this.streamOpenAI(messages);
        return;
      case 'anthropic':
        yield* this.streamAnthropic(messages);
        return;
      case 'gemini':
        yield* this.streamGemini(messages);
        return;
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  async *streamOpenAI(messages) {
    const url = this.baseUrl || 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'OpenAI request failed');
      throw new Error(error);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) yield delta;
        } catch {}
      }
    }
  }

  async *streamAnthropic(messages) {
    const url = this.baseUrl || 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.filter((m) => m.role !== 'system'),
        system: messages.find((m) => m.role === 'system')?.content || 'You are a helpful assistant.',
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Anthropic request failed');
      throw new Error(error);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            yield parsed.delta?.text || '';
          }
        } catch {}
      }
    }
  }

  async *streamGemini(messages) {
    const url = this.baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Gemini request failed');
      throw new Error(error);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) yield text;
        } catch {}
      }
    }
  }
}

export const llmService = new LlmService();
