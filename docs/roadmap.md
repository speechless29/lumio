# Project Roadmap

Status: Phase 3 (Technical Planning) — Approved
Last updated: 2026-06-30
Timeline: ~4 weeks (one month of summer)

---

## Guiding Principle

A finished, polished 4-feature app beats an ambitious 8-feature app that is 70% complete. Every week, the goal is a working, demo-able product — not a collection of half-built screens. Should-Have features only begin after Must-Have features are fully working and visually polished.

---

## Week 1 — Foundation (Must-Have: Auth + Journal Entry)

**Goal by end of week:** A user can sign up, complete onboarding, write a journal entry, and see it saved. No AI yet — just the data layer and UI working end to end.

### Tasks
- [ ] Project setup: repo, folder structure, environment variables
- [ ] PostgreSQL database setup, all tables created (run migrations)
- [ ] Backend: Auth endpoints (register, login, Google OAuth, logout)
- [ ] Backend: JWT middleware
- [ ] Backend: POST /api/v1/entries (save entry, no AI yet)
- [ ] Backend: GET /api/v1/entries (list entries, paginated)
- [ ] Backend: PATCH /api/v1/users/me/tags (onboarding tags)
- [ ] Frontend: Landing page (static, all copy final)
- [ ] Frontend: Signup screen
- [ ] Frontend: Google OAuth flow
- [ ] Frontend: Onboarding question screen
- [ ] Frontend: Journal entry screen (all states: day 1, returning user, post-save)
- [ ] Frontend: Past entries list (cards below input)
- [ ] Frontend: Bottom navigation (Journal + Trends tabs — Trends disabled until data exists)

**Week 1 demo checkpoint:** Sign up → onboarding → write an entry → see it in the list. No AI, no trends. Clean, working, no broken states.

---

## Week 2 — AI Integration (Must-Have: Mood Detection + Post-Entry Flow)

**Goal by end of week:** Saving a journal entry triggers mood detection, and the AI acknowledgment appears on screen. Threads and messages tables populated automatically.

### Tasks
- [ ] AI Service setup: provider abstraction layer, Gemini API key configured
- [ ] AI Service: analyzeMood function + prompt
- [ ] Background job: runs analyzeMood after entry save, writes results to DB
- [ ] Background job: creates thread + message #1 (AI acknowledgment) after mood detection
- [ ] Background job: retry logic for failed AI calls
- [ ] Frontend: Post-entry state — skeleton loading while AI processes
- [ ] Frontend: AI acknowledgment card appears after processing
- [ ] Frontend: "Keep talking about this" button (visible, disabled, tooltip)
- [ ] Frontend: Entry cards in list now show mood tag label (e.g., "anxious · moderate")
- [ ] Backend: GET /api/v1/entries/:id (single entry, for polling)
- [ ] Frontend: polling logic — checks entry every 2 seconds until ai_processed_at is set

**Week 2 demo checkpoint:** Write entry → save → skeleton appears → AI acknowledgment card slides in with mood tag. Full MVP loop working except trends display.

---

## Week 3 — Trends + Pattern Detection (Must-Have: Emotion Trends)

**Goal by end of week:** Emotion Trends screen is fully working — chart, pattern cards, all states (empty, partial, populated). Pattern detection running after every 5th entry.

### Tasks
- [ ] AI Service: detectPatterns function + prompt
- [ ] Background job: triggers detectPatterns after every 5th processed entry
- [ ] Backend: GET /api/v1/trends (mood data points)
- [ ] Backend: GET /api/v1/trends/patterns (active patterns)
- [ ] Frontend: Emotion Trends screen — empty state (0–2 entries)
- [ ] Frontend: Emotion Trends screen — partial state (3–4 entries)
- [ ] Frontend: Emotion Trends screen — populated state (chart + pattern cards)
- [ ] Frontend: Chart component (line chart, tappable data points, tooltips)
- [ ] Frontend: Pattern cards (description, tap to highlight chart points)
- [ ] Frontend: Time range toggle (7d / 30d / all)
- [ ] Frontend: Trends tab in bottom nav now enabled once 1+ processed entry exists
- [ ] Frontend: Individual entry detail view (read-only, opened from trends chart tap)

**Week 3 demo checkpoint:** Full MVP working end to end. Write entries over several sessions → trends chart populates → pattern cards appear → tapping a pattern highlights relevant chart points.

