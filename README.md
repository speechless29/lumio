# Lumio

Lumio is a private journaling app that analyzes emotional language in journal entries, lets writers confirm or edit the detected emotions, and provides context-aware chat, mood-calendar summaries, recurring patterns, and weekly reflections.

This README describes the implementation in this repository. It does not claim that the configured database or external AI service is currently reachable in a deployed environment.

## What the app does

- **Journal:** Save entries, then asynchronously analyze mood, emotions, relationship context, situational stressors, and safety. The journal page polls for the completed analysis and lets the writer confirm or edit the detected emotions.
- **Chat:** Continue a conversation attached to a processed journal entry. The entry is supplied as background context, prior messages are retained, and new messages receive a separate safety assessment.
- **Trends:** View processed-entry statistics and a month-by-month calendar. Days with mood scores receive a color based on that day's average score. Selecting a date loads that date's entries.
- **Patterns:** Review up to three deterministic recurring relationship or situational patterns when supported by repeated entries.
- **Weekly reflection:** Generate and store a short reflection after at least five processed entries in the current Sunday-to-Sunday week.
- **Onboarding:** Choose relationship-context tags. The current tags API is a placeholder and does not persist the selection yet.
- **About:** Read the app's explanation of its AI role and limitations.

## Core experience

### 1. Write an entry

The authenticated `POST /api/v1/entries` endpoint accepts journal text between 10 and 10,000 characters. It inserts the entry first and starts safety assessment and mood analysis in the background. The client polls the entry endpoint until `ai_processed_at` is set, up to 45 attempts.

Mood analysis returns a `mood_score` from **1 to 10**, where 1 is extremely negative, 5 is roughly neutral or strongly mixed, and 10 is extremely positive. It also returns one primary emotion, up to two secondary emotions, intensity (`low`, `moderate`, or `high`), supporting evidence, optional relationship and stressor classifications, and a short acknowledgment.

The allowed 28-label emotion vocabulary is:

`admiration`, `amusement`, `anger`, `annoyance`, `approval`, `caring`, `confusion`, `curiosity`, `desire`, `disappointment`, `disapproval`, `disgust`, `embarrassment`, `excitement`, `fear`, `gratitude`, `grief`, `joy`, `love`, `nervousness`, `optimism`, `pride`, `realization`, `relief`, `remorse`, `sadness`, `surprise`, and `neutral`.

The prompt asks the model to ground emotion labels in entry text rather than assume how the writer should feel. It separately records academic or career stress and a matching relationship tag when one is evident.

### 2. Confirm or edit emotions

After the latest entry's processing finishes, the journal page displays the detected emotions and asks, “Does this feel right?” The writer can confirm the detected primary and secondary emotions or edit the set to choose one to three labels from the same vocabulary. The API stores the chosen labels and a `confirmed` or `edited` feedback value. The original AI fields remain stored separately. When user emotions exist, the journal and pattern detector prefer them for display or pattern summaries.

### 3. Continue in chat

Each successfully processed entry gets a thread with the AI acknowledgment as its first assistant message. Chat messages include the original journal entry as untrusted background context, prior user and assistant messages, and the latest user message exactly once. Replies are intended to be concise and in the user's language; the prompt disallows diagnoses, invented details, confident causal claims, and unsolicited advice.

Every new chat message is safety-assessed in parallel with normal response generation. A non-`none` classification replaces the normal reply with a static safety response.

### 4. Explore trends and the mood calendar

The Trends page has 7-day, 30-day, and all-time ranges for its processed-entry statistics. It shows average mood, entry count, and a writing streak, followed by the calendar and any detected patterns. The calendar has its own month navigation and aggregates non-null mood scores by stored calendar date.

Each calendar day gets one color from its **average mood score**:

| Daily average        | Dot color |
| -------------------- | --------- |
| $\leq 4$             | Red       |
| $> 4$ and $\leq 6.5$ | Amber     |
| $> 6.5$              | Green     |

Selecting a calendar date requests all journal entries for that date, including entries whose asynchronous mood processing has not finished. The Trends page currently hides the statistics, calendar, and patterns until at least five processed entries exist for the account.

