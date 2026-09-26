import { query } from "../index.js";

// --------------------------------------------------
// Daily mood averages for the calendar view
// --------------------------------------------------

export async function getDailyMoodAverages(userId, year, month) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const result = await query(
    `SELECT
       TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
       AVG(mood_score)::float AS avg_mood,
       COUNT(*)::int AS entry_count
     FROM journal_entries
     WHERE user_id = $1
       AND mood_score IS NOT NULL
       AND created_at >= $2
       AND created_at < $3
     GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
     ORDER BY day ASC`,
    [userId, monthStart, monthEnd],
  );

  return result.rows;
}