---

## Week 4 — Polish + Should-Have (if time allows)

**Goal by end of week:** MVP is visually polished, all empty/loading/error states handled, no broken flows. Should-Have features started only if MVP is solid.

### Polish tasks (do these first — non-negotiable)
- [ ] All loading states: skeleton screens, button spinners, no layout shifts
- [ ] All error states: API failures handled gracefully on every screen
- [ ] All empty states: no blank screens anywhere in the app
- [ ] Typography, spacing, color consistency pass across all screens
- [ ] Mobile responsiveness check on all screens
- [ ] "About the AI" page (ethical transparency — explain what AI can/cannot do)
- [ ] Verify and finalize privacy footer claim (Gemini API data-use terms — see TODO in product-spec.md)

### Should-Have (only if polish is complete)
- [ ] AI Chat continuation (POST /api/v1/entries/:id/thread/messages, Chat screen UI)
- [ ] Weekly reflection (generateReflection job, Weekly Reflection screen)
- [ ] Adaptive Dashboard screen

### Nice to Have (only if everything above is complete)
- [ ] Mood calendar (heatmap view)

---

## Folder Structure

```
/
├── client/                          # Frontend (React or Next.js)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Reusable UI primitives (Button, Card, Input)
│   │   │   ├── journal/             # Journal entry components
│   │   │   ├── trends/              # Trends chart + pattern card components
│   │   │   └── layout/              # Nav bar, page wrappers
│   │   ├── pages/ (or app/)         # One file per route/screen
│   │   ├── hooks/                   # Custom React hooks (useEntries, useTrends, useAuth)
│   │   ├── services/
│   │   │   └── api.js               # All fetch calls to backend API — one place
│   │   └── store/ (or context/)     # Auth state, user state
│   └── public/
│
├── server/                          # Backend (Node.js + Express or Fastify)
│   ├── src/
│   │   ├── routes/                  # One file per resource (auth, entries, trends, threads)
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification middleware
│   │   │   └── validate.js          # Request validation middleware
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── provider.js      # AI provider abstraction (swap Gemini here)
│   │   │   │   ├── prompts/
│   │   │   │   │   ├── analyzeMood.js
│   │   │   │   │   ├── detectPatterns.js
│   │   │   │   │   ├── generateReflection.js
│   │   │   │   │   └── chat.js
│   │   │   │   └── aiService.js     # analyzeMood, detectPatterns, generateReflection
│   │   │   └── jobs/
│   │   │       ├── moodDetection.js # Background job after entry save
│   │   │       ├── patternDetection.js # Background job after every 5th entry
│   │   │       └── weeklyReflection.js # Weekly scheduled job
│   │   ├── db/
│   │   │   ├── migrations/          # SQL migration files, numbered sequentially
│   │   │   └── queries/             # One file per table (userQueries, entryQueries, etc.)
│   │   └── utils/
│   │       ├── errors.js            # Standard error classes matching API error codes
│   │       └── jwt.js               # Token sign/verify helpers
│   └── index.js                     # Server entry point
│
├── docs/                            # This folder — all documentation
│   ├── product-spec.md
│   ├── user-flow.md
│   ├── wireframes.md
│   ├── data-model.md
│   ├── api-spec.md
│   ├── ai-architecture.md
│   └── roadmap.md
│
├── .env.example                     # Environment variable template (never commit .env)
└── README.md                        # Project overview + setup instructions
```

---

## Environment Variables

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mindapp

# Auth
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Provider (Gemini — swap this block to change providers)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# App
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000
```

---

## ⚠️ Open TODOs Before Coding Begins

1. **App name** — not finalized. Needed before implementing any UI (used in page titles, nav bar, landing page logo).
2. **Accent color + color palette** — not finalized. Needed before implementing any UI components.
3. **Frontend framework: Next.js (App Router)** — decided. Deployed on Vercel.
4. **Deployment target: Vercel (frontend) + Railway or Render (backend + PostgreSQL)** — both have free tiers suitable for a portfolio project.
5. **Privacy footer claim: resolved** — Gemini free tier uses data for model improvement. Footer copy changed to: "Your entries are private to your account and never shared with other users." This is accurate regardless of AI provider. Do not revert to the original claim unless switching to a paid/no-training API tier.
