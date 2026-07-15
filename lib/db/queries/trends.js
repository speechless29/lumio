import { query } from "../../db/index.js";

export async function getTrendDataPoints(userId, range) {
  let rangeCondition = "";

  if (range === "7d") {
    rangeCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
  } else if (range === "30d") {
    rangeCondition = "AND created_at >= NOW() - INTERVAL '30 days'";
  }

  const dataResult = await query(
    `SELECT id,
          created_at,
          mood_score,
          mood_label,
          relationship_source,
          stressor_type,
          LEFT(content, 100) AS content
   FROM journal_entries
   WHERE user_id = $1
     AND ai_processed_at IS NOT NULL
     AND mood_score IS NOT NULL
     ${rangeCondition}
   ORDER BY created_at ASC`,
    [userId],
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM journal_entries
     WHERE user_id = $1
       AND ai_processed_at IS NOT NULL
       AND mood_score IS NOT NULL`,
    [userId],
  );

  const totalEntries = Number(countResult.rows[0]?.total ?? 0);

  return {
    dataPoints: dataResult.rows,
    totalEntries,
    hasEnoughData: totalEntries >= 5,
  };
}

export async function getActivePatterns(userId) {
  const result = await query(
    `SELECT *
     FROM patterns
     WHERE user_id = $1
       AND is_active = true
     ORDER BY mood_score_avg ASC
     LIMIT 3`,
    [userId],
  );

  return result.rows;
}
