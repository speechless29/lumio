ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS secondary_emotions TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS emotion_evidence JSONB NOT NULL DEFAULT '[]'::jsonb;