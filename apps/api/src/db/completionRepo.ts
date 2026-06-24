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
    RETURNING *
  `) as Completion[];
  return rows[0]!;
}

/** List a user's completions, optionally within an inclusive [from, to] date range. */
export async function listCompletions(
  userId: string,
  range: { from?: string; to?: string } = {},
): Promise<Completion[]> {
  const sql = getSql();
  const from = range.from ?? '0001-01-01';
  const to = range.to ?? '9999-12-31';
  return (await sql`
    SELECT * FROM completions
    WHERE clerk_user_id = ${userId} AND date >= ${from} AND date <= ${to}
    ORDER BY date DESC
  `) as Completion[];
}
