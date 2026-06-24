export interface CompletionLike {
  date: string; // YYYY-MM-DD
  points_earned: number;
}

export interface DateRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

/** Sum points for completions whose date falls in [from, to] inclusive.
 *  Dates are YYYY-MM-DD, so lexicographic comparison equals chronological. */
export function sumPoints(completions: CompletionLike[], range: DateRange): number {
  return completions.reduce((acc, c) => {
    if (c.date >= range.from && c.date <= range.to) return acc + c.points_earned;
    return acc;
  }, 0);
}

export function totalPoints(completions: CompletionLike[]): number {
  return completions.reduce((acc, c) => acc + c.points_earned, 0);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function prevDay(date: string): string {
  const t = Date.parse(`${date}T00:00:00Z`);
  return new Date(t - DAY_MS).toISOString().slice(0, 10);
}

/** Number of consecutive days with a completion ending at `today`.
 *  Returns 0 if `today` itself has no completion. */
export function currentStreak(completionDates: string[], today: string): number {
  const days = new Set(completionDates);
  let streak = 0;
  let cursor = today;
  while (days.has(cursor)) {
    streak += 1;
    cursor = prevDay(cursor);
  }
  return streak;
}
