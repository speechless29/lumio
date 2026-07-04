# AI Architecture

Status: Phase 3 (Technical Planning) — Approved
Last updated: 2026-06-30

---

## Core Design Principle: Provider Abstraction

The frontend never calls any AI provider directly. All AI calls go through the backend via a single abstraction layer called the **AI Service**. This means:

- Swapping Gemini for another model (OpenAI, Anthropic, a self-hosted model) requires changes only to the AI Service — zero frontend changes, zero API contract changes, zero database schema changes.
- The rest of the backend treats the AI Service as a black box: send it a job type + input data, receive structured output. It does not care what model runs underneath.

---

## AI Service Interface

The AI Service exposes three internal functions — not HTTP endpoints, just backend functions called by other backend services:

```
AIService.analyzeMood(entryId)
  → { mood_score, mood_label, mood_intensity, relationship_source, stressor_type, acknowledgment }

AIService.detectPatterns(userId)
  → { patterns: [{ pattern_type, category, description, entry_ids, mood_score_avg, date_range_start, date_range_end }] }

AIService.generateReflection(userId, weekStart, weekEnd)
  → { content, mood_arc }
```

Each function:
1. Fetches the required data from the database itself
2. Builds the prompt
3. Calls the configured AI provider (currently Gemini)
4. Parses and validates the response
5. Returns structured data to the caller
6. The caller (background job or request handler) writes the result to the database

The AI Service never writes to the database directly — it only reads and returns. Writing is always the caller's responsibility. This keeps the AI layer stateless and testable.

---

## Job 1 — Mood Detection (analyzeMood)

### Trigger
Runs as a background job immediately after a journal entry is saved. Not blocking — the entry save returns to the frontend instantly, the AI job runs asynchronously.

### Input data fetched
- The journal entry's full content
- The user's `relationship_tags` (from the users table — the onboarding selections)

### Prompt structure (Gemini)

```
System prompt:
You are an emotional pattern assistant. Your job is to analyze a private journal entry 
and extract structured emotional data. You do not give advice. You do not make judgments 
about the people mentioned. You identify observations, not causes.

Rules:
- mood_score: integer 1–10 (1 = very distressed, 10 = very positive)
- mood_label: a single emotion word (e.g., anxious, content, frustrated, overwhelmed, calm, sad, hopeful)
- mood_intensity: "low" | "moderate" | "high"
- relationship_source: identify the single most prominent person or group mentioned. 
  Must be one of: [user's relationship_tags joined as a list]. 
  Return null if none are clearly present.
- stressor_type: "academic" | "career" | null — only if academic or career pressure 
  is a clear theme, independent of any relationship source.
- acknowledgment: 1–2 sentences. Reflect what was written back warmly. 
  Include the mood_label and mood_intensity naturally. 
  Do not give advice. Do not mention specific people by name. 
  Do not make causal claims. Maximum 40 words.

Return ONLY a JSON object. No preamble, no explanation, no markdown.

User journal entry:
[entry content]
```

### Expected response (from Gemini)

```json
{
  "mood_score": 4,
  "mood_label": "anxious",
  "mood_intensity": "moderate",
  "relationship_source": "roommate",
  "stressor_type": null,
  "acknowledgment": "That sounds like a frustrating exchange. Noted — anxious, moderate intensity."
}
```

### After AI Service returns
The calling job:
1. Writes all fields to the `journal_entries` row
2. Sets `ai_processed_at` to now()
3. Creates a `threads` row for this entry
4. Creates a `messages` row (role: "assistant", content: the acknowledgment) as message #1
5. Sets `journal_entries.thread_id` to the new thread's ID
6. If entry count for this user is now a multiple of 5 → triggers `detectPatterns` job

### Error handling
- If Gemini returns malformed JSON → retry once after 30 seconds
- If retry fails → `ai_processed_at` stays null, entry stays in a retry queue
- Entry content is never lost due to AI failure — it was already saved before this job ran
- Frontend shows: *"We couldn't analyze this entry right now. It's saved — we'll try again later."*

---

## Job 2 — Pattern Detection (detectPatterns)

### Trigger
Runs after every 5th processed journal entry for a user (i.e., when the count of entries where `ai_processed_at IS NOT NULL` is a multiple of 5).

### Input data fetched
- All processed journal entries for this user (id, created_at, mood_score, mood_label, relationship_source, stressor_type, content truncated to first 200 chars)
- User's relationship_tags

### Prompt structure (Gemini)

```
System prompt:
You are an emotional pattern analyst. You identify recurring patterns in a person's 
emotional data over time. You state observations only — never causes, never judgments, 
never advice. You do not know the full context of anyone's relationships.

Rules:
- Identify 1–3 of the strongest recurring patterns only. Do not force patterns 
  where data is insufficient.
- Each pattern must be supported by at least 3 data points (entries).
- pattern_type: "relationship" (triggered by a person/group) | "situational" (triggered by a context)
- category: the specific tag (e.g., "roommate", "family", "academic")
- description: one plain sentence. State what you observed. 
  Do not imply cause. Do not use "because". Maximum 25 words.
  Example: "You've logged anxious entries 3 times this month after mentioning your roommate."
- entry_ids: the UUIDs of the entries that support this pattern
- mood_score_avg: average mood_score across those entries
- date_range_start, date_range_end: ISO 8601 dates covering the pattern's entries

Return ONLY a JSON object. No preamble, no markdown.

Entries (JSON array):
[array of entry summaries]
```

