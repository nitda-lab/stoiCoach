import { describe, expect, test, afterAll } from 'bun:test';
import { TOOL_DEFS, executeTool } from './tools';
import { getSql } from '../db/client';

const hasDb = !!process.env.DATABASE_URL;
const USER = `tool-test-${process.pid}-${Math.floor(performance.now())}`;

afterAll(async () => {
  if (!hasDb) return;
  await getSql()`DELETE FROM items WHERE clerk_user_id = ${USER}`;
});

describe('TOOL_DEFS', () => {
  test('exposes the five management tools', () => {
    const names = TOOL_DEFS.map((t) => t.function.name).sort();
    expect(names).toEqual(
      ['archive_item', 'complete_item', 'create_item', 'list_items', 'update_item'].sort(),
    );
  });
});

describe('executeTool (no DB needed)', () => {
  test('create_item with invalid args returns an error result, does not throw', async () => {
    const { result, action } = await executeTool(
      USER,
      'create_item',
      { title: '', tracking_type: 'recurring', config: {}, point_weight: -1 },
      '2026-06-25',
    );
    expect(action).toBeUndefined();
    expect((result as { error?: string }).error).toBeTruthy();
  });

  test('unknown tool returns an error result', async () => {
    const { result } = await executeTool(USER, 'nope', {}, '2026-06-25');
    expect((result as { error?: string }).error).toBeTruthy();
  });
});

describe.skipIf(!hasDb)('executeTool (integration)', () => {
  test('create_item creates and returns an action with the item', async () => {
    const { result, action } = await executeTool(
      USER,
      'create_item',
      {
        title: '朝ラン',
        tracking_type: 'recurring',
        config: { cadence: 'daily', target_per_period: 1 },
        point_weight: 10,
      },
      '2026-06-25',
    );
    expect(action?.type).toBe('created');
    expect(action?.item?.title).toBe('朝ラン');
    expect((result as { id: string }).id).toBeTruthy();
  });

  test('complete_item snapshots the point weight into the completion', async () => {
    const created = await executeTool(
      USER,
      'create_item',
      {
        title: '腕立て',
        tracking_type: 'recurring',
        config: { cadence: 'daily', target_per_period: 1 },
        point_weight: 7,
      },
      '2026-06-25',
    );
    const itemId = (created.result as { id: string }).id;
    const { result, action } = await executeTool(
      USER,
      'complete_item',
      { item_id: itemId },
      '2026-06-25',
    );
    expect(action?.type).toBe('completed');
    expect((result as { points_earned: number }).points_earned).toBe(7);
  });

  test('list_items returns the user items', async () => {
    const { result } = await executeTool(USER, 'list_items', {}, '2026-06-25');
    expect(Array.isArray((result as { items: unknown[] }).items)).toBe(true);
  });
});
