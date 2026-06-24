import { describe, expect, test, afterEach } from 'bun:test';
import { complete } from './nanogpt';
import type { ChatMessage, ToolDef } from './messages';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(responseBody: unknown, capture?: (req: Request) => void) {
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    if (capture) capture(new Request(String(input), init));
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];
const tools: ToolDef[] = [];

describe('complete', () => {
  test('maps an OpenAI-shaped reply with content into AssistantReply', async () => {
    mockFetch({
      choices: [{ message: { role: 'assistant', content: 'hi there' }, finish_reason: 'stop' }],
    });
    const reply = await complete(messages, tools, {
      apiKey: 'k',
      baseUrl: 'https://example.test/v1',
      model: 'm',
    });
    expect(reply.content).toBe('hi there');
    expect(reply.tool_calls).toEqual([]);
  });

  test('maps tool_calls into normalized ToolCall[]', async () => {
    mockFetch({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'create_item', arguments: '{"title":"x"}' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    });
    const reply = await complete(messages, tools, {
      apiKey: 'k',
      baseUrl: 'https://example.test/v1',
      model: 'm',
    });
    expect(reply.tool_calls).toHaveLength(1);
    expect(reply.tool_calls[0]).toEqual({
      id: 'call_1',
      name: 'create_item',
      arguments: '{"title":"x"}',
    });
  });

  test('sends bearer auth, model, and messages to the chat/completions endpoint', async () => {
    let captured: Request | undefined;
    mockFetch(
      { choices: [{ message: { role: 'assistant', content: 'ok' } }] },
      (req) => (captured = req),
    );
    await complete(messages, tools, {
      apiKey: 'secret',
      baseUrl: 'https://example.test/v1',
      model: 'my-model',
    });
    expect(captured!.url).toBe('https://example.test/v1/chat/completions');
    expect(captured!.headers.get('Authorization')).toBe('Bearer secret');
    const body = (await captured!.json()) as { model: string; messages: unknown[] };
    expect(body.model).toBe('my-model');
    expect(body.messages).toHaveLength(1);
  });

  test('throws on non-2xx', async () => {
    globalThis.fetch = (async () =>
      new Response('boom', { status: 500 })) as unknown as typeof fetch;
    await expect(
      complete(messages, tools, { apiKey: 'k', baseUrl: 'https://x.test/v1', model: 'm' }),
    ).rejects.toThrow();
  });
});