### Expected response

```json
{
  "patterns": [
    {
      "pattern_type": "relationship",
      "category": "roommate",
      "description": "You've logged anxious entries 3 times this month after mentioning your roommate.",
      "entry_ids": ["uuid1", "uuid2", "uuid3"],
      "mood_score_avg": 3.5,
      "date_range_start": "2026-06-01T00:00:00Z",
      "date_range_end": "2026-06-30T00:00:00Z"
    }
  ]
}
```

### After AI Service returns
The calling job:
1. Marks all existing `is_active: true` patterns for this user as `is_active: false`
2. Inserts new pattern rows from the response
3. New patterns are immediately available via GET /api/v1/trends/patterns

### Error handling
- If Gemini returns malformed JSON or empty patterns array → keep existing active patterns, log the failure, do not mark old patterns inactive
- Pattern detection failure is silent to the user — trends screen continues showing the last successfully detected patterns

---

## Job 3 — Weekly Reflection (generateReflection)

### Trigger
Runs once per week, on Sunday at midnight (or the first time the user opens the app after Sunday midnight, if background jobs are not available in the deployment environment). Only runs if:
- At least 5 processed entries exist for the user in the past 7 days
- No reflection already exists for this week (unique constraint on user_id + week_start)

### Input data fetched
- All processed entries from the past 7 days (full content, mood_score, mood_label, created_at, relationship_source, stressor_type)

### Prompt structure (Gemini)

```
System prompt:
You are writing a brief, warm weekly emotional summary for a person based on their 
private journal entries from the past week. 

Rules:
- Write in second person ("you", "your")
- 3–5 sentences only
- Observational tone — describe what you noticed, not what they should do
- Do not name specific people mentioned in entries
- Do not give advice or suggest actions
- Do not use clinical language
- Identify the week's emotional high point and low point for mood_arc

Return ONLY a JSON object. No preamble, no markdown.

Entries from this week:
[array of entries with content, mood_score, mood_label, created_at]
```

### Expected response

```json
{
  "content": "This week felt heavier toward the middle. Wednesday and Thursday both included mentions of a tense situation that overlapped with what sounds like a stressful academic period. By the weekend, your entries shifted — shorter, less tense.",
  "mood_arc": {
    "high": { "day": "Saturday", "score": 8 },
    "low": { "day": "Wednesday", "score": 3 }
  }
}
```

### After AI Service returns
Inserts a new row into `weekly_reflections`.

---

## Chat Continuation (Should-Have)

### How it works
When a user sends a message via POST /api/v1/entries/:id/thread/messages:

1. Backend fetches the full message history for this thread (all prior messages, ordered by created_at)
2. Backend fetches the source journal entry content
3. Builds conversation history in the format: `[{ role, content }, ...]`
4. Prepends a system message (see below)
5. Appends the new user message
6. Sends the full array to Gemini
7. Stores both the user message and the AI response as new rows in messages
8. Returns both in the API response

### System prompt for chat

```
You are a warm, thoughtful conversation partner helping someone process 
what they wrote in their journal. You have access to their journal entry 
and the conversation so far.

Rules:
- Ask questions more than you make statements
- Never give direct advice unless explicitly asked
- Never diagnose or suggest mental health conditions
- Do not reference specific people by name — use "they" or "this person"
- Do not make causal claims about why someone behaved a certain way
- Keep responses concise — 2–4 sentences maximum per reply
- If the user seems to be in distress, acknowledge it warmly and 
  suggest speaking with someone they trust

Journal entry (context — do not repeat this back to the user):
[entry content]
```

---

## Provider Swap Guide

To replace Gemini with another provider:

1. Open `/src/services/ai/provider.js` (or equivalent)
2. Replace the Gemini API call with the new provider's API call
3. Ensure the new provider returns responses in the same JSON structure defined above
4. No other files need to change

The prompts themselves live in `/src/services/ai/prompts/` as separate files — one per job type. They are provider-agnostic (plain text instructions) and do not need to change when the provider changes, unless the new provider requires a different prompting style.

---

## AI Behavior Rules (enforced via prompt — summary)

These rules are non-negotiable and must appear in every prompt that generates user-facing content:

| Rule | Reason |
|---|---|
| State observations, never causes | App does not know full context of anyone's relationships |
| Never name specific people mentioned in entries | Privacy — entries may mention real people |
| Never give unsolicited advice | App is not a therapist |
| Never use clinical language | App is not a diagnostic tool |
| Never diagnose or suggest mental health conditions | Legal and ethical boundary |
| If user expresses distress, acknowledge and suggest a trusted person | Duty of care — minimum safe response |
| Maximum word counts on all generated text | Prevents verbose, overwhelming responses |
