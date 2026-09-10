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
| Motion tokens — every duration, easing, keyframe | `src/index.css` (second `@theme` block) |
| Motion helpers for the few JS-side needs | `src/motion.js` (`MOTION`, `cssMs`, `motionMs`, `usePresence`, `usePresenceList`) |
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

- **`primary`** — the brand orange, now the kit's own published ramp. The
  "Primitive Colors" sheet's Primary panel is genuinely confusing: the **hex
  captions printed under each swatch are blue** (`#e6ecfe … #001a67`, leftover
  boilerplate from another dpopstudio product), but the **swatches themselves
  are drawn orange** and match every real rendered screen. So the fills are the
  truth and the captions are the boilerplate — not the whole panel. The sheet
  draws 10 orange steps; they map onto `50/100/200/400…950` here, with a single
  interpolated `300` filling the one visible lightness gap (between `#ffbda5`
  and `#ff7c4d`). `#ff5c20` stays at `500`: that's what every screen renders a
  primary button with, and the kit's Token Colors sheet maps
  `bg-primary-normal → primary-DPOP/500`. (The Primary panel's own step labels
  put `#ff5c20` at 400 — another artifact of the stale boilerplate; the screens
  and the token sheet outvote it.)
- **`neutral`** — grays, accurate as published. The kit ships **13** steps
  (`black-1`…`black-13`: `#ffffff #fcfcfc #f5f5f5 #f0f0f0 #d9d9d9 #bfbfbf
  #8c8c8c #595959 #454545 #262626 #1f1f1f #141414 #000000`) compressed onto the
  11 slots here; the dropped ones are `black-11` (`#1f1f1f`) and `black-13`
  (`#000000`), so `neutral-950` (`#141414`) stands in for the kit's pure-black
  `text-bold`/`bg-bold` token.
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

## Shape scale (radii) — measured off the kit's rendered screens

**Nothing in the Learniv kit is a pill.** A sweep of every filled, rounded,
control-sized rectangle across all 111 exported screens (52 desktop + 59
mobile) found **zero** shapes whose corner radius reaches half their height,
apart from progress bars, toggle switches, status dots and small count
badges. Buttons, badges, fields, nav rows, selects and avatars are all
rounded *rectangles*. The app shipped with `rounded-full` buttons/badges for a
while; that was wrong and has been corrected.

| Element | Kit geometry | Tailwind |
|---|---|---|
| Buttons (all variants), badges, alerts, list rows, nav rows, icon buttons, selects, text fields, textareas | r **8** | `rounded-lg` |
| Search field, Course/Class card shell | r **12** | `rounded-xl` |
| Dashboard-style cards, modals | r **14** | `rounded-[14px]` |
| Avatars | r ≈ **0.19 × size** (32px→6, 48px→9) | `rounded`/`rounded-md`/`rounded-lg` per size |
| Segmented toggle (Light/Dark) | r **8** track, r **4** inner pill | `rounded-lg` + `rounded` |
| Progress bars, switches, status dots, count badges | fully round | `rounded-full` |

Other measured constants worth matching:

- **Hairline borders are `#d9d9d9` = `neutral-400`**, on white. That's the only
  border color the light-mode screens use for controls and cards (89 of 89
  bordered controls). There is **no black-bordered** button anywhere — the
  kit's secondary/"outline" button is white with a `neutral-400` hairline.
- **Field / gray-button fill is `#f5f5f5` = `neutral-200`** (not `neutral-100`).
- **Active nav row fill is `#f0f0f0` = `neutral-300`**.
- The kit draws **no divider hairlines** around the sidebar or topbar — the
  shell is borderless whitespace; only the active nav pill carries a fill.
- Kit control heights: text field **50**, primary button **46**, select /
  icon button **40**, social button **56**, nav row **44**. The app currently
  runs `h-11` (44) for fields and buttons — close, deliberately not chased.

## Type scale — the kit runs one notch larger than this app does

Measured both from the kit's Typography sheet and from real rendered screens
(they agree exactly). DM Sans throughout:

