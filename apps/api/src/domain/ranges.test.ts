import { describe, expect, test } from 'bun:test';
import { weekStart, monthStart, periodRange } from './ranges';

describe('weekStart (Monday)', () => {
  test('Thursday 2026-06-25 -> Monday 2026-06-22', () => {
    expect(weekStart('2026-06-25')).toBe('2026-06-22');
  });
  test('Monday maps to itself', () => {
    expect(weekStart('2026-06-22')).toBe('2026-06-22');
  });
  test('Sunday 2026-06-21 -> previous Monday 2026-06-15', () => {
    expect(weekStart('2026-06-21')).toBe('2026-06-15');
  });
});

describe('monthStart', () => {
  test('returns the first of the month', () => {
    expect(monthStart('2026-06-25')).toBe('2026-06-01');
  });
});

describe('periodRange', () => {
  const today = '2026-06-25';
  test('today is a single-day inclusive range', () => {
    expect(periodRange('today', today)).toEqual({ from: today, to: today });
  });
  test('week spans Monday..today', () => {
    expect(periodRange('week', today)).toEqual({ from: '2026-06-22', to: today });
  });
  test('month spans 1st..today', () => {
    expect(periodRange('month', today)).toEqual({ from: '2026-06-01', to: today });
  });
  test('total spans the epoch..today', () => {
    expect(periodRange('total', today)).toEqual({ from: '0001-01-01', to: today });
  });
});