### 5. Review recurring patterns

Pattern detection is deterministic application code, not free-form LLM pattern generation. Processed entries are grouped by `relationship_source` and `stressor_type`. A group needs at least three supporting entries. Its description reports the most common verified emotion where available, otherwise the primary AI emotion; it does not assert that a person or situation caused the emotion.

Patterns refresh after every fifth processed entry (5, 10, 15, ...). The detector returns at most the three strongest groups. Existing active patterns are retained when a refresh finds no supported pattern.

### 6. Get a weekly reflection

The Reflect page requests a reflection for the current Sunday-to-Sunday week. At least five processed entries in that week are required. The model is prompted to return a three-to-five-sentence observation and a mood arc containing high and low days and scores. The result is stored by user and week, so a saved reflection is reused instead of being regenerated on each page load.

## Safety design

Safety assessment is separate from emotion analysis. The safety schema returns a level and supporting evidence:

- `none`: no meaningful indication of self-harm or suicide risk.
- `concern`: thoughts of self-harm, suicide, or wishing to die are present, without clear evidence of immediate action or near-term intent.
- `imminent`: current or near-term intent, an ongoing attempt, immediate danger, or concrete preparation is indicated.

The prompt distinguishes ordinary negative emotions from risk, the writer from another person, current from historical statements, and intent from explicit negation. For journal entries, `concern` and `imminent` replace the normal AI acknowledgment with application-written text; `none` leaves the normal acknowledgment in place. Chat repeats the assessment for every new message and uses an English or Vietnamese static response for non-`none` results. Crisis-support links point to `findahelpline.com`; the app does not ask the model to invent hotline numbers.

## AI architecture

`lib/ai/provider.js` centralizes calls to Google's `@google/genai` SDK. By default it uses:

- Primary: `gemini-3.5-flash`
- Fallback: `gemini-2.5-flash`

Set `GEMINI_MODEL` or `GEMINI_FALLBACK_MODEL` to override those defaults. These are the defaults in source, not a claim that either model is available to a particular API key or account.

Mood and safety use JSON schema-constrained generation with a low temperature. Mood output includes `mood_score`, `primary_emotion`, `secondary_emotions`, `mood_intensity`, `evidence`, `relationship_source`, `stressor_type`, and `acknowledgment`. Safety output includes `level` and nullable `evidence`. Chat uses multi-turn text generation; weekly reflection uses text generation whose prompt requests a JSON object containing `content` and `mood_arc`.

Retry behavior in the provider:

- Each model attempt can retry a retryable API failure once, with exponential delay plus jitter.
- After retryable primary-model failure, generation switches to the fallback model, which also gets up to two attempts.
- Structured generation makes up to two outer attempts and waits briefly before the second attempt. It strips Markdown fences or extracts a JSON object/array from surrounding text before parsing.
- Non-retryable primary failures do not trigger model fallback.

## Database model

The schema below is derived from migrations `001` through `004` in order. The six tables are `users`, `journal_entries`, `threads`, `messages`, `patterns`, and `weekly_reflections`. Migration `001` also creates the `pgcrypto` extension and indexes; later migrations add emotion evidence, writer feedback, and safety classification fields.

### Current `journal_entries` columns

| Column                | Type / constraint                                                      |
| --------------------- | ---------------------------------------------------------------------- |
| `id`                  | UUID primary key, generated by `gen_random_uuid()`                     |
| `user_id`             | UUID, required foreign key to `users.id`, cascade on delete            |
| `content`             | TEXT, required                                                         |
| `created_at`          | TIMESTAMP, required, defaults to `now()`                               |
| `mood_score`          | INTEGER, nullable, constrained to 1 through 10                         |
| `mood_label`          | VARCHAR(100), nullable                                                 |
| `mood_intensity`      | VARCHAR(20), nullable, constrained to `low`, `moderate`, or `high`     |
| `relationship_source` | VARCHAR(100), nullable                                                 |
| `stressor_type`       | VARCHAR(100), nullable                                                 |
| `ai_acknowledgment`   | TEXT, nullable                                                         |
| `ai_processed_at`     | TIMESTAMP, nullable                                                    |
| `thread_id`           | UUID, nullable foreign key to `threads.id`                             |
| `secondary_emotions`  | TEXT[], required, defaults to an empty array                           |
| `emotion_evidence`    | JSONB, required, defaults to an empty JSON array                       |
| `user_emotions`       | TEXT[], nullable                                                       |
| `emotion_feedback`    | VARCHAR(20), nullable, constrained to `confirmed` or `edited`          |
| `emotion_feedback_at` | TIMESTAMP, nullable                                                    |
| `safety_level`        | VARCHAR(20), nullable, constrained to `none`, `concern`, or `imminent` |

