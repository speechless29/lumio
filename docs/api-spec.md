# API Specification

Status: Phase 3 (Technical Planning) — Approved
Last updated: 2026-06-30

---

## Design Principles

- REST API, JSON request/response bodies throughout
- All endpoints (except auth) require a valid JWT in the Authorization header: `Authorization: Bearer <token>`
- All responses follow a consistent envelope format (see below)
- The frontend never calls the AI provider (Gemini) directly — all AI calls go through the backend. This is what allows the AI provider to be swapped without touching the frontend.
- UUIDs used for all resource IDs in URLs — never sequential integers
- Dates returned as ISO 8601 strings throughout

---

## Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ENTRY_NOT_FOUND",
    "message": "Journal entry not found."
  }
}
```

---

## Base URL

```
/api/v1
```

Versioned from day one — allows breaking changes in future without breaking existing clients.

---

## Auth Endpoints

### POST /api/v1/auth/register
Register a new user with email and password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "minimum8chars"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "relationship_tags": [],
      "created_at": "2026-06-30T00:00:00Z"
    }
  }
}
```

**Errors:**
- `400 EMAIL_TAKEN` — email already registered
- `400 INVALID_PASSWORD` — password under 8 characters
- `400 INVALID_EMAIL` — malformed email

---

### POST /api/v1/auth/login
Login with email and password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "their_password"
}
```

**Response (200):** same shape as register response

**Errors:**
- `401 INVALID_CREDENTIALS` — wrong email or password (never specify which — security)

---

### POST /api/v1/auth/google
Exchange a Google OAuth token for an app JWT.

**Request body:**
```json
{
  "google_token": "<token from Google OAuth flow>"
}
```

**Response (200):** same shape as register response
- Backend verifies token with Google, creates user if first time, returns app JWT

---

### POST /api/v1/auth/logout
Invalidate the current session token.

**Response (200):**
```json
{ "success": true, "data": null }
```

---

## User Endpoints

### GET /api/v1/users/me
Get the current authenticated user's profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "relationship_tags": ["family", "roommate"],
    "created_at": "2026-06-30T00:00:00Z",
    "last_active_at": "2026-06-30T00:00:00Z"
  }
}
```

---

### PATCH /api/v1/users/me/tags
Save onboarding relationship tag selections. Called once after the onboarding screen is completed.

**Request body:**
```json
{
  "relationship_tags": ["family", "roommate", "academic"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "relationship_tags": ["family", "roommate", "academic"]
  }
}
```

**Validation:**
- Tags must be from the allowed set: `family`, `friends`, `romantic_partner`, `roommate`, `coworker_boss`, `academic`, `prefer_not_to_say`
- If `prefer_not_to_say` is included, no other tags are allowed alongside it
- At least one tag required

---

## Journal Entry Endpoints

### GET /api/v1/entries
Get all journal entries for the current user, paginated, most recent first.

**Query params:**
- `page` (integer, default 1)
- `limit` (integer, default 10, max 50)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "uuid",
        "content": "Today was really hard...",
        "created_at": "2026-06-30T00:00:00Z",
        "mood_score": 4,
        "mood_label": "anxious",
        "mood_intensity": "moderate",
        "relationship_source": "roommate",
        "stressor_type": null,
        "ai_acknowledgment": "That sounds like a frustrating exchange...",
        "ai_processed_at": "2026-06-30T00:01:00Z",
        "thread_id": "uuid"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

---

### POST /api/v1/entries
Save a new journal entry. Triggers mood detection as a background job after saving.

**Request body:**
```json
{
  "content": "Today was really hard..."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "Today was really hard...",
    "created_at": "2026-06-30T00:00:00Z",
    "mood_score": null,
    "mood_label": null,
    "mood_intensity": null,
    "relationship_source": null,
    "stressor_type": null,
    "ai_acknowledgment": null,
    "ai_processed_at": null,
    "thread_id": null
  }
}
```

The entry is returned immediately with all AI fields null. The frontend polls for updates (see GET /api/v1/entries/:id below) until `ai_processed_at` is populated.

**Validation:**
- `content` required, minimum 10 characters, maximum 10,000 characters

---

### GET /api/v1/entries/:id
Get a single journal entry by ID.

**Response (200):** single entry object (same shape as entries array item above)

**Errors:**
- `404 ENTRY_NOT_FOUND`
- `403 FORBIDDEN` — entry belongs to a different user

---

## Trends Endpoints

### GET /api/v1/trends
Get mood data points for charting, filtered by date range.

