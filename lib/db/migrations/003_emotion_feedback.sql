ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS user_emotions TEXT[];

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS emotion_feedback VARCHAR(20)
CHECK (emotion_feedback IN ('confirmed', 'edited'));

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS emotion_feedback_at TIMESTAMP;