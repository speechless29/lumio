import pool, { query } from "../../db/index.js";

// --------------------------------------------------
// Trend graph data
// --------------------------------------------------

export async function getTrendDataPoints(userId, range) {
  let rangeCondition = "";

  if (range === "7d") {
    rangeCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
  } else if (range === "30d") {
    rangeCondition = "AND created_at >= NOW() - INTERVAL '30 days'";
  }

  const dataResult = await query(
    `SELECT
       id,
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

// --------------------------------------------------
// Active patterns shown on Trends page
// --------------------------------------------------

export async function getActivePatterns(userId) {
  const result = await query(
    `SELECT *
     FROM patterns
     WHERE user_id = $1
       AND is_active = true
     ORDER BY
       cardinality(entry_ids) DESC,
       detected_at DESC
     LIMIT 3`,
    [userId],
  );

  return result.rows;
}

// --------------------------------------------------
// Count processed entries
// --------------------------------------------------

export async function getProcessedEntryCount(userId) {
  const result = await query(
    `SELECT COUNT(*) AS total
     FROM journal_entries
     WHERE user_id = $1
       AND ai_processed_at IS NOT NULL`,
    [userId],
  );

  return Number(result.rows[0]?.total ?? 0);
}

// --------------------------------------------------
// Entries used for pattern detection
// --------------------------------------------------

export async function getPatternSourceEntries(userId) {
  const result = await query(
    `SELECT
       id,
       created_at,
       mood_score,
       mood_label,
       user_emotions,
       relationship_source,
       stressor_type
     FROM journal_entries
     WHERE user_id = $1
       AND ai_processed_at IS NOT NULL
     ORDER BY created_at ASC`,
    [userId],
  );

  return result.rows;
}

// --------------------------------------------------
// Replace previous active patterns
// --------------------------------------------------

export async function replaceActivePatterns(userId, patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Old patterns stay in DB for history,
    // but stop being shown.
    await client.query(
      `UPDATE patterns
       SET is_active = false
       WHERE user_id = $1
         AND is_active = true`,
      [userId],
    );

    for (const pattern of patterns) {
      await client.query(
        `INSERT INTO patterns (
           user_id,
           pattern_type,
           category,
           description,
           entry_ids,
           mood_score_avg,
           date_range_start,
           date_range_end,
           is_active
         )
         VALUES (
           $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           true
         )`,
        [
          userId,
          pattern.pattern_type,
          pattern.category,
          pattern.description,
          pattern.entry_ids,
          pattern.mood_score_avg,
          pattern.date_range_start,
          pattern.date_range_end,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}
