# Lumio

> Understand your emotional patterns over time.

**Live app:** https://lumio-beta-five.vercel.app

---

## What it is

Lumio is an AI-powered journaling app that helps users understand their emotional patterns over time. Unlike a general AI assistant, every journal entry contributes to one continuous picture of the user — so the app can surface recurring people, situations, and feelings that build up slowly and are easy to miss in the moment.

It does not diagnose. It does not judge. It reflects what it observes, clearly, so the user can decide what it means.

---

## Features

- **AI-powered journaling** — write freely, the AI extracts mood data silently after each save
- **Emotion trends** — color-coded chart showing mood over time (distressed → low → okay → positive)
- **Pattern detection** — AI identifies recurring emotional patterns across entries (e.g. "You've logged anxious entries 3 times this month after mentioning your roommate")
- **Long-term memory** — every entry builds a picture unique to you, not mixed with anything else
- **Private by design** — entries are private to your account, never shared with other users

---

## Tech stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Neon)
- **AI:** Google Gemini API (provider-abstracted — swappable)
- **Auth:** JWT + bcrypt
- **Deployment:** Vercel

---

## Architecture decisions

- AI provider is abstracted behind a single service layer — swapping Gemini for another model requires changing one file
- Mood detection runs as a background job after entry save — the user gets instant feedback, AI processes asynchronously
- JWT tokens stored in both localStorage and cookies — cookies enable server-side middleware route protection
- All AI-generated content is stored after first generation — never re-calls the API just to display something already computed

---

## Local development

1. Clone the repo
2. Install dependencies: `npm install`
3. Create `.env.local` with:
   DATABASE_URL=your_neon_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
4. Run migrations: paste `lib/db/migrations/001_initial_schema.sql` into your Neon SQL editor
5. Start dev server: `npm run dev`

---

## Project structure

```
app/                  # Next.js pages + API routes
  api/v1/            # REST API endpoints
  journal/           # Journal entry screen
  trends/            # Emotion trends + pattern detection
  signup/login/      # Auth screens
  onboarding/        # First-time user setup
  about/             # AI transparency page
components/          # Shared UI components
lib/
  ai/               # AI service + provider abstraction
  db/               # Database queries + migrations
  middleware/        # Auth middleware
docs/               # Full product + technical documentation
```

---

_Built as a portfolio project for US college applications._
_Not a substitute for professional mental health support._
