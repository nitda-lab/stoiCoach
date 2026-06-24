export type TrackingType = 'recurring' | 'one_time' | 'avoidance' | 'progress';

export interface Item {
  id: string;
  title: string;
  tracking_type: TrackingType;
  config: Record<string, unknown>;
  point_weight: number;
  status: 'active' | 'archived' | 'done';
  created_at: string;
}
