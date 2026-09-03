# Design system guide

This app's UI is a **faithful reproduction of the Learniv UI KIT** (dpopstudio,
sold on UI8), not an original design. When building or changing any UI in this
repo, match what's already in the factory — don't invent new colors, spacing,
or component shapes from scratch. If a screen needs something the factory
doesn't have yet, check whether Learniv has that component before designing
your own version of it.

## Where things live

| What | File |
|---|---|
| Color tokens, font | `src/index.css` (`@theme` block) |
| Component factory (Button, Card, Tag, Modal, …) | `src/design-system.jsx` |
| Old/legacy primitives — **being phased out, do not add to it** | `src/ui.jsx` |
| Icons | `@tabler/icons-react` — the exact icon set the kit itself credits (tablers.io) |
| Font | **DM Sans**, loaded via Google Fonts `@import` in `index.css`, wired to Tailwind's `font-sans` |
| Routing (real URLs, `react-router-dom`) | `src/router.jsx` (`Bridge`, `buildPath`, `mergeRoute`, `TAB_PATH`) + `<Routes>` tree in `src/english-platform-prototype.jsx` |
| Mock "database" (persistence rules — the only layer to replace for a real backend) | `src/db/mockDb.jsx` (`reducer`, `createInitialState`) |
| Seed fixtures + static UI config (labels, templates, icons) | `src/data.jsx` |
| React binding over the mock db (Context/Provider, `useStore()`/`useNav()`) | `src/store.jsx` — no persistence logic of its own |

## Routing

The app uses real `react-router-dom` URLs (`BrowserRouter`) — every page has
its own address, deep-links work, and the browser back button retraces
in-app navigation. Two layers:

1. **Cross-page navigation** — the shared `useNav()` hook (`route`/`go()`
   from `src/store.jsx`) that most already-migrated views call. Under the
   hood, each top-level `<Route>` is wrapped in `<Bridge tab="...">`
   (`src/router.jsx`), which reconstructs the old `{tab, courseId, classId,
   lessonId, partId, studentId, filter}` route shape from the real URL
   params/query, and turns `go(patch)` calls into `navigate(buildPath(...))`.
   This is what lets a view call `go({ courseId, lessonId })` without caring
   whether "state" lives in memory or in the URL — it always lives in the URL.
   `buildPath` itself is just a dispatcher over one **named path-builder
   function per destination** (`coursesPath`, `courseDetailPath`,
   `lessonPath`, `partPath`, `classesPath`, `classDetailPath`, `studentsPath`,
   `studentDetailPath` — all exported from `router.jsx`), the same shape as a
   real Xsolla project's `usePaths()`: one source of truth per URL a view
   might actually need a real href for (not just a `go()` call), instead of
   a path string-templated wherever it's needed. Add a new top-level page by
   adding a `<Route>` in `Content()` (`english-platform-prototype.jsx`), a
   case in `TAB_PATH`, and — if it takes params — a named path builder plus
   a case in `buildPath` that calls it.
2. **Page-internal sub-navigation** — a page that owns its own nested
   tabs/drill-downs (e.g. `Library`'s reading/word-sets/playground tabs and
   its reader/word-set drill-down, or `StudentDetail`'s overview/words/...
   tab strip) manages that with `react-router-dom` hooks (`useNavigate`,
   `useParams`) **directly**, via its own nested `<Routes>` or `:param`,
   rather than going through `useNav()`. That state is private to the page,
   not a cross-page resource address — keep it decoupled. See
   `src/views/Library.jsx` and `StudentDetail` in `src/views/Students.jsx`
   for the pattern.

Rule of thumb: does another page ever need to navigate straight to this
state (e.g. a course id, a student id)? Use `useNav()`/`go()`. Is it purely
"which tab of this page am I on"? Use the page's own router hooks.

## Data layer

No backend — but the mock persistence is deliberately isolated behind one
seam so a real one can be dropped in later without touching any view:

