import { describe, expect, test, afterAll } from 'bun:test';
import { createItem } from './itemRepo';
import { addCompletion, listCompletionRows } from './completionRepo';
import { sumPoints } from './summaryRepo';
import { getSql } from './client';
import type { ItemInput } from '../domain/item';

const hasDb = !!process.env.DATABASE_URL;
const USER = `sum-test-${process.pid}-${Math.floor(performance.now())}`;

const input: ItemInput = {
  title: '朝ラン',
  tracking_type: 'recurring',
  config: { cadence: 'daily', target_per_period: 1 },
  point_weight: 10,
};

afterAll(async () => {
  if (!hasDb) return;
  await getSql()`DELETE FROM items WHERE clerk_user_id = ${USER}`;
});

describe.skipIf(!hasDb)('summaryRepo (integration)', () => {
  test('sumPoints sums only the inclusive range', async () => {
    const item = await createItem(USER, input);
    await addCompletion(USER, item.id, '2026-06-10', 10);
    await addCompletion(USER, item.id, '2026-06-24', 10);
    await addCompletion(USER, item.id, '2026-06-25', 10);

    expect(await sumPoints(USER, '2026-06-24', '2026-06-25')).toBe(20);
    expect(await sumPoints(USER, '2026-06-01', '2026-06-30')).toBe(30);
    expect(await sumPoints(USER, '2026-07-01', '2026-07-31')).toBe(0);
  });

  test('listCompletionRows returns string dates', async () => {
    const rows = await listCompletionRows(USER);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(typeof r.date).toBe('string');
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