The previous README's broad table list was mostly current, but its journal column list omitted the required identity, ownership, content, and creation columns. Its app description, AI model names, and trends-chart description were stale. The actual calendar is a colored-dot grid, not a rendered line chart.

## API overview

Unless noted otherwise, successful application endpoints return JSON with `success: true` and their payload under `data`. The API uses JWT Bearer authentication through `Authorization`; the health endpoint and auth endpoints are public. API errors generally use `{ success: false, error: { code, message } }`. The route handlers below are all current `route.js` files under `app/api/v1`.

| Method and path                             | Behavior and success payload                                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/register`                | Accepts `{ email, password }`; returns `data: { token, user }` with HTTP 201.                                                                                         |
| `POST /api/v1/auth/login`                   | Accepts `{ email, password }`; returns `data: { token, user }`.                                                                                                       |
| `POST /api/v1/auth/google`                  | Placeholder; returns `{ success: true, data: null }`. No Google OAuth flow is implemented in this handler.                                                            |
| `POST /api/v1/auth/logout`                  | Placeholder; returns `{ success: true, data: null }`. Client logout clears local storage and the cookie; the handler does not revoke a JWT.                           |
| `GET /api/v1/entries`                       | Returns paginated `data: { entries, total, page, limit }`; accepts `page` and `limit` query parameters.                                                               |
| `GET /api/v1/entries?date=YYYY-MM-DD`       | Returns `data: { entries, date }` for the selected date.                                                                                                              |
| `POST /api/v1/entries`                      | Accepts `{ content }`; inserts the entry and starts background AI processing; returns `data: entry` with HTTP 201.                                                    |
| `GET /api/v1/entries/:id`                   | Returns `data: entry` for the authenticated owner.                                                                                                                    |
| `PATCH /api/v1/entries/:id`                 | Accepts `{ emotions, feedback }`, where `emotions` contains one to three allowed labels and `feedback` is `confirmed` or `edited`; returns `data: updatedEntry`.      |
| `GET /api/v1/entries/:id/thread`            | Returns `data: { thread, messages }`.                                                                                                                                 |
| `POST /api/v1/entries/:id/thread/messages`  | Accepts `{ content }`; returns `data: { user_message, assistant_message, safety_level }` with HTTP 201. AI failure returns HTTP 503.                                  |
| `GET /api/v1/trends?range=7d\|30d\|all`     | Returns `data: { data_points, total_entries, has_enough_data }`. An unrecognized range defaults to `30d`.                                                             |
| `GET /api/v1/trends/calendar?month=YYYY-MM` | Returns `data: { month, days }`; each day has `date`, `avgMood`, `entryCount`, and `color`.                                                                           |
| `GET /api/v1/trends/patterns`               | Returns `data: { patterns }` with up to three active patterns.                                                                                                        |
| `GET /api/v1/reflections`                   | Returns `data: { reflection, has_reflection, entries_this_week, entries_needed }`; may generate and store the reflection when five processed entries exist that week. |
| `GET /api/v1/users/me`                      | Returns `data` with user ID, email, relationship tags, creation time, and last-active time.                                                                           |
| `PATCH /api/v1/users/me/tags`               | Placeholder; returns `{ success: true, data: null }` and currently does not persist submitted tags.                                                                   |
| `GET /api/v1/health`                        | Returns `{ success: true, time }` when the database query succeeds; otherwise returns `{ success: false, error }` with HTTP 500.                                      |

## Current implementation status

“Implemented” describes code present in this repository. External service credentials, database contents, and deployed production behavior have not been verified as part of this README audit.

| Feature                               | Status                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Email/password registration and login | Implemented; returns a signed JWT and stores it client-side.                                                      |
| Protected app pages and API requests  | Implemented using a `lumio_token` cookie for page middleware and Bearer JWTs for API routes.                      |
| Google sign-in                        | Not implemented; route is a placeholder.                                                                          |
| Server-side JWT revocation on logout  | Not implemented; client removes local token and cookie.                                                           |
| Onboarding tag selection              | UI is implemented; API handler is a placeholder and does not save tags.                                           |
| Journal entry create/list/detail      | Implemented, including pagination, date filtering, and polling for asynchronous AI fields.                        |
| Mood and safety analysis              | Implemented through the Gemini provider; requires valid database and Gemini configuration.                        |
| Emotion confirmation/editing          | Implemented for the latest processed entry shown by the journal page.                                             |
| Entry-specific multi-turn chat        | Implemented for processed entries, with a separate safety assessment per message.                                 |
| Trend summary and calendar            | Implemented; calendar is shown after five processed entries and has month navigation and day detail.              |
| Recurring pattern detection           | Implemented deterministically and refreshed at processed-entry counts divisible by five.                          |
| Weekly reflection                     | Implemented on demand after five processed entries in the current week, then stored.                              |
| About the AI page                     | Implemented.                                                                                                      |
| Automated test suite                  | No test script is defined in `package.json`; validation currently relies on lint/build tooling and manual checks. |

## Setup

Requirements: Node.js, npm, a PostgreSQL database, and a Gemini API key for AI features.

1. Install dependencies with `npm install`.
2. Configure `.env.local` with:

   ```dotenv
   DATABASE_URL=postgresql://user:password@host:5432/database
   JWT_SECRET=replace-with-a-long-random-secret
   GEMINI_API_KEY=your-gemini-api-key
   # Optional model overrides:
   GEMINI_MODEL=gemini-3.5-flash
   GEMINI_FALLBACK_MODEL=gemini-2.5-flash
   ```

3. Apply the SQL files in `lib/db/migrations/` in numeric order (`001` through `004`) to the configured PostgreSQL database.
4. Start the development server with `npm run dev` and open `http://localhost:3000`.

