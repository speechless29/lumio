CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255),
  google_id         VARCHAR(255) UNIQUE,
  relationship_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  last_active_at    TIMESTAMP
);

CREATE TABLE journal_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  mood_score          INTEGER CHECK (mood_score >= 1 AND mood_score <= 10),
  mood_label          VARCHAR(100),
  mood_intensity      VARCHAR(20) CHECK (mood_intensity IN ('low', 'moderate', 'high')),
  relationship_source VARCHAR(100),
  stressor_type       VARCHAR(100),
  ai_acknowledgment   TEXT,
  ai_processed_at     TIMESTAMP
);

CREATE TABLE threads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_entry_id  UUID NOT NULL UNIQUE REFERENCES journal_entries(id) ON DELETE CASCADE,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  last_message_at   TIMESTAMP
);

ALTER TABLE journal_entries ADD COLUMN thread_id UUID REFERENCES threads(id);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE patterns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  detected_at      TIMESTAMP NOT NULL DEFAULT now(),
  pattern_type     VARCHAR(20) NOT NULL CHECK (pattern_type IN ('relationship', 'situational')),
  category         VARCHAR(100) NOT NULL,
  description      TEXT NOT NULL,
  entry_ids        UUID[] NOT NULL,
  mood_score_avg   DECIMAL(4,2),
  date_range_start TIMESTAMP NOT NULL,
  date_range_end   TIMESTAMP NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE weekly_reflections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  content         TEXT NOT NULL,
  mood_arc        JSONB,
  entry_ids       UUID[] NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at);
CREATE INDEX idx_journal_entries_ai_processed_at ON journal_entries(ai_processed_at)
  WHERE ai_processed_at IS NULL;

CREATE INDEX idx_messages_thread_id ON messages(thread_id);

CREATE INDEX idx_patterns_user_id ON patterns(user_id);
CREATE INDEX idx_patterns_is_active ON patterns(user_id, is_active);
