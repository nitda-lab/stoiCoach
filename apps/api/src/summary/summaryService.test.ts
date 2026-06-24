import { describe, expect, test } from 'bun:test';
import { buildSummary } from './summaryService';
import type { Item } from '../db/types';

function item(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    clerk_user_id: 'u1',
    title: id,
    tracking_type: 'recurring',
    config: { cadence: 'daily', target_per_period: 1 },
    point_weight: 10,
    status: 'active',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

const today = '2026-06-25';

describe('buildSummary', () => {
  test('computes period point totals from completion rows', () => {
    const items = [item('a')];
    const rows = [
      { item_id: 'a', date: '2026-06-25', points_earned: 10 }, // today, week, month
      { item_id: 'a', date: '2026-06-22', points_earned: 10 }, // week (Mon), month
      { item_id: 'a', date: '2026-06-10', points_earned: 10 }, // month only
      { item_id: 'a', date: '2026-05-30', points_earned: 10 }, // total only
    ];
    const s = buildSummary({ items, completionRows: rows, today });
    expect(s.points.today).toBe(10);
    expect(s.points.week).toBe(20);
    expect(s.points.month).toBe(30);
    expect(s.points.total).toBe(40);
  });

  test('marks completedToday and computes streak per item', () => {
    const items = [item('a'), item('b')];
    const rows = [
      { item_id: 'a', date: '2026-06-25', points_earned: 10 },
      { item_id: 'a', date: '2026-06-24', points_earned: 10 },
      { item_id: 'a', date: '2026-06-23', points_earned: 10 },
      { item_id: 'b', date: '2026-06-20', points_earned: 10 },
    ];
    const s = buildSummary({ items, completionRows: rows, today });
    const a = s.items.find((i) => i.id === 'a')!;
    const b = s.items.find((i) => i.id === 'b')!;
    expect(a.completedToday).toBe(true);
    expect(a.streak).toBe(3);
    expect(b.completedToday).toBe(false);
    expect(b.streak).toBe(0);
  });

  test('handles items with no completions', () => {
    const s = buildSummary({ items: [item('a')], completionRows: [], today });
    expect(s.points.total).toBe(0);
    expect(s.items[0]!.completedToday).toBe(false);
    expect(s.items[0]!.streak).toBe(0);
  });
});
