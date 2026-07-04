# User Flow

Status: Phase 2 (Product Design) — In Progress
Last updated: 2026-06-30

---

## Overview

This document maps every user flow in the application — the step-by-step path a user walks from one state to the next. Flows are ordered by user journey chronology, not by feature priority.

Each flow is written so that an AI coding assistant or developer can implement screens and transitions without guessing what happens next.

---

## Flow 1 — First-Time User: Landing to First Journal Entry

This is the most important flow in the product. It must feel effortless, warm, and fast — a new user should be writing their first entry within 60 seconds of landing on the page.

```
Landing Page
    ↓ clicks "Start writing"
Signup Screen
    ↓ submits email + password OR continues with Google
Onboarding Question Screen (appears once, never again)
    ↓ selects relationship tags + submits
Journal Entry Screen (empty state — day 1, no prior entries)
    ↓ writes entry + clicks "Save entry"
[Background: mood detection API call fires silently]
    ↓ entry locks (read-only)
Post-Entry State (AI acknowledgment appears beneath entry)
    ↓ user reads acknowledgment, optionally taps "Keep talking about this" (disabled in MVP)
    ↓ user navigates away or stays
```

### Key decisions baked into this flow
- No welcome tour, no multi-step onboarding — user writes first, learns through use
- Onboarding question is one screen, one question, multi-select — not a survey
- Mood detection is automatic on save — no separate "get feedback" button
- AI acknowledgment is a single response, not a conversation (MVP) — full chat continuation is Should-Have
- "Keep talking about this" button is visible in MVP but not wired up until Chat is built

---

## Flow 2 — First-Time User: After First Entry (Empty States)

After saving their first entry, a first-time user has no pattern data yet. This flow defines what they see if they navigate to other screens before enough data exists.

```
Post-Entry State (after first save)
    ↓ navigates to Emotion Trends
Emotion Trends — Empty State (0–2 entries)
    [Shows: "Your patterns will appear here after a few more entries."
     Shows: entry count indicator — e.g., "2 of 5 entries to your first insight"
     Shows: a single CTA — "Write another entry"]
    ↓ clicks "Write another entry"
Journal Entry Screen (returning user — prior entry visible)
```

### Key decisions baked into this flow
- Empty state is never a blank screen — always shows progress toward first insight
- Entry count indicator (e.g., "2 of 5") sets honest expectations without overpromising
- Single CTA in empty state — do not offer multiple navigation options when there's nothing to show yet

---

## Flow 3 — Returning User: Standard Session (Data Exists)

A returning user who has enough entries for mood detection to have produced meaningful data. This is the core daily loop the product depends on for retention.

```
App open (authenticated)
    ↓
Journal Entry Screen (returning user state — prior entries visible below input)
    ↓ writes today's entry + clicks "Save entry"
[Background: mood detection API call fires silently]
    ↓ entry locks
Post-Entry State (AI acknowledgment — references prior patterns if they exist)
    e.g., "This sounds similar to how you felt after talking to your roommate last week."
    ↓ user reads, optionally taps "Keep talking about this" (Should-Have)
    ↓ navigates to Emotion Trends
Emotion Trends — Populated State (chart visible, patterns labeled)
```

### Key decisions baked into this flow
- The post-entry acknowledgment gets smarter over time — it can reference prior entries once pattern data exists, not just reflect back the current entry
- This is the moment the product's core differentiator becomes real for the user — the AI is referencing their history, not just reacting to today
- Emotion Trends is the natural next destination after saving — navigation should make this one tap away

---

## Flow 4 — Returning User: Chat Continuation (Should-Have — deferred)

This flow does not exist in MVP. It is documented here so that when Chat is built, it extends the existing data structure rather than being bolted on separately.

```
Post-Entry State
    ↓ taps "Keep talking about this" (now wired up)
Chat Screen — pre-loaded with:
    - the journal entry as context (shown at top, read-only, collapsible)
    - the AI's acknowledgment as the first message in the thread
    - an open input field at the bottom
    ↓ user types a follow-up message
    ↓ AI responds, referencing both the entry and any prior pattern data
    ↓ conversation continues until user navigates away
    [Thread is saved, linked to the original journal entry]
```

### Key decisions baked into this flow
- Chat is never a standalone tab with a blank slate — it always has the entry as context
- The AI acknowledgment from post-entry state is stored as message #1 in the thread (not a separate data type) — this is the architectural decision that makes upgrading from MVP to Should-Have a data extension, not a rewrite
- Chat thread is permanently linked to its source journal entry — a user can always return to the entry and see the conversation that followed

---

## Flow 5 — Emotion Trends: Populated State

