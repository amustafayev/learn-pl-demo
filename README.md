# Lucid — teacher console (prototype)

A clickable, stateful prototype of the **teacher side** of an Azerbaijani-first
English-learning platform. Built from the feature list in [`docs/`](./docs).
Signed in as a vetted teacher (Leyla Q.); no backend — all state is in-memory.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run lint     # oxlint
```

## What's in it

Five sections in the sidebar:

- **Dashboard** — teaching cockpit: AI pre-lesson briefs, at-risk / churn flags,
  the north-star metric (words moved to *known* per learner·week), quick actions.
- **Courses** — courses → ordered lesson **pathway** → **lesson builder**.
  Add / remove / reorder / rename parts, preview the visual-grammar block, assign
  a lesson. New courses and lessons are created live.
- **Library**
  - *Reading* — texts by topic & level; open one to **tap any word** for its
    Azerbaijani translation + definition + example, save it (keeps its sentence),
    export the list. Words are coloured on the page by status (new / learning / known).
    Includes the **"learn from your own text"** differentiator.
  - *Word sets* — category sets with **flashcards**, **drag-and-drop match**, and
    an **auto-test** with instant, encouraging feedback in Azerbaijani; plus a
    commonly-confused-words section.
- **Students** — roster → rich per-student detail:
  - *Overview* — AI pre-lesson brief, 2–3 concrete focus actions, skill breakdown,
    grammar-mastery radar, streak / XP / daily goal, weekly word flow, CEFR
    trajectory, and **L1-interference** (Azerbaijani → English) tracking.
  - *Words* — saved words with spaced-repetition status you can cycle; weak-word resurfacing.
  - *Activity* — activity timeline + the behavioural signals logged for knowledge tracing.
  - *Lesson notes* — capture a live lesson, generate an Azerbaijani student summary,
    review & save; new words drop into the learner's vocab list.
  - *Learning path* — progress map with checkpoints.
- **Statistics** — class analytics: confusion radar, north-star trend, "who
  struggles with what" heatmap, at-risk flags, effort-vs-outcome insight.

Design principles honoured from the doc: *one colour = one grammar role* (fixed
everywhere), *visual grammar as the signature* (tense timeline + colour-coded
sentence), *encourage-don't-punish* feedback, and *speaking stays human-graded*.

## Structure

```
src/
  english-platform-prototype.jsx  # shell: nav, routing, providers
  store.jsx                       # in-memory reducer + navigation context
  data.jsx                        # seed data + design tokens
  ui.jsx                          # shared primitives (Card, Modal, Btn, AiNote…)
  components/modals.jsx           # assign / new course / new lesson / add text / add part
  views/
    Dashboard.jsx  Courses.jsx  Library.jsx  Students.jsx  Statistics.jsx
    grammar.jsx                   # visual-grammar blocks + tap-to-read Reader
```

Stack: React 19, Vite, Tailwind v4, lucide-react, recharts.
