# Lumio

> An AI-powered space to understand your emotional patterns over time.

**Live app:** https://lumio-beta-five.vercel.app  
**Built by:** Nguyen Trong Tin — CS portfolio project for US university applications

---

![Lumio Journal](docs/screenshots/journal.png)

---

## The idea

Most people have a five-word emotional vocabulary: happy, sad, stressed, tired, anxious. And most AI tools treat every conversation as a fresh start — no memory, no continuity, no pattern.

Lumio is different. Every journal entry you write contributes to one continuous picture of you. After a few weeks, the app starts noticing things you can't see in the moment: that your mood tends to drop after certain conversations, that certain situations keep surfacing, that you've felt this exact way before.

It doesn't diagnose. It doesn't judge. It reflects what it observes — clearly, in plain language — and lets you decide what it means.

---

## Features

**Core loop**

- **AI journaling** — write freely, AI extracts mood score, emotion label, and relationship context silently after each save
- **Contextual AI chat** — continue any journal entry as a conversation; the AI remembers what you wrote and asks questions like a thoughtful friend, not a chatbot
- **Emotion trends** — line chart with color-coded mood scores over time, tappable dots showing entry excerpts
- **Pattern detection** — AI surfaces recurring emotional patterns across entries ("You've logged anxious entries 3 times this month after mentioning your roommate")
- **Weekly reflection** — every Sunday, the AI writes a short paragraph summarizing what shifted emotionally across your week

**Experience**

- **Proactive check-in** — if you haven't written in 24+ hours, a gentle banner appears when you open the app
- **Vietnamese language support** — AI responds in the same language you write in
- **Crisis safety** — if any entry shows signs of distress, the AI responds with warmth and crisis resources (🇻🇳 1800 599 920, 🌏 findahelpline.com)
- **About the AI page** — transparent explanation of what the AI does and doesn't do, and how data is handled

---

## Screenshots

| Journal                                  | Trends                                 | Chat                               | Reflect                                  |
| ---------------------------------------- | -------------------------------------- | ---------------------------------- | ---------------------------------------- |
| ![Journal](docs/screenshots/journal.png) | ![Trends](docs/screenshots/trends.png) | ![Chat](docs/screenshots/chat.png) | ![Reflect](docs/screenshots/reflect.png) |

---

## Tech stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Frontend   | Next.js 15 (App Router, JavaScript)           |
| Backend    | Next.js API Routes                            |
| Database   | PostgreSQL on Neon                            |
| AI         | Google Gemini 2.5 Flash (provider-abstracted) |
| Auth       | JWT (jose) + bcrypt                           |
| Deployment | Vercel                                        |

---

## Architecture decisions worth noting

**AI provider abstraction**  
All AI calls go through a single `lib/ai/provider.js` file. Swapping Gemini for any other model (OpenAI, Anthropic, a self-hosted model) requires changing exactly one file. The frontend, API routes, and database schema are all provider-agnostic.

**Async mood detection**  
Entry saves return instantly. Mood detection runs as a background job after the response is sent — the user gets immediate feedback, AI processes in parallel. If the API fails, the entry is never lost; `ai_processed_at` stays null and the job can retry.

**Thread-first chat architecture**  
The AI acknowledgment shown after every entry save is stored as message #1 in a conversation thread — not as a separate field. When the user taps "Keep talking about this", they're continuing an existing thread, not starting a new one. This means the full conversation history is always available to the AI as context.

**Dual token storage**  
JWT tokens are stored in both `localStorage` (for client-side API calls) and an HTTP cookie (for server-side middleware route protection). This enables Next.js middleware to redirect unauthenticated users before the page renders.

**Stored AI content**  
AI-generated content (acknowledgments, pattern descriptions, weekly reflections) is stored in the database after first generation. The app never re-calls the AI just to display something it already computed.

---

## Documentation

This project was built with full product and technical documentation before a single line of code was written. The `/docs` folder contains:

| File                 | Contents                                                      |
| -------------------- | ------------------------------------------------------------- |
| `product-spec.md`    | Product vision, target users, MVP scope, decision log         |
| `user-flow.md`       | All user flows, navigation structure, empty states            |
| `wireframes.md`      | Screen-by-screen UI descriptions                              |
| `data-model.md`      | PostgreSQL schema with field-level notes                      |
| `api-spec.md`        | REST API endpoints, request/response shapes, error codes      |
| `ai-architecture.md` | AI service design, prompts, provider swap guide, safety rules |
| `roadmap.md`         | Week-by-week build plan, folder structure                     |

---

## Local development

```bash
# 1. Clone and install
git clone https://github.com/speechless29/lumio.git
cd lumio
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, GEMINI_MODEL

# 3. Run database migrations
# Paste lib/db/migrations/001_initial_schema.sql into your Neon SQL editor

# 4. Start dev server
npm run dev
```

**Required environment variables:**
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_here
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash

---

## Project structure

app/
├── api/v1/ # REST API — auth, entries, trends, threads, reflections
├── journal/ # Journal screen
├── trends/ # Emotion trends + pattern detection
├── chat/[id]/ # AI chat continuation (per entry)
├── reflect/ # Weekly reflection
├── signup/login/ # Authentication
├── onboarding/ # First-time setup
└── about/ # AI transparency page
components/
└── Navbar.js # Shared navigation with logo
lib/
├── ai/
│ ├── provider.js # AI provider abstraction (swap here)
│ ├── aiService.js # analyzeMood, generateReflection
│ └── prompts/ # Prompt builders per job type
├── db/
│ ├── index.js # PostgreSQL connection pool
│ ├── migrations/ # SQL schema
│ └── queries/ # Per-table query functions
└── middleware/
└── auth.js # JWT withAuth wrapper
docs/ # Full product + technical documentation

---

## What's next

- Native mobile app (React Native) for push notification support
- Proactive pattern alerts ("You've had 3 difficult days — want to talk about it?")
- Emotional vocabulary builder — surfaces more precise emotion words as you write
- Multi-language UI (Vietnamese interface)

---

_Not a substitute for professional mental health support._  
_Crisis support: 🇻🇳 1800 599 920 (free, 24/7) · 🌏 findahelpline.com_
