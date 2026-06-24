import { describe, expect, test } from 'bun:test';
import { validateItemInput } from './item';

const baseRecurring = {
  title: '朝ラン',
  tracking_type: 'recurring',
  config: { cadence: 'daily', target_per_period: 1 },
  point_weight: 10,
};

describe('validateItemInput', () => {
  test('accepts a valid recurring item', () => {
    const r = validateItemInput(baseRecurring);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.tracking_type).toBe('recurring');
      expect(r.value.point_weight).toBe(10);
    }
  });

  test('accepts valid one_time / avoidance / progress', () => {
    expect(
      validateItemInput({
        title: '請求書',
        tracking_type: 'one_time',
        config: { due_date: '2026-06-26' },
        point_weight: 5,
      }).ok,
    ).toBe(true);
    expect(
      validateItemInput({
        title: '甘いもの我慢',
        tracking_type: 'avoidance',
        config: { since: '2026-06-25' },
        point_weight: 8,
      }).ok,
    ).toBe(true);
    expect(
      validateItemInput({
        title: '簿記2級',
        tracking_type: 'progress',
        config: { milestones: ['申込', '学習'], percent: 60 },
        point_weight: 20,
      }).ok,
    ).toBe(true);
  });

  test('rejects negative point_weight', () => {
    const r = validateItemInput({ ...baseRecurring, point_weight: -3 });
    expect(r.ok).toBe(false);
  });

  test('rejects unknown tracking_type', () => {
    const r = validateItemInput({ ...baseRecurring, tracking_type: 'mystery' });
    expect(r.ok).toBe(false);
  });

  test('rejects recurring missing cadence', () => {
    const r = validateItemInput({ ...baseRecurring, config: { target_per_period: 1 } });
    expect(r.ok).toBe(false);
  });

  test('rejects progress percent out of range', () => {
    const r = validateItemInput({
      title: 'x',
      tracking_type: 'progress',
      config: { milestones: [], percent: 140 },
      point_weight: 5,
    });
    expect(r.ok).toBe(false);
  });

  test('rejects empty title and non-object input', () => {
    expect(validateItemInput({ ...baseRecurring, title: '' }).ok).toBe(false);
    expect(validateItemInput(null).ok).toBe(false);
    expect(validateItemInput('nope').ok).toBe(false);
  });
});
