import { describe, expect, test, afterAll } from 'bun:test';
import { createItem, listItems, getItem, updateItem, archiveItem } from './itemRepo';
import { addCompletion, listCompletions } from './completionRepo';
import { getSql } from './client';
import type { ItemInput } from '../domain/item';

const hasDb = !!process.env.DATABASE_URL;
// Unique per-run owner so tests are isolated and self-cleaning.
const USER = `test-user-${process.pid}-${Math.floor(performance.now())}`;

const recurringInput: ItemInput = {
  title: '朝ラン',
  tracking_type: 'recurring',
  config: { cadence: 'daily', target_per_period: 1 },
  point_weight: 10,
};

afterAll(async () => {
  if (!hasDb) return;
  const sql = getSql();
  await sql`DELETE FROM items WHERE clerk_user_id = ${USER}`;
});

describe.skipIf(!hasDb)('itemRepo (integration)', () => {
  test('create then list returns the item, scoped to the user', async () => {
    const created = await createItem(USER, recurringInput);
    expect(created.id).toBeTruthy();
    expect(created.title).toBe('朝ラン');
    expect(created.config).toEqual({ cadence: 'daily', target_per_period: 1 });

    const items = await listItems(USER);
    expect(items.map((i) => i.id)).toContain(created.id);

    const otherUser = await listItems('someone-else');
    expect(otherUser.map((i) => i.id)).not.toContain(created.id);
  });

  test('update patches only provided fields', async () => {
    const created = await createItem(USER, recurringInput);
    const updated = await updateItem(USER, created.id, { point_weight: 25 });
    expect(updated?.point_weight).toBe(25);
    expect(updated?.title).toBe('朝ラン'); // unchanged
  });

  test('archive sets status to archived and drops it from default list', async () => {
    const created = await createItem(USER, recurringInput);
    await archiveItem(USER, created.id);
    const active = await listItems(USER, { status: 'active' });
    expect(active.map((i) => i.id)).not.toContain(created.id);
    const fetched = await getItem(USER, created.id);
    expect(fetched?.status).toBe('archived');
  });

  test('completions record points and filter by date range', async () => {
    const item = await createItem(USER, recurringInput);
    await addCompletion(USER, item.id, '2026-06-24', 10);
    await addCompletion(USER, item.id, '2026-06-25', 10);
    const all = await listCompletions(USER, { from: '2026-06-01', to: '2026-06-30' });
    const mine = all.filter((c) => c.item_id === item.id);
    expect(mine).toHaveLength(2);
    const oneDay = (await listCompletions(USER, { from: '2026-06-25', to: '2026-06-25' }))
      .filter((c) => c.item_id === item.id);
    expect(oneDay).toHaveLength(1);
  });
});
