export type Period = 'today' | 'week' | 'month' | 'total';

export interface DateRange {
  from: string;
  to: string;
}

function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date` (ISO: week starts Monday). */
export function weekStart(date: string): string {
  const d = parse(date);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const deltaToMonday = (dow + 6) % 7; // Mon->0, Sun->6
  d.setUTCDate(d.getUTCDate() - deltaToMonday);
  return fmt(d);
}

/** First day of the month containing `date`. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Inclusive [from, to] date range for a period, ending at `today`. */
export function periodRange(period: Period, today: string): DateRange {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: weekStart(today), to: today };
    case 'month':
      return { from: monthStart(today), to: today };
    case 'total':
      return { from: '0001-01-01', to: today };
  }
}
