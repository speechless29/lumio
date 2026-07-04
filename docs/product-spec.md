# Product Specification

Status: Phase 1 (Product Definition) — Approved
Last updated: 2026-06-30

---

## 1. Product Vision

A private, structured space for understanding emotional patterns over time — not just how a user feels today, but how they've felt across weeks and months, and what tends to trigger it.

Unlike a general AI assistant, every conversation and journal entry contributes to one continuous picture of the user, so the app can notice things the user can't easily see in the moment: recurring feelings after talking to specific people, patterns tied to certain days or situations, or shifts that build up slowly over time.

The app does not diagnose and does not judge. It reflects observed patterns back to the user, clearly, so the user can decide what they mean.

**Why not ChatGPT or a notes app?**
ChatGPT's memory is incidental — mixed in with coding questions, recipes, and everything else a person uses it for. This app is purpose-built: a clean, structured, longitudinal record of one person's emotional and relational life, with AI that reasons specifically over that record to detect recurring patterns.

---

## 2. Core Product Statement

> The app lets a user journal or talk through what happened, and over time, it shows them the recurring people and situations that keep triggering the same feelings — without judging them for it.

This single sentence is the filter every feature must pass. A feature that does not serve this loop (input → pattern detection → pattern surfaced back to the user) is a support feature at best, and should not be treated as core.

### AI Behavior Rule (from Vision)
The AI may state **observations**, never **judgments or causes**.
- Acceptable: "This is the third time this month you've felt this way after talking to your dad."
- Not acceptable: "Your dad seems to be a source of stress in your life."

This rule must be enforced in all AI prompt design (see future `ai-architecture.md`).

---

## 3. Target Users

### Primary Persona
- **Age range:** 19–22
- **Life situation:** College junior or senior, living in a dorm or shared off-campus housing with roommates, possibly working a part-time job alongside school.
- **Context:** Chaotic, busy schedule — values a *quick* daily habit over a long one. Has real autonomy and privacy (unlike a younger persona living at home).

### Secondary Persona (Deferred — Not Designed For in v1)
- **Age range:** 16–18
- **Life situation:** Living at home with parents, in high school.
- **Why deferred:** Building for minors introduces real data-protection and liability complexity (parental consent, crisis-response liability, privacy from parents) that is out of scope for this version. Flagged as a future direction only.

### Friction Sources (drives data model + AI pattern detection)

**Relationship-based** (tracked by *who* — enables the app's signature pattern-detection feature):
- Family (distant — calls, visits, expectations)
- Peers (friends, roommates, romantic partners)
- Work (coworkers, boss)

**Context-based** (tracked by *what situation* — not tied to a specific person):
- Academic/career pressure (deadlines, grades, future uncertainty, job search)

This split means the data model will likely need two distinct tag types: `relationship_source` (who) and `stressor_type` (what kind of pressure). The AI should be prompted to detect relational patterns ("recurring after talking to X") differently from situational patterns ("recurring during exam weeks").

---

## 4. MVP Scope

### Must Have
1. **Authentication** — infrastructure requirement.
2. **Journal entries** — primary input mechanism. Also serves as the MVP landing screen (write today's entry, see last few entries).
3. **Mood detection** — backend AI engine. No dedicated UI; runs after a journal entry is saved, extracts structured mood data (e.g., mood label, intensity, possible relationship/stressor tags) via Gemini.
4. **Emotion trends** — display screen that charts mood detection's output over time. This is the first surface of the core loop.

### Should Have
5. **AI Chat** — conversational input alternative to journaling; strongest interview/demo differentiator once it can reference past patterns (e.g., "I noticed you mentioned your roommate again — this is the third time this week").
6. **Adaptive Dashboard** — smart landing screen that shifts based on data volume: nudges toward journaling when data is sparse, surfaces trends/insights once there's enough history.
7. **Weekly reflection** — a short, AI-written paragraph connecting the dots across a week in plain language (e.g., "This week was harder Tuesday through Thursday, which lines up with the deadline you mentioned and a call with your mom on Wednesday."). This is a weekly-scoped expression of the same core pattern-detection engine, not a duplicate of trends or calendar.

### Nice to Have
8. **Mood calendar** — visual heatmap (colored boxes per day/week/month) of mood data. Lowest differentiation on the list — it's a re-skin of data already shown in Emotion trends, with no new insight of its own.

### Out of Scope
- None formally identified yet. To be revisited if anything emerges during Phase 2 or 3 design work.

---

## ⚠️ Open TODOs (must resolve before launch)

- ~~**Privacy footer claim accuracy**~~ — **Resolved.** Gemini free tier confirmed to use API data for model improvement by default. Original claim ("Never sold, never used to train other models") cannot be made accurately. Footer copy updated to: *"Your entries are private to your account and never shared with other users."* This is accurate regardless of AI provider. If the project later switches to a paid/no-training API tier (e.g., Vertex AI, Groq), the stronger claim can be reinstated.

## Decision Log (for context on *why*, not just *what*)

- **Primary persona chosen as 19–22 (not 16–18 or "all ages")** because: (a) it avoids minor data-protection/legal complexity, (b) the friction sources at this age are richer and more varied for pattern detection, (c) it remains close enough to the builder's own experience to write authentically.
- **AI Chat was initially cut from Must-Have, then restored to Should-Have above Mood Calendar** after recognizing it was demoted not because it mattered less, but because it felt riskier to build — while Mood Calendar felt "safe" despite being the least differentiated feature. Should Have priority reflects actual product value, not ease of build.
- **Dashboard's job was deliberately left undefined until MVP scoping**, then resolved as: MVP version = journal entry screen as landing page (free, no new build); Should Have version = adaptive dashboard that changes behavior based on data volume.
- **Weekly Reflection vs. Mood Calendar were nearly merged as duplicate features.** Resolved by defining Mood Calendar as a pure visualization (support tier) and Weekly Reflection as a narrative expression of the core pattern-detection loop (core-adjacent, Should Have).