```
Emotion Trends Screen (enough data exists)
    ↓ user sees chart of mood over time, labeled by relationship/stressor category
    ↓ user taps a data point on the chart
Detail View — single entry's mood tag + a one-line AI observation for that day
    ↓ user taps "See full entry"
Journal Entry Screen — that specific past entry, read-only
    ↓ user navigates back
Emotion Trends Screen
```

---

## Flow 6 — Weekly Reflection (Should-Have)

```
[Triggered: once per week, after at least 5 entries exist in the past 7 days]
Notification or in-app banner: "Your weekly reflection is ready"
    ↓ user taps
Weekly Reflection Screen
    Shows: short AI-written paragraph connecting the week's patterns in plain language
    Shows: the week's mood arc (simple visual — high/low points labeled)
    ↓ user reads
    ↓ optional: "Write a response to this" → opens Journal Entry Screen pre-seeded with the reflection date
    ↓ user navigates away
```

---

## Flow 7 — Adaptive Dashboard (Should-Have)

The dashboard's behavior changes based on how much data the user has. It is not a static screen.

```
State A — New user (0–4 entries):
    Landing screen = Journal Entry Screen directly
    [No separate dashboard — journal IS the home screen in MVP]

State B — Early user (5–14 entries):
    Dashboard shows: last entry + a nudge to write today if not yet written
    Dashboard shows: entry streak or count toward "first insight"
    Dashboard shows: Emotion Trends card (small, entry count visible)

State C — Established user (15+ entries):
    Dashboard shows: most recent AI-detected pattern (one sentence)
    Dashboard shows: mood chart preview (last 7 days)
    Dashboard shows: "Write today's entry" CTA (always present)
    Dashboard shows: Weekly Reflection card if one is ready
```

---

## Navigation Structure

### MVP Navigation (Must-Have screens only)
Bottom navigation bar with 2 items:
- **Journal** (home — journal entry screen, list of past entries below)
- **Trends** (emotion trends screen)

No dashboard tab in MVP — Journal IS the home screen.

### Should-Have Navigation (added when Should-Have features ship)
Bottom navigation bar expands to 3–4 items:
- **Home** (adaptive dashboard)
- **Journal** (entry screen + history)
- **Trends** (emotion trends + patterns)
- **Reflect** (weekly reflection — only visible once first reflection is generated)

### Navigation rules
- Active tab is always visually indicated (filled icon, accent color)
- Bottom nav is always visible except on two screens: the Onboarding question screen (appears once, no nav) and the full Chat continuation screen (immersive — nav hidden, back arrow at top left instead)
- Deep-linking: tapping a past entry from Trends or Dashboard always opens that entry in read-only mode, with a clear "← Back" to return to where they came from

---

## Empty States (all screens)

| Screen | Condition | What user sees |
|---|---|---|
| Journal Entry | Day 1, no entries | Prompt text: "What's on your mind today?" — large, centered, warm |
| Emotion Trends | 0–2 entries | "Your patterns will appear here after a few more entries." + entry count indicator + "Write another entry" CTA |
| Emotion Trends | 3–4 entries | Partial chart visible (not enough for pattern labels yet) + "Keep writing — patterns get clearer over time" |
| Weekly Reflection | Not enough entries this week | "Write at least 5 entries this week to unlock your weekly reflection." |
| Chat (Should-Have) | No prior conversation on this entry | Pre-loaded with entry context + AI acknowledgment as first message — never truly "empty" |

---

## Decision Log

- **No multi-step onboarding tour:** Tours get skipped and value isn't explainable until the product is used. User writes first; product teaches through use.
- **Single save button, no separate "get AI feedback" button:** Using the app implies consent to AI analysis — re-asking per entry treats the core feature as opt-in, which undermines the product's value proposition.
- **"Keep talking about this" deferred to Should-Have:** Multi-turn chat with persistent context is meaningfully harder to build than a single AI acknowledgment call. Given a one-month solo timeline, shipping the simpler version first reduces risk without losing the feature permanently — the data model is designed from day one to support the upgrade.
- **AI acknowledgment stored as thread message #1:** This is the architectural decision that makes Chat a natural extension of MVP rather than a rebuild. The acknowledgment and the future conversation live in the same data structure from day one.
- **Journal IS the home screen in MVP:** No separate dashboard tab until Should-Have adaptive dashboard is built. Avoids building a screen that has nothing useful to show until enough data exists.
- **Chat has no standalone tab — it's always entry-contextual:** A general chat tab disconnected from journal entries would recreate exactly the "mixed with everything else" problem that differentiates this product from ChatGPT. Chat only exists as a continuation of a specific entry.