- **`src/db/mockDb.jsx`** — the mock "database". Owns `reducer` (every
  state-mutation rule, one `case` per action type) and `createInitialState()`
  (deep-copies the seed data into the live in-memory shape). This is the
  **only** file that should change to plug in a real backend — e.g. turn
  `reducer`'s cases into API calls and have `StoreProvider` fetch/await
  instead of `useReducer`. It also owns the handful of pure selector/derive
  functions that describe how the mock data relates to itself (`lessonBlocks`,
  `activeClassCourse`, `classesOnCourse`, `courseAvgProgress`,
  `groupBankByParent`, `kitContents`, …) — a real backend would either
  replicate this logic or return it pre-joined, so it lives next to the state
  shape it describes, not in the React layer. `classesOnCourse`/
  `courseAvgProgress` encode a load-bearing rule: **a course has no progress
  of its own** — it's authored content (lessons/blocks/components) until a
  class is actually assigned to it (see `SEED_CLASSES`' `courses` array).
  Progress, "locked", "current lesson", and completion % all live per
  class-course pairing, never on the course or lesson record directly. A
  plain `/courses/:id` view (no `?classId=`) must never render a progress
  number/badge for the course itself — only "which classes are taking this,
  and how far is each one" (`Courses.jsx`'s `CourseView`, no-`classCourse`
  branch), or nothing at all if no class has been assigned yet.
- **`src/db/apiClient.js`** — not called by anything yet (the reducer is
  fully synchronous), but the seam a real backend plugs into: `createApiClient(baseURL)`
  wraps `fetch` and normalizes every failure into a typed `ApiError`
  (`{code, description}`), so a reducer case that starts awaiting a real
  request fails the same way every other one does, and callers can toast
  `err.description` directly instead of branching on raw `Response`/`TypeError`
  shapes. The returned client also carries `setAuthToken`/`clearAuthToken`,
  so logging in sets the token once and every subsequent call carries it,
  rather than threading it through every function signature. Modeled on a
  real Xsolla project's axios client factory (one client instance, one
  normalized error contract, `setHTTPToken`/`clearHTTPToken`) — swapped to
  `fetch` since there's no axios dependency to justify yet.
- **`src/data.jsx`** — static seed fixtures (`SEED_COURSES`, `SEED_STUDENTS`,
  …, what a real backend's database would already contain) plus static UI
  config that isn't per-teacher data at all (`BLOCK_TYPES`, `LESSON_TEMPLATES`,
  icon/label maps, `DAY_LABELS`). Only `db/mockDb.jsx` treats it as a data
  source; views only ever pull config constants from it directly.
- **`src/store.jsx`** — the React binding, nothing else. Wires `db/mockDb.jsx`'s
  reducer into a `Context`, exposes `useStore()` (`{state, dispatch, toast}`)
  and `useNav()`, and re-exports the db layer's selector functions so every
  view's existing `import { lessonBlocks, ... } from "./store.jsx"` keeps
  working untouched. It also keeps a few dispatch-wrapper helpers
  (`saveBlockToBank`, `buildRecapLesson`, …) that bundle a `dispatch` call
  with its matching toast message — convenience for callers, not persistence
  rules, so they stay here rather than in the db layer.

Views never import `src/db/mockDb.jsx` directly — always go through
`useStore()`/`useNav()` from `store.jsx`. That's what keeps the swap
one-file: nothing in `src/views/` or `src/components/` knows or cares that
the "backend" is a `useReducer` today.

## Color tokens

Five semantic scales, each `50`–`900`/`950`, defined as CSS custom properties in
`index.css` and available as normal Tailwind utilities (`bg-primary-500`,
`text-neutral-600`, `border-warning-200`, …):

- **`primary`** — the brand orange. Anchored on `#FF5C20`, pixel-sampled directly
  off the kit's real rendered buttons — **not** the blue shown in the kit's own
  "Primitive Colors" reference sheet, which was confirmed (by direct pixel
  comparison) to be generic boilerplate reused across the studio's other
  products, not retargeted for this kit. If you ever need to re-verify a color
  against the source kit, sample real rendered screens, not that reference page.