Available package scripts are `dev`, `build`, `start`, and `lint`. No migration runner or automated test script is configured in `package.json`.

## Limitations and operational notes

- Mood analysis runs after the entry insert. A recent entry can appear in day detail before its mood score exists, and it will not contribute to a calendar dot until `mood_score` is populated.
- The calendar averages multiple scored entries on the same stored date into one dot; it does not show individual score dots.
- `created_at`, `ai_processed_at`, and `emotion_feedback_at` are `TIMESTAMP` without time zone. Calendar grouping uses the stored database date while month boundaries are constructed from UTC JavaScript dates; no explicit user-time-zone policy is implemented, so entries near midnight may be grouped differently than a user's local calendar expects.
- The Trends page requires five processed entries before it renders the calendar, even if earlier calendar dates have scores.
- Pattern cards currently include the instruction “Tap to highlight on chart,” but no chart is rendered in the current Trends page. The card's active styling changes; chart highlighting does not occur.
- Pattern refreshes happen only after each fifth processed entry. A newly eligible pattern may not be recomputed until the next milestone.
- Google auth, server-side logout, and relationship-tag persistence are placeholders, not working end-to-end features.
- Journal analysis is launched as in-process background work after returning the create response. There is no durable job queue in this repository; process termination or AI failure can leave an entry unprocessed.
- AI calls send journal text to Google's Gemini API. The About page says entries are private to the user's account and not shared with other users, but they are sent to Google for processing.
- No integration test suite or scheduled weekly job is configured. Weekly reflection generation is triggered when the Reflect page calls the API.

## Project structure

Generated from the current repository tree; `node_modules`, `.next`, and `.git` are excluded.

