import { getSql } from './client';
import type { Completion } from './types';

/** Record one completion (a check) for an item. points should be a snapshot
 *  of the item's point_weight at completion time. */
export async function addCompletion(
  userId: string,
  itemId: string,
  date: string,
  points: number,
): Promise<Completion> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO completions (item_id, clerk_user_id, date, points_earned)
    VALUES (${itemId}, ${userId}, ${date}, ${points})
    RETURNING id, item_id, clerk_user_id, date::text AS date, points_earned, created_at
  `) as Completion[];
  return rows[0]!;
}

/** List a user's completions, optionally within an inclusive [from, to] date range.
 *  `date` is returned as a YYYY-MM-DD string. */
export async function listCompletions(
  userId: string,
  range: { from?: string; to?: string } = {},
): Promise<Completion[]> {
  const sql = getSql();
  const from = range.from ?? '0001-01-01';
  const to = range.to ?? '9999-12-31';
  return (await sql`
    SELECT id, item_id, clerk_user_id, date::text AS date, points_earned, created_at
    FROM completions
    WHERE clerk_user_id = ${userId} AND date >= ${from} AND date <= ${to}
    ORDER BY date DESC
  `) as Completion[];
}

/** Minimal completion rows (item_id + YYYY-MM-DD date) for summary building. */
export async function listCompletionRows(
  userId: string,
): Promise<{ item_id: string; date: string }[]> {
  const sql = getSql();
  return (await sql`
    SELECT item_id, date::text AS date
    FROM completions
    WHERE clerk_user_id = ${userId}
    ORDER BY date DESC
  `) as { item_id: string; date: string }[];
}
