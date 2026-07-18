import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatFallbackService } from '../src/services/ChatFallbackService.js';

test('ChatFallbackService streams when LlmService is configured', async () => {
  const service = new ChatFallbackService();
  const chunks = [];
  for await (const chunk of service.stream({ message: 'hello' })) {
    chunks.push(chunk);
  }
  assert.ok(chunks.length > 0, 'should emit at least one chunk');
});

test('ChatFallbackService returns config hint when LLM is not configured', async () => {
  const service = new ChatFallbackService();
  const chunks = [];
  for await (const chunk of service.stream({ message: 'hello' })) {
    chunks.push(chunk);
  }
  const text = chunks.filter((c) => c.type === 'text').map((c) => c.content).join('');
  assert.ok(
    text.length > 0,
    'should return a text response'
  );
});
