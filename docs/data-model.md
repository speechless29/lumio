# Data Model

Status: Phase 3 (Technical Planning) — Approved
Last updated: 2026-06-30
Database: PostgreSQL

---

## Design Principles

- All primary keys are UUIDs — never sequential integers. User IDs must not be guessable for a privacy-sensitive application.
- Every table has `created_at` as a non-nullable timestamp with a default of `now()`.
- Soft deletes preferred over hard deletes for user-generated content — entries are never permanently deleted in v1 (future feature: user-requested data deletion for privacy compliance).
- AI-generated content is always stored after the first generation — never re-call the API just to re-display something already computed.
- The data model is designed so Gemini can be replaced with any other LLM without a schema change — the AI layer writes to the same fields regardless of which model produced the output.

---

## Tables

### 1. users

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255),         -- NULL for Google auth users
  google_id         VARCHAR(255) UNIQUE,  -- NULL for email/password users
  relationship_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  last_active_at    TIMESTAMP
);
```

**Field notes:**
- `password_hash` and `google_id` are mutually exclusive — one will always be NULL per user. No account linking in v1.
- `relationship_tags` stores onboarding selections as a flat array (e.g., `["family", "roommate", "academic"]`). Never queried across users — only read per-user to feed AI prompts. Array on users table is correct; separate table would be over-engineering.
- `last_active_at` updated on every authenticated session — drives adaptive dashboard logic.

---

### 2. journal_entries

```sql
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
  ai_processed_at     TIMESTAMP,           -- NULL until mood detection completes
  thread_id           UUID REFERENCES threads(id)
);
```

**Field notes:**
- `mood_score`, `mood_label`, `mood_intensity`, `relationship_source`, `stressor_type`, `ai_acknowledgment`, `ai_processed_at` are all NULL on insert — populated after mood detection API call completes.
- `ai_processed_at` being NULL is the signal for a background retry job if the API call failed silently.
- `relationship_source` is a single value (dominant source), not an array. Gemini is instructed to identify the single most prominent relationship source. Covers edge cases well enough for v1.
- `stressor_type` is separate from `relationship_source` — an entry can have both (e.g., roommate conflict during exam week).
- `thread_id` is NULL until a thread is created post-mood-detection. Set automatically by the backend — never set by the frontend directly.
- `ON DELETE CASCADE` — if a user account is deleted, all their entries are deleted too.

**Indexes:**
```sql
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at);
CREATE INDEX idx_journal_entries_ai_processed_at ON journal_entries(ai_processed_at)
  WHERE ai_processed_at IS NULL; -- partial index for retry job
```

---

### 3. threads

```sql
CREATE TABLE threads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_entry_id  UUID NOT NULL UNIQUE REFERENCES journal_entries(id) ON DELETE CASCADE,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  last_message_at   TIMESTAMP
);
```

**Field notes:**
- `journal_entry_id` is UNIQUE — one thread per journal entry, enforced at the database level.
- Created automatically by the backend immediately after mood detection completes — not by any user action.
- `last_message_at` updated whenever a new message is added to the thread.

---

### 4. messages

```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
```

**Field notes:**
- `role` values ("user" | "assistant") mirror the exact format expected by Gemini and most LLM APIs. Messages can be passed directly to the AI as conversation history without transformation.
- The AI acknowledgment generated after saving a journal entry is stored here as the first message (role: "assistant") in the thread — never duplicated elsewhere on the journal_entries table.
- Messages are never analyzed for mood — only journal entries are. Chat is for conversation; journal entries are for pattern data. These responsibilities are intentionally separated.

**Index:**
```sql
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
```

---

### 5. patterns

```sql
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
```

**Field notes:**
- `pattern_type` maps to the Phase 1 friction source split: "relationship" (family, peers, work) vs. "situational" (academic/career pressure).
- `description` is the plain-language sentence shown in the pattern card on the Trends screen (e.g., "You've logged anxious entries 3 times this month after mentioning your roommate."). Stored so it is never re-generated just for display.
- `entry_ids` is an array of journal entry UUIDs that make up this pattern. Used to highlight specific chart data points when a pattern card is tapped.
- `mood_score_avg` allows patterns to be sorted by severity — most impactful patterns shown first.
- `is_active` — patterns are never deleted, only marked inactive when they no longer appear in recent data. Preserves history.
- Pattern detection runs after every 5th journal entry (not on every save) — see AI Architecture for trigger logic.

**Index:**
```sql
CREATE INDEX idx_patterns_user_id ON patterns(user_id);
CREATE INDEX idx_patterns_is_active ON patterns(user_id, is_active);
```

---

### 6. weekly_reflections

```sql
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
```

**Field notes:**
- `UNIQUE(user_id, week_start)` — one reflection per user per week, enforced at the database level.
- `content` is the AI-written paragraph shown on the Weekly Reflection screen.
- `mood_arc` stored as JSONB — flexible structure for the week's high/low mood points (e.g., `{"high": {"day": "Saturday", "score": 8}, "low": {"day": "Wednesday", "score": 3}}`). JSONB chosen over separate columns because the shape may evolve.
- `entry_ids` — the specific entries that were used to generate this reflection. Stored for traceability.
- Generated once per week, after at least 5 entries exist in the past 7 days. Never regenerated — if already exists for a week, it is not overwritten.

---

## Entity Relationship Summary

```
users
  ├── journal_entries (one user → many entries)
  │     └── threads (one entry → one thread, optional)
  │           └── messages (one thread → many messages)
  ├── patterns (one user → many patterns)
  └── weekly_reflections (one user → many reflections, one per week)
```

---

## Seed Data / Enums Reference

**relationship_tags / relationship_source values:**
`family` | `friends` | `romantic_partner` | `roommate` | `coworker_boss`

**stressor_type values:**
`academic` | `career` | `financial` (future) | `health` (future)

**mood_label examples (not exhaustive — set by AI):**
`anxious` | `content` | `frustrated` | `overwhelmed` | `calm` | `sad` | `hopeful`

**mood_intensity values:**
`low` | `moderate` | `high`

**pattern_type values:**
`relationship` | `situational`

**message role values:**
`user` | `assistant`
