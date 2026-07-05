import { query } from "../../db/index.js";

export async function createEntry(userId, content) {
  const result = await query(
    `INSERT INTO journal_entries (user_id, content)
     VALUES ($1, $2)
     RETURNING id, user_id, content, created_at, mood_score, mood_label, mood_intensity, relationship_source, stressor_type, ai_acknowledgment, ai_processed_at, thread_id`,
    [userId, content],
  );

  return result.rows[0];
}

export async function getEntriesByUser(userId, page, limit) {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT id, user_id, content, created_at, mood_score, mood_label, mood_intensity, relationship_source, stressor_type, ai_acknowledgment, ai_processed_at, thread_id, COUNT(*) OVER() AS total_count
     FROM journal_entries
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  const total = result.rows[0]?.total_count ?? 0;
  const entries = result.rows.map(({ total_count, ...entry }) => entry);

  return { entries, total };
}

export async function getEntryById(entryId, userId) {
  const result = await query(
    `SELECT id, user_id, content, created_at, mood_score, mood_label, mood_intensity, relationship_source, stressor_type, ai_acknowledgment, ai_processed_at, thread_id
     FROM journal_entries
     WHERE id = $1 AND user_id = $2`,
    [entryId, userId],
  );

  return result.rows[0] || null;
}

export async function updateEntryAIFields(entryId, fields) {
  const {
    mood_score,
    mood_label,
    mood_intensity,
    relationship_source,
    stressor_type,
    ai_acknowledgment,
    thread_id,
  } = fields;

  const result = await query(
    `UPDATE journal_entries
     SET mood_score = $1,
         mood_label = $2,
         mood_intensity = $3,
         relationship_source = $4,
         stressor_type = $5,
         ai_acknowledgment = $6,
         thread_id = $7,
         ai_processed_at = NOW()
     WHERE id = $8
     RETURNING id, user_id, content, created_at, mood_score, mood_label, mood_intensity, relationship_source, stressor_type, ai_acknowledgment, ai_processed_at, thread_id`,
    [
      mood_score,
      mood_label,
      mood_intensity,
      relationship_source,
      stressor_type,
      ai_acknowledgment,
      thread_id,
      entryId,
    ],
  );

  return result.rows[0] || null;
}
