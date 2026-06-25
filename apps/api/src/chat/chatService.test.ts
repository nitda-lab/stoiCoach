import { describe, expect, test } from 'bun:test';
import { runChat } from './chatService';
import type { AssistantReply, ChatMessage } from '../llm/messages';
import type { ToolOutcome } from '../llm/tools';

// Scripted LLM: returns queued replies in order.
function scriptedComplete(replies: AssistantReply[]) {
  let i = 0;
  const calls: ChatMessage[][] = [];
  const fn = async (messages: ChatMessage[]): Promise<AssistantReply> => {
    calls.push(messages);
    return replies[Math.min(i++, replies.length - 1)]!;
  };
  return { fn, calls };
}

const fakeExecute = async (
  _userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolOutcome> => {
  if (name === 'create_item') {
    return {
      result: { id: 'item_1', ...args },
      action: { type: 'created', item: { id: 'item_1', title: String(args.title) } as never },
    };
  }
  return { result: { ok: true } };
};

describe('runChat', () => {
  test('returns text directly when the model makes no tool call', async () => {
    const llm = scriptedComplete([{ content: 'こんにちは', tool_calls: [] }]);
    const out = await runChat('u1', [{ role: 'user', content: 'hi' }], {
      complete: llm.fn,
      execute: fakeExecute,
      today: '2026-06-25',
    });
    expect(out.reply).toBe('こんにちは');
    expect(out.actions).toEqual([]);
    expect(llm.calls).toHaveLength(1);
    // system prompt is prepended
    expect(llm.calls[0]![0]!.role).toBe('system');
  });

  test('executes a write tool and synthesizes the reply without a second LLM call', async () => {
    const llm = scriptedComplete([
      {
        content: '',
        tool_calls: [
          { id: 'c1', name: 'create_item', arguments: '{"title":"朝ラン"}' },
        ],
      },
    ]);
    const out = await runChat('u1', [{ role: 'user', content: '朝ランやりたい' }], {
      complete: llm.fn,
      execute: fakeExecute,
      today: '2026-06-25',
    });
    expect(out.actions).toHaveLength(1);
    expect(out.actions[0]!.type).toBe('created');
    expect(out.reply).toContain('朝ラン');
    expect(out.reply).toContain('追加しました');
    // only ONE LLM round-trip: the write action is confirmed locally
    expect(llm.calls).toHaveLength(1);
  });

  test('makes a follow-up LLM call when tools were read-only (no actions)', async () => {
    const readOnlyExecute = async () => ({ result: { items: [] } }); // no action
    const llm = scriptedComplete([
      { content: '', tool_calls: [{ id: 'c1', name: 'list_items', arguments: '{}' }] },
      { content: '今日はまだ項目がありません。', tool_calls: [] },
    ]);
    const out = await runChat('u1', [{ role: 'user', content: '状況は？' }], {
      complete: llm.fn,
      execute: readOnlyExecute,
      today: '2026-06-25',
    });
    expect(out.reply).toBe('今日はまだ項目がありません。');
    expect(llm.calls).toHaveLength(2);
  });

  test('stops at maxRounds even if the model keeps calling tools', async () => {
    const looping: AssistantReply = {
      content: '',
      tool_calls: [{ id: 'c', name: 'list_items', arguments: '{}' }],
    };
    const llm = scriptedComplete([looping]);
    const out = await runChat('u1', [{ role: 'user', content: 'go' }], {
      complete: llm.fn,
      execute: fakeExecute,
      today: '2026-06-25',
      maxRounds: 3,
    });
    expect(llm.calls.length).toBeLessThanOrEqual(3);
    expect(typeof out.reply).toBe('string');
  });

  test('tolerates malformed tool arguments without throwing', async () => {
    const llm = scriptedComplete([
      {
        content: '',
        tool_calls: [{ id: 'c1', name: 'create_item', arguments: 'not json' }],
      },
    ]);
    const out = await runChat('u1', [{ role: 'user', content: 'x' }], {
      complete: llm.fn,
      execute: fakeExecute,
      today: '2026-06-25',
    });
    expect(typeof out.reply).toBe('string');
    expect(out.reply.length).toBeGreaterThan(0);
  });
});
