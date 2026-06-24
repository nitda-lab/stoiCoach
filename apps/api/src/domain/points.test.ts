import { describe, expect, test } from 'bun:test';
import { sumPoints, totalPoints, currentStreak } from './points';

const completions = [
  { date: '2026-06-20', points_earned: 5 },
  { date: '2026-06-23', points_earned: 10 },
  { date: '2026-06-24', points_earned: 8 },
  { date: '2026-06-25', points_earned: 7 },
];

describe('sumPoints', () => {
  test('sums only completions within the inclusive range', () => {
    expect(sumPoints(completions, { from: '2026-06-23', to: '2026-06-25' })).toBe(25);
  });
  test('excludes out-of-range completions', () => {
    expect(sumPoints(completions, { from: '2026-06-24', to: '2026-06-24' })).toBe(8);
  });
  test('returns 0 when nothing matches', () => {
    expect(sumPoints(completions, { from: '2026-07-01', to: '2026-07-31' })).toBe(0);
  });
});

describe('totalPoints', () => {
  test('sums every completion', () => {
    expect(totalPoints(completions)).toBe(30);
  });
  test('empty is 0', () => {
    expect(totalPoints([])).toBe(0);
  });
});

describe('currentStreak', () => {
  test('counts consecutive days back from today', () => {
    expect(currentStreak(['2026-06-23', '2026-06-24', '2026-06-25'], '2026-06-25')).toBe(3);
  });
  test('breaks on a gap', () => {
    expect(currentStreak(['2026-06-20', '2026-06-24', '2026-06-25'], '2026-06-25')).toBe(2);
  });
  test('is 0 when today has no completion', () => {
    expect(currentStreak(['2026-06-23', '2026-06-24'], '2026-06-25')).toBe(0);
  });
  test('dedupes multiple completions on same day', () => {
    expect(currentStreak(['2026-06-25', '2026-06-25', '2026-06-24'], '2026-06-25')).toBe(2);
  });
});
