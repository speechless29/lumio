# Wireframes & Screen Descriptions

Status: Phase 2 (Product Design) — In Progress
Last updated: 2026-06-30

---

## Design Language

**Visual direction:** Sharp, modern, confident — Notion/Linear energy. Not a pastel wellness app. Not clinically medical.
**App name:** Lumio
**Color palette:** Dark base (`#0F0F14`), off-white surfaces (`#F5F4F0`), single accent `#7C6EF5` (muted indigo-purple). No health-app blues, no soft greens, no clouds.
**Typography:** Precise, readable. Suggest: Inter for UI, a serif (e.g., Playfair Display or Lora) for journal entry text and AI-generated narrative copy only — creates a clear visual distinction between "app chrome" and "personal content."
**Tone:** Warm but not coddling. Precise but not cold. Never gamified (no badges, streaks, or celebration animations).

---

## Screen 1 — Landing Page

### What the user sees
A single-page marketing screen, no navigation bar. Dark background. Content centered, generous whitespace.

### Layout (top to bottom)
1. **Lumio / logo** — top left, small, understated
2. **Headline** — large display text, centered:
   *"Talk it out. Watch the same moments surface again."*
3. **Subline** — one line below headline, smaller, muted color:
   *"It remembers your roommate, your last deadline, your last bad week — and tells you when they're connected."*
4. **How it works — 3 steps** — horizontal row of 3 cards (or vertical on mobile), each card contains:
   - A minimal icon (line-art, not filled/colorful)
   - A short bold label
   - One sentence description
   - Step 1: "Talk or write" — Journal freely, or talk it through — whatever fits the moment.
   - Step 2: "It listens, quietly" — No real-time advice, no interruptions. It just remembers.
   - Step 3: "Patterns surface, in time" — After a few entries, you start seeing what keeps coming back.
5. **CTA button** — full-width on mobile, centered fixed-width on desktop:
   Label: "Start writing"
   Style: filled, accent color, rounded corners
6. **Trust line** — small text directly below button, muted:
   *"Not therapy. Not a diagnosis. Just a clearer view of your own patterns."*
7. **Footer** — minimal: Lumio, privacy statement: *"Your entries are private to your account and never shared with other users."*, link to "About the AI" page (future)

### States
- **Default:** as described above
- **No loading state** — this is a static page, nothing dynamic

### Interactions
- "Start writing" button → navigates to Signup Screen
- Hover on "Start writing" (desktop): subtle background color shift on button (no scale transform — keep it understated, not bouncy)
- No scroll animations, no parallax — clean and fast

---

## Screen 2 — Signup Screen

### What the user sees
Minimal, centered card on dark background. No marketing copy repeated here — user already read it.

### Layout
1. **Lumio** — top, small
2. **Heading** — "Create your account" — medium weight, not large display
3. **Email input field** — full width of card
4. **Password input field** — full width of card, show/hide toggle on right
5. **"Start writing" button** — same style as landing page CTA (label stays consistent)
6. **Divider** — "or" — centered, muted
7. **"Continue with Google" button** — outlined style (not filled), Google icon left-aligned
8. **Login link** — small text below: "Already have an account? Log in"

### States
- **Default:** empty fields, button enabled
- **Loading:** after submit, button shows a subtle spinner, fields disabled — no full-page loader
- **Error:** inline error below the relevant field (e.g., "This email is already registered" / "Password must be at least 8 characters") — never a modal, never a toast for form errors
- **Success:** transitions directly to Onboarding Question Screen — no "welcome" interstitial

### Interactions
- Tab key moves focus email → password → button (correct tab order)
- Enter key in password field submits form
- "Log in" link → Login Screen (not designed in detail here — standard pattern, mirrors Signup layout)

---

## Screen 3 — Onboarding Question Screen

### What the user sees
Appears once, immediately after signup. Full screen. No navigation bar visible. Cannot be skipped (no skip button) — but "Prefer not to say" is always available as a valid selection.