| Kit token | px | Where it shows up |
|---|---|---|
| Heading 1 | 64 | — (not used on any exported screen) |
| Heading 2 | 48 | Login/Signup page title, the big "50%" figure |
| Heading 3 | 32 | page H1 ("Welcome, Zaid!"), stat-card values |
| Heading 4 | 24 | card section titles ("Activity", "Progress Course") |
| Heading 5 / Text 4 | 16 | **the base size** — nav labels, field labels, button labels, body copy, table cells, chart axes |
| Text 3 | 18 | text typed into / placeholdered in an input |
| Text 5 | 12 | micro text (deltas, captions, the email under a name) |

**The app is still one notch below this**: `text-sm` (14px) is its de-facto
body size (~240 uses) and `PageHeader` renders its H1 at `text-2xl` (24px)
where the kit uses 32px. 14px appears nowhere in the kit. Closing this gap is
a real re-typesetting pass (~560 class occurrences across ~15 view files) and
reflows every screen, so it hasn't been done — **treat it as the one known
open divergence from the kit**, not as a settled decision.

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
  fill) / `light` (gray fill, no border) / `outline` (white + a `neutral-400`
  hairline, the kit's only secondary treatment) / `disabled`; props `size`
  (`md`/`sm`), `chevron` (dropdown caret), `iconOnly`. All at r8 — see the
  shape scale above; don't reintroduce `rounded-full`
- **Fields**: `TextField`, `PasswordField` (`TextField` + a built-in
  show/hide eye toggle), `SearchField` (with optional `shortcut` badge),
  `TextArea`, `TagField` (chip input), `Select`, `Field` (label wrapper) — all
  share one state system: default / focus (orange ring) / error (red)
- **People**: `Avatar` (photo or initials, sizes `xs`/`sm`/`md`/`lg`, optional
  `status` dot). Defaults to **`square`** — a rounded square at the kit's
  ~0.19x-size radius — because the kit draws every avatar that way and never
  draws a circular one; `shape="circle"` stays available but is off-kit.
- **Status & feedback**: `Badge` (solid fill, e.g. "New"), `Tag` (soft fill +
  colored left rule — the default choice for small status labels), `Alert`
  (icon + title + body, tones = the 5 color tokens), `ChatBubble`
- **Cards**: `Card` (base), `StatCard`, `CourseCard`, `ClassCard` (shares
  `CourseCard`'s tinted-band/progress/"View Detail" shell — a Class fills it
  with roster/schedule instead of a creator credit), `SessionRow`,
  `SegmentedBar` (the dashed multi-cell progress bar on course cards)
- **Controls**: `Switch`, `Checkbox`, `SegmentedToggle` (the Light/Dark
  switcher — an r8 `neutral-300` track with an r4 white inner tab, not a pill;
  options may carry an optional `icon`)
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
  Component Library"), `RailItem` (a compact, selectable row for a
  builder's object rail — the draw.io/PowerPoint "every item shown small,
  one focused in a canvas" pattern used by Block Studio's component list;
  drag-to-reorder wiring is the caller's, attached via `...rest`)
- **Misc**: `ToastHost` (the bottom-right toast stack — pure/prop-driven,
  `toasts`/`onDismiss`, wired to the store by the shell, not the factory),
  `ComingSoon` (empty-state shell), `SpeakButton` (US/UK
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

**Done:** `english-platform-prototype.jsx` (shell/nav, including `ToastHost`,
now in the factory), `Dashboard.jsx`, `Courses.jsx`, `Classes.jsx`,
`Students.jsx`, `Library.jsx`, `LevelTests.jsx`, `Insights.jsx`,
`StudentInsights.jsx`, `LiveSession.jsx`, `src/components/modals.jsx`
(`NewCourseModal`, `NewLessonModal`, `AddBlockModal`, `AssignModal`,
`AddTextModal`), `Auth.jsx` (`LoginPage`, `SignupPage`), `Settings.jsx`.
`data.jsx`'s `statusPill`/`WORD_STATUS` return factory color tokens now, not
class strings.

**Partially migrated — most of the file is still the old `ui.jsx` look:**
- `src/views/parts.jsx` — `BlockStudio`'s header/toolbar and the "Add a
  component" panel (`ComponentKindPicker`) are done. Every actual quiz,
  flashcard, matching game, drag-and-drop component and their teacher-side
  editors now use `Card`, `Button`, `Field`, `Tag`, `SpeakButton` and
  `inputCls` from `design-system.jsx` (not `ui.jsx`), and every raw
  `indigo`/`slate`/`emerald`/`rose`/`red`/`amber`/`violet`/`sky`/`teal`
  Tailwind class in the file's own markup was mapped onto the five semantic
  tokens (`indigo→primary`, `slate→neutral`, `emerald→success`,
  `rose`/`red→warning`, `amber→pending`, `violet`/`sky`/`teal→info`) — this
  is what makes every component's preview/edit view use the same orange
  brand accent and neutral borders as the rest of the app. `Pill` (still
  from `ui.jsx`) was left as-is: it takes its color entirely via
  `className` from the call site, so it carries no raw color of its own —
  only the classes passed to it needed retinting, which the sweep above
  already covers. One exception, deliberately left alone: `COMPONENT_META`
  (the ~30-entry icon/label/tone map behind the rail rows and the "Add a
  component" grid) keeps its own wider rainbow of raw Tailwind hues — with
  30 distinct component kinds to visually tell apart at a glance, 5 status
  tokens aren't enough colors, and these were never status indicators to
  begin with. Same reasoning covers the handful of other decorative,
  non-status rainbow colors still in the file (game-tile colors in
  `MemoryComponent`, team colors in `TeamQuizRace`, etc.) — left untouched.
  Not yet done: a number of `rounded-2xl`/`rounded-xl` shapes in this file
  still don't match the kit's `rounded-[14px]` card scale (see Shape scale
  above) — a smaller, separate cleanup from the color-token sweep.
  `ui.jsx`'s own `AiNote` (used here and by the not-yet-migrated
  `playground.jsx`) had its tone map retinted the same way, without
  changing its prop API — a real fix, not a new `ui.jsx` addition.
- `src/views/grammar.jsx` — the `Reader` component (translation toggle,
  word-status legend, save-word action) is done. `RoleLegend`,
  `ColorSentence`, `TenseTimeline`, `PrepositionScene`, `ConjugationWheel`,
  `ConditionalFlow`, `ComparisonLadder`, `WordWeb` are still raw slate/indigo
  + the old `Pill`.

**Not yet migrated at all — still on the old `ui.jsx` look:**
- `src/components/StudentAssignModal.jsx`
- `src/views/playground.jsx`

**Dead code, not a migration target:** `src/views/Statistics.jsx` is fully on
old primitives but isn't imported or routed anywhere — it's orphaned, not a
live page. Either delete it or wire it up before migrating it; migrating an
unused file just to tick a box isn't worth doing.

Until the partial/not-migrated files above are finished, anywhere a page
renders a lesson block, a quiz, or a grammar visual (timeline, wheel, etc.)
you'll see the old palette leak through — that's expected, not a regression.
Migrate them the same way as everything else: read the file, port it to
`design-system.jsx` components/tokens, verify visually.

Once every file above is migrated (and `Statistics.jsx` is deleted or
migrated) and nothing imports from `ui.jsx` anymore, delete `ui.jsx`.

## Motion

The kit ships **no** motion spec — 111 static frames, zero timing data — so
this is the one part of the UI that isn't a reproduction of anything. It still
has to stay in character: the kit is crisp, flat and functional, so motion is
short, small, and almost entirely `opacity` + `transform`. No springs, no
bounce, nothing playful.

**Every timing lives in exactly one place: the motion `@theme` block in
`index.css`.** Nothing else in the codebase declares a duration or an easing.

- CSS consumes them as ordinary Tailwind utilities:
  `duration-(--dur-base)`, `ease-soft-out`, `animate-panel-in`.
- The handful of places that need the same value as a **number** at runtime
  (an element must stay mounted at least as long as its exit animation; a
  `setTimeout` can't read a class) go through `src/motion.js`, which reads
  those very custom properties back. It never re-declares a value.
- Adding a motion? Add the keyframe + `--animate-*` shorthand to that block
  and consume it by name. Don't write `duration-200` or an inline
  `transition: 250ms` at a call site.

| Token | Value | For |
|---|---|---|
| `--dur-fast` | 120ms | press / hover state feedback (`PRESS`) |
| `--dur-base` | 180ms | small entrances, indicator slides, page entrance |
| `--dur-slow` | 260ms | overlays, toasts, panels (enter **and** exit) |
| `--dur-deliberate` | 600ms | progress fills, grammar-scene moves |
| `--dur-toast-life` | 2600ms | not motion — how long a toast stays readable |
| `--ease-soft-out` | `cubic-bezier(.2,0,0,1)` | anything **entering** (decelerate) |
| `--ease-soft-in` | `cubic-bezier(.4,0,1,1)` | anything **leaving** (accelerate) |
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | anything **moving in place** |

Two gotchas that already cost time here, so don't rediscover them:

- **`--dur-*` is not a Tailwind v4 theme namespace.** `--ease-*` and
  `--animate-*` are (they generate `ease-*` / `animate-*` utilities), but a
  bare `duration-base` class compiles to **nothing, silently**. Durations must
  be consumed as `duration-(--dur-base)`.
- **In and out animations need different keyframe names.** An out-animation
  built by reversing the in-animation (`… reverse`) does not restart, because
  only `animation-direction` changed — it snaps instead of playing. Hence the
  separate `panel-in`/`panel-out`, `toast-in`/`toast-out` pairs.

### Rules

- Animate `transform` and `opacity`. For auto height, `grid-template-rows:
  0fr → 1fr`. **Never** `width`/`height`/`top`/`left`/`margin` — that's a
  layout pass every frame. `ProgressBar` uses `scaleX` and `Switch` uses
  `translate-x` for exactly this reason. One deliberate exception: the app
  shell's sidebar collapse toggle (`english-platform-prototype.jsx`)
  transitions `width` directly. The rule above is about a property that
  re-fires on every hover/press/list-render — real jank. A sidebar fold is a
  single, rare, user-initiated click, exactly the case every desktop app
  with a collapsible sidebar (VS Code, Slack, Notion) already animates this
  same way; leaving it an instant snap read as broken, not restrained.
- `transition`, never `transition-all`. Bare `transition` covers the safe
  property set; `transition-all` drags layout properties in and defeats the
  compositor. (Two `transition-[left]`-style exceptions survive in
  `grammar.jsx`, where the widgets genuinely position by percentage `left` —
  scoped rather than converted, deliberately.)
- **Reduced motion is handled once, globally**, by a
  `@media (prefers-reduced-motion: reduce)` block in `index.css`. No component
  carries its own `motion-reduce:` variant, and none should. `motionMs()`
  mirrors it on the JS side by collapsing to 0; `cssMs()` deliberately does
  not, so a reduced-motion preference never shortens a toast's *reading* time.
- `will-change-transform` only on things that animate repeatedly (the tab
  underline, the segmented-toggle tab). Blanket use forces layers and costs
  memory.
- Nothing over ~300ms on a click the user initiated. No looping animation
  except a genuine live indicator (the `animate-ping` dots on the LIVE badge).
- No stagger on re-render or filter change — first mount only, if at all.

### What's wired up

`PRESS` (one constant now; `PRESS_FLAT` is an alias kept for readability),
page entrance on tab change, `Modal` + `ToastHost` enter/exit via
`usePresence`/`usePresenceList`, one sliding underline shared by `TabBar` and
`PillTabs` (`useUnderline` + `Underline`, so the measurement exists once), the
`SegmentedToggle` tab sliding between equal halves, `ProgressBar` and `Switch`
on transforms.

**Not done, still available:** first-mount list stagger, number/progress
count-up, auto-height accordions for the Library word-sets and lesson block
lists, and the View Transitions API for course card → detail (react-router 7
supports `<Link viewTransition>`). Skeleton/shimmer loaders are deliberately
**not** worth adding until `db/apiClient.js` is actually wired up — the
reducer is synchronous, so nothing loads and a skeleton would animate a wait
that doesn't exist.

**No new dependency.** All of the above is CSS + Tailwind + ~110 lines in
`src/motion.js`. Don't reach for `motion`/framer-motion: it's ~35KB gzip on a
bundle Vite already warns about, and nothing here needs it.

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