**Query params:**
- `range` — `7d` | `30d` | `all` (default: `30d`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data_points": [
      {
        "entry_id": "uuid",
        "date": "2026-06-30",
        "mood_score": 4,
        "mood_label": "anxious",
        "relationship_source": "roommate",
        "stressor_type": null
      }
    ],
    "entry_count": 42,
    "has_enough_data": true
  }
}
```

**Notes:**
- Only entries where `ai_processed_at` is not null are included — unprocessed entries don't appear on the chart
- `has_enough_data` is false if fewer than 5 processed entries exist — frontend uses this to show empty state vs. chart

---

### GET /api/v1/trends/patterns
Get active AI-detected patterns for the current user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "id": "uuid",
        "pattern_type": "relationship",
        "category": "roommate",
        "description": "You've logged anxious entries 3 times this month after mentioning your roommate.",
        "entry_ids": ["uuid1", "uuid2", "uuid3"],
        "mood_score_avg": 3.5,
        "date_range_start": "2026-06-01T00:00:00Z",
        "date_range_end": "2026-06-30T00:00:00Z",
        "detected_at": "2026-06-25T00:00:00Z"
      }
    ]
  }
}
```

- Only `is_active: true` patterns returned
- Sorted by `mood_score_avg` ascending (most impactful first)
- Maximum 3 patterns returned — surface only the strongest, not every observation

---

## Thread & Message Endpoints (Should-Have — design now, implement later)

### GET /api/v1/entries/:id/thread
Get the thread and all messages for a specific journal entry.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "thread": {
      "id": "uuid",
      "created_at": "2026-06-30T00:00:00Z",
      "last_message_at": "2026-06-30T00:05:00Z"
    },
    "messages": [
      {
        "id": "uuid",
        "role": "assistant",
        "content": "That sounds like a frustrating exchange. Noted — anxious, moderate intensity.",
        "created_at": "2026-06-30T00:01:00Z"
      }
    ]
  }
}
```

**Errors:**
- `404 THREAD_NOT_FOUND` — mood detection hasn't completed yet for this entry

---

### POST /api/v1/entries/:id/thread/messages
Send a new user message in a thread. Returns the AI's response.

**Request body:**
```json
{
  "content": "I just don't understand why they keep doing this."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "uuid",
      "role": "user",
      "content": "I just don't understand why they keep doing this.",
      "created_at": "2026-06-30T00:05:00Z"
    },
    "assistant_message": {
      "id": "uuid",
      "role": "assistant",
      "content": "That frustration makes sense. It sounds like this isn't the first time...",
      "created_at": "2026-06-30T00:05:01Z"
    }
  }
}
```

**Notes:**
- Both messages returned in one response — no need for a separate polling step
- Backend sends full conversation history to AI on each message (see AI Architecture)

---

## Weekly Reflection Endpoints (Should-Have)

### GET /api/v1/reflections/latest
Get the most recent weekly reflection for the current user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reflection": {
      "id": "uuid",
      "week_start": "2026-06-24",
      "week_end": "2026-06-30",
      "content": "This week felt heavier toward the middle...",
      "mood_arc": {
        "high": { "day": "Saturday", "score": 8 },
        "low": { "day": "Wednesday", "score": 3 }
      },
      "created_at": "2026-06-30T00:00:00Z"
    },
    "has_reflection": true,
    "entries_this_week": 5,
    "entries_needed": 5
  }
}
```

- `has_reflection: false` when fewer than 5 entries exist this week — frontend shows empty state
- `entries_this_week` and `entries_needed` drive the progress indicator in the empty state

---

## Validation Rules (Global)

| Field | Rule |
|---|---|
| email | Valid email format, max 255 chars |
| password | Min 8 chars, no max (hashed, length irrelevant after) |
| journal content | Min 10 chars, max 10,000 chars |
| relationship_tags | Must be from allowed enum, at least 1 required |
| mood_score | Integer 1–10, set by backend only |
| mood_intensity | Enum: low, moderate, high — set by backend only |
| UUID params | Valid UUID format — return 400 BAD_REQUEST if malformed |

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Resource belongs to different user |
| `ENTRY_NOT_FOUND` | 404 | Journal entry not found |
| `THREAD_NOT_FOUND` | 404 | Thread not found or not yet created |
| `EMAIL_TAKEN` | 400 | Email already registered |
| `INVALID_EMAIL` | 400 | Malformed email |
| `INVALID_PASSWORD` | 400 | Password too short |
| `INVALID_TAGS` | 400 | Tags contain invalid values |
| `CONTENT_TOO_SHORT` | 400 | Entry content under 10 chars |
| `CONTENT_TOO_LONG` | 400 | Entry content over 10,000 chars |
| `AI_UNAVAILABLE` | 503 | AI provider call failed — entry saved, processing queued |
| `RATE_LIMITED` | 429 | Too many requests |
