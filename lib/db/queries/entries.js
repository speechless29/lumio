import { query } from "../../db/index.js";

// --------------------------------------------------
// Create entry
// --------------------------------------------------

export async function createEntry(userId, content) {
  const result = await query(
    `INSERT INTO journal_entries (
       user_id,
       content
     )
     VALUES ($1, $2)
     RETURNING
       id,
       user_id,
       content,
       created_at,
       mood_score,
       mood_label,
       secondary_emotions,
       emotion_evidence,
       user_emotions,
       emotion_feedback,
       emotion_feedback_at,
       safety_level,
       mood_intensity,
       relationship_source,
       stressor_type,
       ai_acknowledgment,
       ai_processed_at,
       thread_id`,
    [userId, content],
  );

  return result.rows[0];
}

// --------------------------------------------------
// Get entries for journal page
// --------------------------------------------------

export async function getEntriesByUser(userId, page, limit) {
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT
       id,
       user_id,
       content,
       created_at,
       mood_score,
       mood_label,
       secondary_emotions,
       emotion_evidence,
       user_emotions,
       emotion_feedback,
       emotion_feedback_at,
       safety_level,
       mood_intensity,
       relationship_source,
       stressor_type,
       ai_acknowledgment,
       ai_processed_at,
       thread_id,
       COUNT(*) OVER() AS total_count
     FROM journal_entries
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2
     OFFSET $3`,
    [userId, limit, offset],
  );

  const total = Number(result.rows[0]?.total_count ?? 0);

  const entries = result.rows.map(({ total_count, ...entry }) => entry);

  return {
    entries,
    total,
  };
}

// --------------------------------------------------
// Get one entry
// --------------------------------------------------

export async function getEntryById(entryId, userId) {
  const result = await query(
    `SELECT
       id,
       user_id,
       content,
       created_at,
       mood_score,
       mood_label,
       secondary_emotions,
       emotion_evidence,
       user_emotions,
       emotion_feedback,
       emotion_feedback_at,
       safety_level,
       mood_intensity,
       relationship_source,
       stressor_type,
       ai_acknowledgment,
       ai_processed_at,
       thread_id
     FROM journal_entries
     WHERE id = $1
       AND user_id = $2`,
    [entryId, userId],
  );

  return result.rows[0] || null;
}

// --------------------------------------------------
// Save AI emotion analysis
// --------------------------------------------------

export async function updateEntryAIFields(entryId, fields) {
  const {
    mood_score,
    mood_label,
    secondary_emotions,
    emotion_evidence,
    mood_intensity,
    relationship_source,
    stressor_type,
    ai_acknowledgment,
    thread_id,
  } = fields;

  const result = await query(
    `UPDATE journal_entries
     SET
       mood_score = $1,
       mood_label = $2,
       secondary_emotions = $3,
       emotion_evidence = $4::jsonb,
       mood_intensity = $5,
       relationship_source = $6,
       stressor_type = $7,
       ai_acknowledgment = $8,
       thread_id = $9,
       ai_processed_at = NOW()
     WHERE id = $10
     RETURNING
       id,
       user_id,
       content,
       created_at,
       mood_score,
       mood_label,
       secondary_emotions,
       emotion_evidence,
       user_emotions,
       emotion_feedback,
       emotion_feedback_at,
       safety_level,
       mood_intensity,
       relationship_source,
       stressor_type,
       ai_acknowledgment,
       ai_processed_at,
       thread_id`,
    [
      mood_score,
      mood_label,
      secondary_emotions ?? [],
      JSON.stringify(emotion_evidence ?? []),
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

// --------------------------------------------------
// Save safety classification
// --------------------------------------------------

export async function updateEntrySafety(entryId, safetyLevel) {
  const result = await query(
    `UPDATE journal_entries
     SET safety_level = $1
     WHERE id = $2
     RETURNING
       id,
       safety_level`,
    [safetyLevel, entryId],
  );

  return result.rows[0] || null;
}

// --------------------------------------------------
// Save user emotion confirmation/edit
// --------------------------------------------------

export async function updateEntryEmotionFeedback(
  entryId,
  userId,
  emotions,
  feedback,
) {
  const result = await query(
    `UPDATE journal_entries
     SET
       user_emotions = $1,
       emotion_feedback = $2,
       emotion_feedback_at = NOW()
     WHERE id = $3
       AND user_id = $4
     RETURNING
       id,
       user_id,
       content,
       created_at,
       mood_score,
       mood_label,
       secondary_emotions,
       emotion_evidence,
       user_emotions,
       emotion_feedback,
       emotion_feedback_at,
       safety_level,
       mood_intensity,
       relationship_source,
       stressor_type,
       ai_acknowledgment,
       ai_processed_at,
       thread_id`,
    [emotions, feedback, entryId, userId],
  );

  return result.rows[0] || null;
}