### Layout
1. **Progress indicator** — not a progress bar (implies multiple steps that don't exist) — instead, a single small label top-right: "Step 1 of 1"
2. **Question** — large, centered, generous top margin:
   *"Who do you find yourself in conflict with most these days?"*
3. **Instruction** — small, muted, below question:
   *"Select all that apply. This helps us notice patterns faster."*
4. **Option tiles** — 2-column grid on mobile, 3-column on desktop. Each tile:
   - Minimal line-art icon
   - Label (one word or short phrase)
   - Options: Family / Friends / Romantic partner / Roommate / Coworker or boss / School or career stress / Prefer not to say
   - Unselected state: outlined tile, muted background
   - Selected state: filled accent color border, subtle background tint, checkmark appears top-right of tile
5. **"Continue" button** — full width, bottom of screen, disabled until at least one option is selected (including "Prefer not to say")

### States
- **Default:** all tiles unselected, button disabled
- **1+ selected:** button becomes enabled, selected tiles highlighted
- **"Prefer not to say" selected:** all other tiles deselect automatically (mutually exclusive with other options)
- **Loading (after Continue tapped):** button spinner, tiles non-interactive — brief, should resolve in under 1 second (just writing tags to DB, no AI call here)
- **Success:** transitions directly to Journal Entry Screen (empty state, day 1)

### Interactions
- Tile tap: toggles selected/unselected with a 150ms fill transition
- "Prefer not to say" tap: deselects all others, selects only itself
- Tapping any other tile when "Prefer not to say" is selected: deselects "Prefer not to say," selects the tapped tile
- No back button — this screen has no previous step to return to

---

## Screen 4 — Journal Entry Screen

This screen has multiple states depending on user history. All states share the same base layout.

### Base Layout (all states)
1. **Top bar** — Lumio left, date right (e.g., "Monday, Jun 30") — no hamburger menu, no settings icon in MVP
2. **Entry input area** — large, takes up majority of screen real estate
   - Font: serif (e.g., Lora), 16px, comfortable line height
   - No toolbar (no bold, italic, bullet options — this is not a word processor, it is a journal)
   - Placeholder text (disappears on first keystroke): *"What's on your mind today?"*
   - No character limit — but no counter shown either (counters create anxiety)
3. **"Save entry" button** — fixed at bottom of screen, full width on mobile
   - Disabled state: muted, non-interactive (when input is empty)
   - Enabled state: accent color, active
4. **Past entries list** — below the input area (or below the saved entry once submitted), scrollable
   - Each past entry shown as a card: date, first 2 lines of text (truncated), mood tag label (e.g., "anxious · moderate")
   - Tapping a past entry → opens it in read-only detail view

### State A — Day 1, No Prior Entries
- Input area shows placeholder text
- Past entries list: hidden (nothing to show — do not show an empty list with "no entries yet" label, just hide the section entirely)
- Bottom nav: visible but Trends tab is visually muted/disabled with a tooltip on tap: "Write a few entries to unlock trends"

### State B — Returning User, Entry Not Yet Written Today
- Input area shows placeholder text
- Past entries list: visible, shows last 3–5 entries as cards below input
- Bottom nav: fully enabled

### State C — Returning User, Entry Already Written Today
- Input area: replaced by today's saved entry (read-only, serif text, no edit option in MVP)
- Post-entry AI acknowledgment: visible below today's entry (see Post-Entry State below)
- "Save entry" button: replaced by "Write another entry" (edge case — user wants to add a second entry today — allowed but not encouraged)
- Past entries list: visible below

### Post-Entry State (appears after save, same screen)
1. Entry text locks (background shifts very slightly — subtle visual cue that it's now read-only)
2. A brief save animation: "Save entry" button collapses to a checkmark for 800ms, then disappears
3. After 1–2 seconds (time for mood detection API call): AI acknowledgment card slides up from below the entry
   - Style: slightly inset card, different background from entry text — visually distinct but not jarring
   - Font: Inter (not serif) — signals this is the app speaking, not the user's own words
   - Content: 1–2 sentences, specific to what was written, includes mood tag
   - Example: *"That sounds like a frustrating exchange. Noted — anxious, moderate intensity."*
4. Below acknowledgment card: **"Keep talking about this"** button
   - MVP: visible but disabled — muted style, tapping shows tooltip: "Coming soon"
   - Should-Have: fully enabled, opens Chat Screen

### Loading States
- Save button tapped: button label changes to a spinner immediately — do not wait for API call to finish before showing feedback
- AI acknowledgment: a subtle pulsing placeholder (skeleton screen, not a spinner) appears where the acknowledgment card will be — resolves when API call returns (target: under 3 seconds)
- If API call fails: acknowledgment card shows: *"We couldn't analyze this entry right now. It's saved — we'll try again later."* — entry is never lost due to API failure

### Empty State (first open, no entries, no placeholder)
As described in State A — placeholder text in input is the empty state. No illustration, no "you have no entries" message.

---

## Screen 5 — Emotion Trends Screen

### What the user sees
A chart-based screen showing mood over time, with pattern labels. The core output surface of the product.

### Base Layout
1. **Top bar** — "Trends" label left, time range selector right (e.g., "7 days / 30 days / All" — toggle, not a dropdown)
2. **Main chart** — takes up top 40–50% of screen
   - Line chart (not bar chart) — mood score on Y axis (1–10), date on X axis
   - Data points are tappable
   - Line color shifts based on mood intensity (e.g., cooler color for calmer periods, warmer for higher intensity) — subtle, not garish
   - Relationship/stressor category labels float near clusters of related data points (e.g., a small "family" tag near a group of low-mood days)
3. **Pattern cards** — below chart, scrollable vertical list
   - Each card: one AI-detected pattern in plain language
   - Example: *"You've logged anxious entries 3 times this month after mentioning your roommate."*
   - Card includes: pattern label, date range it covers, a small sparkline showing the relevant data points
   - Tapping a card highlights the relevant data points on the chart above
4. **"Write today's entry" CTA** — always visible at bottom, even on Trends screen — the core loop must always be one tap away

### Empty State — 0–2 entries
- Chart area: replaced by a centered message: *"Your patterns will appear here after a few more entries."*
- Below message: entry count indicator — *"2 of 5 entries to your first insight"* (progress bar, subtle)
- Single CTA: "Write another entry"
- Pattern cards section: hidden entirely

### Empty State — 3–4 entries
- Chart visible but sparse (3–4 data points, no pattern labels yet)
- Below chart: *"Keep writing — patterns get clearer over time."*
- Pattern cards section: hidden

### Populated State (5+ entries)
- Full chart visible with labels
- Pattern cards visible (1–3 cards, not more — surface only the strongest patterns, not every observation)
- Time range toggle functional

### Interactions
- Data point tap: shows a small tooltip — date, mood score, mood tag label, one-line AI note
- Tooltip includes: "See full entry →" link
- Pattern card tap: highlights relevant data points on chart with a brief pulse animation (300ms)
- Time range toggle: chart re-renders with a smooth transition (not a hard reload)
- "Write today's entry" CTA: navigates to Journal Entry Screen

### Loading State
- Chart area: skeleton screen (animated placeholder bars) while data loads
- Pattern cards: skeleton cards (2 placeholder cards) while loading
- Target load time: under 2 seconds for up to 90 days of data

---

## Screen 6 — Weekly Reflection Screen (Should-Have)

### What the user sees
A single-screen narrative summary of the past week. Generated once per week, after at least 5 entries in the past 7 days.

### Layout
1. **Header** — "Week of [date range]" — understated, date-stamped
2. **Mood arc visual** — a simple, minimal arc or curve showing the week's high and low points — labeled (e.g., "Tuesday was your hardest day") — not a full chart, more like an illustration
3. **AI-written paragraph** — the core content of this screen
   - 3–5 sentences in plain language, connecting patterns observed this week
   - Serif font — signals this is a narrative, not a UI element
   - Tone: observational, warm, no judgment, no advice
   - Example: *"This week felt heavier toward the middle. Wednesday and Thursday both included mentions of your roommate and overlapped with what sounds like a stressful academic period. By the weekend, your entries shifted — shorter, less tense."*
4. **"Write a response to this" CTA** — ghost button, below the paragraph
   - Tapping: opens Journal Entry Screen, pre-seeded with the reflection date as context
5. **Navigation back** — "← Back" top left, returns to wherever user came from

### Empty State
- If fewer than 5 entries were written this week: screen shows *"Write at least 5 entries this week to unlock your weekly reflection."* with a count indicator
- No reflection card/banner shown in navigation until the threshold is met — don't surface a screen that can't deliver yet

---

## Screen 7 — Chat Continuation Screen (Should-Have — deferred)

### What the user sees
An immersive, full-screen conversation view. Always launched from a specific journal entry — never as a standalone tab.

### Layout
1. **Top bar** — back arrow left ("← Back to entry"), entry date right — no Lumio, no nav bar (immersive mode)
2. **Entry context card** — collapsed by default, pinned at top — shows first line of the source journal entry + "expand" chevron
   - Expanding shows the full entry, read-only
   - This ensures the AI's responses always have visible context for the user
3. **Message thread** — scrollable, standard chat bubble layout
   - AI messages: left-aligned, slightly different background
   - User messages: right-aligned, accent color background
   - First message in thread: the AI acknowledgment from post-entry state (carried over, not duplicated)
4. **Input bar** — fixed at bottom, text input + send button
   - Placeholder: *"Keep talking..."*

### States
- **Loading (AI response):** typing indicator (3-dot animation) in an AI bubble — standard, expected pattern
- **Error (API failure):** *"Couldn't send — tap to retry"* inline below the failed message, not a modal
- **Empty (first open):** never truly empty — entry context card + AI acknowledgment are always pre-loaded as message #1

---

## Screens Not Yet Designed

The following screens are acknowledged as needed but not yet fully designed. They will be added to this document in a future session:

- **Login Screen** (mirrors Signup, standard pattern — low priority to design in detail)
- **Adaptive Dashboard** (Should-Have — design after MVP screens are finalized)
- **Individual Entry Detail View** (read-only past entry — referenced in Trends flow, needs full screen description)
- **"About the AI" page** (future — ethical transparency page explaining what the AI can/cannot do)
- **Settings** (future — account management, logout; no editable relationship tags in v1)

---

## ⚠️ Open Design TODOs

- App name: **Lumio** — finalized
- Accent color: **`#7C6EF5`** (muted indigo-purple), dark base **`#0F0F14`**, off-white surfaces **`#F5F4F0`** — finalized
- Privacy footer claim resolved — copy finalized as "Your entries are private to your account and never shared with other users." (see product-spec.md for full resolution note)
- "Keep talking about this" button disabled state needs exact visual treatment decided (grayed out + tooltip vs. hidden entirely in MVP)
- Entry count threshold for "first insight" (currently written as "5 entries") needs validation — may need adjustment based on how much data mood detection actually needs to surface a meaningful pattern
