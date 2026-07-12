import { query } from "../index.js";

export async function getWeeklyReflection(userId, weekStart) {
  const result = await query(
    `SELECT * FROM weekly_reflections
     WHERE user_id = $1 AND week_start = $2`,
    [userId, weekStart],
  );

  return result.rows[0] || null;
}

export async function createWeeklyReflection(
  userId,
  weekStart,
  weekEnd,
  content,
  moodArc,
  entryIds,
) {
  const result = await query(
    `INSERT INTO weekly_reflections
     (user_id, week_start, week_end, content, mood_arc, entry_ids)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, week_start) DO NOTHING
     RETURNING *`,
    [userId, weekStart, weekEnd, content, moodArc, entryIds],
  );

  return result.rows[0] || null;
}

export async function getEntriesForWeek(userId, weekStart, weekEnd) {
  const result = await query(
    `SELECT id, content, mood_score, mood_label,
            relationship_source, created_at
     FROM journal_entries
     WHERE user_id = $1
       AND created_at >= $2
       AND created_at < $3
       AND ai_processed_at IS NOT NULL
     ORDER BY created_at ASC`,
    [userId, weekStart, weekEnd],
  );

  return result.rows;
}
