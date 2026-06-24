import { getSql } from './client';
import type { Item } from './types';
import type { ItemInput } from '../domain/item';

export interface ItemPatch {
  title?: string;
  config?: Record<string, unknown>;
  point_weight?: number;
  status?: Item['status'];
}

/** Create a new item owned by userId. */
export async function createItem(userId: string, input: ItemInput): Promise<Item> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO items (clerk_user_id, title, tracking_type, config, point_weight)
    VALUES (${userId}, ${input.title}, ${input.tracking_type},
            ${JSON.stringify(input.config)}::jsonb, ${input.point_weight})
    RETURNING *
  `) as Item[];
  return rows[0]!;
}

/** List a user's items, optionally filtered by status (default: active). */
export async function listItems(
  userId: string,
  opts: { status?: Item['status'] | 'all' } = {},
): Promise<Item[]> {
  const sql = getSql();
  const status = opts.status ?? 'active';
  if (status === 'all') {
    return (await sql`
      SELECT * FROM items WHERE clerk_user_id = ${userId} ORDER BY created_at DESC
    `) as Item[];
  }
  return (await sql`
    SELECT * FROM items
    WHERE clerk_user_id = ${userId} AND status = ${status}
    ORDER BY created_at DESC
  `) as Item[];
}

/** Fetch one item scoped to the user, or null. */
export async function getItem(userId: string, id: string): Promise<Item | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM items WHERE id = ${id} AND clerk_user_id = ${userId}
  `) as Item[];
  return rows[0] ?? null;
}

/** Patch mutable fields. Only provided fields change. Returns updated row or null. */
export async function updateItem(
  userId: string,
  id: string,
  patch: ItemPatch,
): Promise<Item | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE items SET
      title        = COALESCE(${patch.title ?? null}, title),
      config       = COALESCE(${patch.config ? JSON.stringify(patch.config) : null}::jsonb, config),
      point_weight = COALESCE(${patch.point_weight ?? null}, point_weight),
      status       = COALESCE(${patch.status ?? null}, status),
      updated_at   = now()
    WHERE id = ${id} AND clerk_user_id = ${userId}
    RETURNING *
  `) as Item[];
  return rows[0] ?? null;
}

/** Archive (soft-delete) an item. */
export async function archiveItem(userId: string, id: string): Promise<Item | null> {
  return updateItem(userId, id, { status: 'archived' });
}
