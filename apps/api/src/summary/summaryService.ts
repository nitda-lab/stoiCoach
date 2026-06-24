import type { Item } from '../db/types';
import { periodRange } from '../domain/ranges';
import { currentStreak } from '../domain/points';

export interface CompletionRow {
  item_id: string;
  date: string; // YYYY-MM-DD
  points_earned: number;
}

export interface ItemView extends Item {
  completedToday: boolean;
  streak: number;
}

export interface DashboardSummary {
  points: { today: number; week: number; month: number; total: number };
  items: ItemView[];
}

export interface BuildSummaryInput {
  items: Item[];
  completionRows: CompletionRow[];
  today: string;
}

function sumInRange(rows: CompletionRow[], from: string, to: string): number {
  return rows.reduce(
    (acc, r) => (r.date >= from && r.date <= to ? acc + r.points_earned : acc),
    0,
  );
}

/** Compose the dashboard summary from raw items + completion rows. Pure (no DB). */
export function buildSummary(input: BuildSummaryInput): DashboardSummary {
  const { items, completionRows, today } = input;

  const ranges = {
    today: periodRange('today', today),
    week: periodRange('week', today),
    month: periodRange('month', today),
    total: periodRange('total', today),
  };

  const points = {
    today: sumInRange(completionRows, ranges.today.from, ranges.today.to),
    week: sumInRange(completionRows, ranges.week.from, ranges.week.to),
    month: sumInRange(completionRows, ranges.month.from, ranges.month.to),
    total: sumInRange(completionRows, ranges.total.from, ranges.total.to),
  };

  // Group completion dates by item for streak/completedToday.
  const datesByItem = new Map<string, string[]>();
  for (const row of completionRows) {
    const list = datesByItem.get(row.item_id) ?? [];
    list.push(row.date);
    datesByItem.set(row.item_id, list);
  }

  const itemViews: ItemView[] = items.map((it) => {
    const dates = datesByItem.get(it.id) ?? [];
    return {
      ...it,
      completedToday: dates.includes(today),
      streak: currentStreak(dates, today),
    };
  });

  return { points, items: itemViews };
}
