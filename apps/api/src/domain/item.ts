export type TrackingType = 'recurring' | 'one_time' | 'avoidance' | 'progress';

export const TRACKING_TYPES: TrackingType[] = [
  'recurring',
  'one_time',
  'avoidance',
  'progress',
];

export type Cadence = 'daily' | 'weekly' | 'monthly';

export interface RecurringConfig {
  cadence: Cadence;
  target_per_period: number;
}
export interface OneTimeConfig {
  due_date: string; // YYYY-MM-DD
}
export interface AvoidanceConfig {
  since: string; // YYYY-MM-DD
}
export interface ProgressConfig {
  milestones: string[];
  percent: number; // 0-100
}

export type ItemConfig =
  | ({ tracking_type?: 'recurring' } & RecurringConfig)
  | ({ tracking_type?: 'one_time' } & OneTimeConfig)
  | ({ tracking_type?: 'avoidance' } & AvoidanceConfig)
  | ({ tracking_type?: 'progress' } & ProgressConfig);

export interface ItemInput {
  title: string;
  tracking_type: TrackingType;
  config: RecurringConfig | OneTimeConfig | AvoidanceConfig | ProgressConfig;
  point_weight: number;
}

export type ValidationResult =
  | { ok: true; value: ItemInput }
  | { ok: false; error: string };

const CADENCES: Cadence[] = ['daily', 'weekly', 'monthly'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(error: string): ValidationResult {
  return { ok: false, error };
}

export function validateItemInput(raw: unknown): ValidationResult {
  if (!isObject(raw)) return fail('input must be an object');

  const { title, tracking_type, config, point_weight } = raw;

  if (typeof title !== 'string' || title.trim() === '') {
    return fail('title is required');
  }
  if (
    typeof tracking_type !== 'string' ||
    !TRACKING_TYPES.includes(tracking_type as TrackingType)
  ) {
    return fail(`tracking_type must be one of ${TRACKING_TYPES.join(', ')}`);
  }
  if (typeof point_weight !== 'number' || !Number.isFinite(point_weight) || point_weight < 0) {
    return fail('point_weight must be a non-negative number');
  }
  if (!isObject(config)) return fail('config must be an object');

  const tt = tracking_type as TrackingType;
  const configError = validateConfig(tt, config);
  if (configError) return fail(configError);

  return {
    ok: true,
    value: {
      title: title.trim(),
      tracking_type: tt,
      config: config as ItemInput['config'],
      point_weight,
    },
  };
}

function validateConfig(
  type: TrackingType,
  config: Record<string, unknown>,
): string | null {
  switch (type) {
    case 'recurring':
      if (typeof config.cadence !== 'string' || !CADENCES.includes(config.cadence as Cadence)) {
        return `recurring.cadence must be one of ${CADENCES.join(', ')}`;
      }
      if (
        typeof config.target_per_period !== 'number' ||
        config.target_per_period < 1
      ) {
        return 'recurring.target_per_period must be a number >= 1';
      }
      return null;
    case 'one_time':
      if (typeof config.due_date !== 'string' || !DATE_RE.test(config.due_date)) {
        return 'one_time.due_date must be a YYYY-MM-DD string';
      }
      return null;
    case 'avoidance':
      if (typeof config.since !== 'string' || !DATE_RE.test(config.since)) {
        return 'avoidance.since must be a YYYY-MM-DD string';
      }
      return null;
    case 'progress':
      if (!Array.isArray(config.milestones) || !config.milestones.every((m) => typeof m === 'string')) {
        return 'progress.milestones must be an array of strings';
      }
      if (
        typeof config.percent !== 'number' ||
        config.percent < 0 ||
        config.percent > 100
      ) {
        return 'progress.percent must be between 0 and 100';
      }
      return null;
  }
}
