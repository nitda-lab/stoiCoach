import type { TrackingType } from '../domain/item';

export interface Item {
  id: string;
  clerk_user_id: string;
  title: string;
  tracking_type: TrackingType;
  config: Record<string, unknown>;
  point_weight: number;
  status: 'active' | 'archived' | 'done';
  created_at: string;
  updated_at: string;
}

export interface Completion {
  id: string;
  item_id: string;
  clerk_user_id: string;
  date: string; // YYYY-MM-DD
  points_earned: number;
  created_at: string;
}
