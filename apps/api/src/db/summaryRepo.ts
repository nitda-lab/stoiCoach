import { getSql } from './client';

/** Sum points_earned over an inclusive [from, to] date range, in SQL. */
export async function sumPoints(
  userId: string,
  from: string,
  to: string,
): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT COALESCE(SUM(points_earned), 0)::int AS total
    FROM completions
    WHERE clerk_user_id = ${userId} AND date >= ${from} AND date <= ${to}
  `) as { total: number }[];
  return rows[0]?.total ?? 0;
}
