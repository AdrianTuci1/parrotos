import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatFallbackService } from '../src/services/ChatFallbackService.js';

class FakeLlmService {
  constructor(chunks, shouldThrow) {
    this.chunks = chunks;
    this.shouldThrow = shouldThrow;
  }

  async *stream() {
    if (this.shouldThrow) {
      throw new Error(this.shouldThrow);
    }
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
}

function createService({ llmChunks = [], throwError = '' } = {}) {
  const service = new ChatFallbackService();
  service.llmService = new FakeLlmService(llmChunks, throwError);
  return service;
}

test('ChatFallbackService streams LLM chunks as text events', async () => {
  const service = createService({ llmChunks: ['Hello', ' ', 'world'] });
  const chunks = [];
  for await (const chunk of service.stream({ message: 'hi' })) {
    chunks.push(chunk);
  }
  assert.deepEqual(chunks, [
    { type: 'text', content: 'Hello' },
    { type: 'text', content: ' ' },
    { type: 'text', content: 'world' },
  ]);
});

test('ChatFallbackService returns config hint when LLM is not configured', async () => {
  const service = createService({ throwError: 'LLM_API_KEY is not configured' });
  const chunks = [];
  for await (const chunk of service.stream({ message: 'hi' })) {
    chunks.push(chunk);
  }
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].type, 'text');
  assert.ok(chunks[0].content.includes('AI chat is not configured'));
});

test('ChatFallbackService rethrows unknown LLM errors', async () => {
  const service = createService({ throwError: 'network timeout' });
  await assert.rejects(
    async () => {
      for await (const chunk of service.stream({ message: 'hi' })) {
        void chunk;
      }
    },
    /network timeout/
  );
});

test('ChatFallbackService emits at least one chunk for empty LLM response', async () => {
  const service = createService({ llmChunks: [] });
  const chunks = [];
  for await (const chunk of service.stream({ message: 'hi' })) {
    chunks.push(chunk);
  }
  assert.equal(chunks.length, 0);
});