- **`neutral`** — grays. Verified accurate against real screens (muted body text
  landed exactly on the kit's published `Neutral-DPOP/black-7`).
- **`success`** (green), **`warning`** (red), **`pending`** (amber), **`info`**
  (blue) — taken as published in the kit's own sheets, used for semantic status
  only (never as decoration): success = completed/done, warning = error/danger/
  live-recording, pending = in-progress/waiting, info = neutral informational.

**Rule:** never write a raw Tailwind color (`indigo-600`, `slate-400`,
`rose-500`, `emerald-50`, …) in new or edited code. Always use one of the five
tokens above. If you're not sure which token fits, match it to the closest
Learniv usage, not to what "feels right" from a generic palette.

**Rule:** never build a Tailwind class name with string interpolation, e.g.
`` `bg-${tone}-50` ``. Tailwind's JIT scanner only generates classes that appear
as complete literal strings somewhere in the source — an interpolated class is
invisible to it and silently renders unstyled. This exact bug shipped once
during the Students/Insights migration and was caught by browser
verification, not the build. Always use a literal lookup object instead:

```jsx
// wrong — invisible to Tailwind's scanner
<span className={`bg-${tone}-50 text-${tone}-600`} />

// right — every class Tailwind needs to see is written out literally
const CHIP = {
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
};
<span className={CHIP[tone]} />
```

## The component factory (`src/design-system.jsx`)

Every export is a faithful port of one variant sheet from the Learniv kit.
Build real pages by composing these — don't style raw `<div>`/`<button>` for
anything one of these already covers.

**Rule: always use the existing ready-made component. Never create a new
one when one already covers the case.** Before writing any card/button/badge/
etc. markup by hand, check the inventory below first — if something close
enough already exists, use it (extend its props if it's missing a small
option) instead of writing a parallel one-off version next to it.

This isn't hypothetical: `CourseCard` was built correctly early on, but the
Courses grid page was later written with its own hand-rolled inline card
instead of calling it — so the page drifted from the kit (wrong "Mentor"
field, wrong button roundness, a fabricated star rating) even though the
correct component already existed one file away. The fix was to delete the
inline version and call the real `CourseCard`. Don't reintroduce that
mistake: if you're about to write a `<div className="rounded-2xl border...">`
that looks like a card, stop and check whether `Card`/`CourseCard`/`StatCard`/
`SessionRow` already does it.

If a screen truly needs something the factory doesn't have at all, add it
*to the factory* (sourced from the kit's own component/variable sheets, not
invented) and export it from there — so the next page that needs the same
thing reuses it too, instead of every page growing its own copy.

- **Layout**: `Page`, `PageHeader` (kicker/title/sub/right), `Breadcrumbs`,
  `SectionLabel`, `ProgressBar`
- **Buttons**: `Button` — variants `primary` (orange fill) / `dark` (black
  fill) / `light` (gray fill) / `outline` (white, black border) / `disabled`;
  props `size` (`md`/`sm`), `chevron` (dropdown caret), `iconOnly`
- **Fields**: `TextField`, `PasswordField` (`TextField` + a built-in
  show/hide eye toggle), `SearchField` (with optional `shortcut` badge),
  `TextArea`, `TagField` (chip input), `Select`, `Field` (label wrapper) — all
  share one state system: default / focus (orange ring) / error (red)
- **People**: `Avatar` (photo or initials, `circle`/`square`, sizes
  `xs`/`sm`/`md`/`lg`, optional `status` dot)
- **Status & feedback**: `Badge` (solid fill, e.g. "New"), `Tag` (soft fill +
  colored left rule — the default choice for small status labels), `Alert`
  (icon + title + body, tones = the 5 color tokens), `ChatBubble`
- **Cards**: `Card` (base), `StatCard`, `CourseCard`, `ClassCard` (shares
  `CourseCard`'s tinted-band/progress/"View Detail" shell — a Class fills it
  with roster/schedule instead of a creator credit), `SessionRow`,
  `SegmentedBar` (the dashed multi-cell progress bar on course cards)
- **Controls**: `Switch`, `Checkbox`, `SegmentedToggle` (pill-shaped 2-option
  switcher, e.g. Light/Dark — options may carry an optional `icon`)
- **Navigation**: `NavItem`, `NavSectionLabel`, `TabBar` (underline tabs),
  `PillTabs` (filter pills with a count badge)
- **Overlays**: `Modal`, `StudentCheckList` (the shared "pick some students"
  list — renders a purely visual checkbox indicator, not the interactive
  `Checkbox` button, since the whole row is already the click target and a
  `<button>` can't contain another `<button>`), `CategoryPicker` (a big
  catalog of icon+label options grouped into named sections, each with an
  optional used-count badge — "Add a block", "pick a component"),
  `LibraryPickList` (the denser, single-column "insert a saved item, grouped
  by where it was saved from" list — "From My Blocks", "Insert from My
  Component Library")
- **Misc**: `ComingSoon` (empty-state shell), `SpeakButton` (US/UK
  pronunciation via browser TTS), `SocialButton` (icon+label pill for
  "log in / sign up with X" rows), `ImagePlaceholder` (checkerboard "no
  image sourced yet" box — Auth's side panel, Settings' avatar — used
  instead of inventing stock art that isn't part of the kit)

When a real Learniv page needs a pattern not listed above, add it to
`design-system.jsx` first (sourced from the kit's own component/variable
sheets if at all possible), then consume it from the page — don't build a
one-off.

## Migration status

The app is being moved off the old `src/ui.jsx` primitives onto the factory
above, one file at a time, verified live in a browser after each one (build →
lint → click through it with zero console errors).

**Done:** `english-platform-prototype.jsx` (shell/nav), `Dashboard.jsx`,
`Courses.jsx`, `Classes.jsx`, `Students.jsx`, `Library.jsx`, `LevelTests.jsx`,
`Insights.jsx`, `StudentInsights.jsx`, `LiveSession.jsx`,
`src/components/modals.jsx` (`NewCourseModal`, `NewLessonModal`,
`AddBlockModal`, `AssignModal`, `AddTextModal`), `Auth.jsx` (`LoginPage`,
`SignupPage`), `Settings.jsx`. `data.jsx`'s `statusPill`/`WORD_STATUS`
return factory color tokens now, not class strings.

**Not yet migrated — still on the old `ui.jsx` look:**
- `src/components/StudentAssignModal.jsx`
- `src/views/parts.jsx` — every block/component editor and student-facing
  renderer (quizzes, flashcards, matching games, etc.)
- `src/views/grammar.jsx` — the `Reader` component (the AZ-translation toggle
  and word-status highlight colors are still the old indigo/slate), plus two
  remaining raw `Pill` usages
- `src/views/playground.jsx`

Until these are migrated, anywhere a page renders a lesson block, a quiz, or
the reading-passage toggle, you'll see the old palette leak through — that's
expected, not a regression. Migrate them the same way as everything else: read
the file, port it to `design-system.jsx` components/tokens, verify visually.

Once every file above is migrated and nothing imports from `ui.jsx` anymore,
delete `ui.jsx`.

## Verification checklist for any UI change

1. `npx vite build` — must pass clean.
2. `npx oxlint <changed files>` — exit 0 (pre-existing "Fast refresh" warnings
   on files that export a helper alongside a component are fine to ignore).
3. Start the dev server, screenshot the changed screen(s) in a real browser,
   check for zero `pageerror`/console errors — don't rely on the build passing
   alone; the dynamic-class-interpolation bug above passed the build fine and
   only showed up visually.
4. Clean up: kill the dev server, remove any temp scripts, confirm
   `git status --short` shows no stray `package.json`/`package-lock.json` diff
   if you only installed a temporary tool (e.g. `playwright-core` for
   screenshotting) — uninstall it after.