```text
lumio/
├── .env.local
├── app/
│   ├── about/
│   │   └── page.js
│   ├── api/
│   │   └── v1/
│   │       ├── auth/
│   │       │   ├── google/route.js
│   │       │   ├── login/route.js
│   │       │   ├── logout/route.js
│   │       │   └── register/route.js
│   │       ├── entries/
│   │       │   ├── [id]/
│   │       │   │   ├── thread/
│   │       │   │   │   ├── messages/route.js
│   │       │   │   │   └── route.js
│   │       │   │   └── route.js
│   │       │   └── route.js
│   │       ├── health/route.js
│   │       ├── reflections/route.js
│   │       ├── trends/
│   │       │   ├── calendar/route.js
│   │       │   ├── patterns/route.js
│   │       │   └── route.js
│   │       └── users/
│   │           └── me/
│   │               ├── tags/route.js
│   │               └── route.js
│   ├── chat/
│   │   └── [id]/page.js
│   ├── journal/page.js
│   ├── login/page.js
│   ├── onboarding/page.js
│   ├── reflect/page.js
│   ├── signup/page.js
│   ├── trends/
│   │   ├── CalendarView.js
│   │   └── page.js
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── Logo.js
│   └── Navbar.js
├── docs/
│   ├── screenshots/
│   │   ├── chat.png
│   │   ├── journal.png
│   │   ├── reflect.png
│   │   └── trends.png
│   ├── ai-architecture.md
│   ├── api-spec.md
│   ├── data-model.md
│   ├── product-spec.md
│   ├── roadmap.md
│   ├── user-flow.md
│   └── wireframes.md
├── lib/
│   ├── ai/
│   │   ├── prompts/
│   │   │   ├── analyzeMood.js
│   │   │   ├── assessSafety.js
│   │   │   └── generateReflection.js
│   │   ├── aiService.js
│   │   └── provider.js
│   ├── auth.js
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_emotion_details.sql
│   │   │   ├── 003_emotion_feedback.sql
│   │   │   └── 004_safety.sql
│   │   ├── queries/
│   │   │   ├── entries.js
│   │   │   ├── reflections.js
│   │   │   ├── trends.js
│   │   │   ├── trendsCalendar.js
│   │   │   └── users.js
│   │   └── index.js
│   ├── middleware/auth.js
│   ├── patterns/patternService.js
│   └── trends/moodColor.js
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .gitignore
├── eslint.config.mjs
├── jsconfig.json
├── middleware.js
├── next.config.mjs
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── README.md
└── test.http
```

## Screenshots

Four screenshot files currently exist in `docs/screenshots/`, but their displayed states have not been verified against the current UI. This README does not embed or claim them as current captures. Please replace those captures with the states below and place the files in `docs/screenshots/`. Also capture the recurring-patterns and onboarding states listed below; name those files when you add them. I will add the screenshots table and image references only after you confirm the captures are in place.

1. **Journal emotion confirmation** (`journal.png`): Sign in, save an entry of at least 10 characters, wait for AI processing to finish, and capture the latest-entry panel while “Does this feel right?” and the Yes/Edit actions are visible. Do not confirm or edit before capturing.
2. **Trends calendar with selected day** (`trends.png`): Use an account with at least five processed entries overall. In the visible month, have scored entries on multiple dates with a range of averages so colored dots can be seen. Select a date with at least one entry so the day-detail panel displays its stored entry text. Ideally include red, amber, and green dots if the data permits.
3. **Chat thread** (`chat.png`): Open the thread for a processed journal entry, with the original entry context and at least one user/assistant follow-up exchange visible.
4. **Weekly reflection** (`reflect.png`): Use an account with at least five processed entries in the current Sunday-to-Sunday week. Load the saved reflection so its text and high/low mood-arc scores are visible.
5. **Recurring patterns:** Use an account with at least five processed entries and a stored active pattern supported by at least three entries sharing a relationship or situational category. Capture the pattern description on Trends; the current app does not render the chart mentioned by the card's old highlight instruction.
6. **Onboarding tags:** Capture the onboarding page with several relationship options selected and the Continue button enabled. This is a UI-state capture only; tag persistence is not implemented yet.
