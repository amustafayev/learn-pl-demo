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
| Dark theme values (the same tokens, redefined) | `src/index.css` (`:root[data-theme="dark"]` block) |
| Light/dark switch (state, persistence, OS fallback) | `src/theme.js` (`useTheme`) + the pre-paint script in `index.html` |
| Motion tokens — every duration, easing, keyframe | `src/index.css` (second `@theme` block) |
| Motion helpers for the few JS-side needs | `src/motion.js` (`MOTION`, `cssMs`, `motionMs`, `usePresence`, `usePresenceList`) |
| Component factory (Button, Card, Tag, Modal, …) | `src/design-system.jsx` |
| Old/legacy primitives — **being phased out, do not add to it** | `src/ui.jsx` |
| Icons | `@tabler/icons-react` — the exact icon set the kit itself credits (tablers.io) |
| Font | **DM Sans**, loaded via Google Fonts `@import` in `index.css`, wired to Tailwind's `font-sans` |
| Routing (real URLs, `react-router-dom`) | `src/router.jsx` (`Bridge`, `buildPath`, `mergeRoute`, `TAB_PATH`) + `<Routes>` tree in `src/english-platform-prototype.jsx` |
| **Features** — the screens' only way to data, one folder per feature (see **Features** below) | `src/features/<name>/` — import only its `index.js` |
| Mock "database" (persistence rules — the only layer to replace for a real backend) | `src/db/mockDb.jsx` (`reducer`, `createInitialState`) |
| Uploaded media (Listening audio) — mock file storage | `src/db/mediaStore.js` (IndexedDB; reached via `store.jsx`'s `saveMedia` / `useMediaSrc`) |
| Seed fixtures + static UI config (labels, templates, icons) | `src/data.jsx` |
| Authored lesson content (blocks → components for Everyday English + IT L4) | `src/seedLessons.js` (pulled into `SEED_LESSONS` by `data.jsx`); local files it embeds live in `public/seed/` |
| React binding over the mock db (Context/Provider, `useStore()`/`useNav()`) | `src/store.jsx` — no persistence logic of its own |
| Keeping the teacher and student apps' tabs in step (the mock server's push) | `src/db/mockSync.js`, wired in `StoreProvider` |
| **The student app** — its own package, served at `/student/` | `student/` (see its `README.md`); shares `src/` through the `@app` alias |

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

## Features

The mock db is throwaway: it is deleted when the real backend lands, so
don't spend effort on its internals. What stays is how screens reach data,
and that goes through **features**, one folder per feature:

```
src/features/<name>/
  client.js   the contract (what the feature can do), with two versions:
              createMock…Client (on the mock db, used today) and
              createHttp…Client (the docs/openapi.yaml calls, on db/apiClient.js)
  hooks.js    what screens call; picks the client and re-asks when data changes
  index.js    the feature's public API — the only file outside the folder may import
  client.test.js   see **Tests**
```

A mock client runs on `useMockSource(pick)` (`src/db/useMockSource.js`):
`getState()` is the signed-in user's slice of the mock db, `dispatch` writes
it, and `waitFor(test)` lets a write return what it created (the real API
just returns it). `pick` names the slices whose change makes the hooks ask
again. Mock clients may also call the mock db's own selectors
(`db/mockDb.jsx`); both go when the mock does.

- **Screens never touch the mock** for a converted feature: no `useStore()`
  state, no reducer actions, no mock selectors. They call the feature's
  hooks. A screen that shows toasts but reads no data uses `useToast()`.
- **Features never import each other.** A screen that needs two features
  calls both features' hooks. A feature may import shared code (`store.jsx`
  for the mock wiring, `db/apiClient.js`, `richText.js`, …).
- Both rules are enforced by `.oxlintrc.json` (`no-restricted-imports`
  overrides): `npm run lint` fails on a screen importing a feature's inner
  file or a feature importing another feature.
- **Contracts follow `docs/openapi.yaml`**, so the HTTP client passes
  responses straight through. Where the mock's shape differs, the mock
  client translates (notes: the mock's `sharedAt` is the API's `sentAt`).
- **Hooks are async-ready** (`loading`, promises from every action), so the
  real backend needs no screen changes. They load through `src/useLoad.js`
  (keeps the old data while refreshing, so nothing remounts; `refresh()`
  after a write). A screen that seeds something once from the data (an
  editor, a starter component) waits for `loading` to clear first. Backend
  day for a feature: build its HTTP client in `hooks.js` instead of the mock
  one (with `{ audience: "student" }` in the student app where the client
  takes one), and drive its refresh from the server's push (`GET /events`).
  `nullIfMissing` (`db/apiClient.js`) turns a 404/403 into "none".
- **Schools/organizations later:** the active school will travel with the
  login token in `apiClient` and the backend scopes by it; features and
  screens don't change.

Converted so far:
- **account** — who's signed in (`useMe`: both top bars, the login
  greeting, "Designed by", Settings → Profile and Security) and the student
  app's sign-in page (`useSignIn`). The student app remounts everything
  below its sign-in gate when the session changes, so no screen outlives
  the student it was showing.
- **sales** — a course sold on its own: confirming or declining a purchase
  (`useSalesActions`, in the request rows and a course's Customers), and
  for the student app the catalog (`useCatalog`: each course with its
  teacher and the student's own purchase), `useMyPurchases` and "Request
  to buy". Who bought what shows in the students roster.
- **students** — the teacher's side of who they teach: the roster by
  relationship (`useRoster`, `rosterStudents`), one student and their
  history (`useStudent`), a class's members (`useClassMembers`) and invites
  (`useInvitations`), requests, adding/removing and blocking
  (`useStudentActions`), and names for group work and homework stats in
  either app (`useStudentNames`). References follow the spec: a request's
  or history item's class is `class: { id, name }` (the mock's `cls` is
  translated). Buying a course is sales'; the student app's joining and
  invites still read the mock. The per-student analytics tabs (seed data)
  move with analytics.
- **classes** — a class's schedule, link settings, course and progress,
  shared lessons, lessons taught and attendance (`useClasses`, `useClass`,
  `useClassActions` for components handed a class that only act on it,
  `useAttendance`). Every class comes with each course's `progress`
  (`progressFor(cls, courseId)`, `activeCourseOf`, `courseAvgProgress`).
  Who is in a class is the students feature's (not moved yet). The
  student app's class pages still read the mock.
- **courses** — courses, lessons and their blocks: the Courses list, a
  course's tree and sale settings, a lesson's steps, Block Studio, and the
  course/lesson names other screens show (`useCourses`, `useCourse`,
  `useLesson`). A lesson always comes with `blocks` (an unbuilt one gets
  them from its block types, ids stable), so nothing writes on open any
  more. `useLesson().updateBlock` shows an edit at once and lets the loaded
  lesson take over once it shows it — typing into an editor never jumps.
  The student app's lesson player still reads the mock (moves with the
  student's learning).
- **notes** — the teacher's notes panel, the student app's notes
  everywhere, and Google Docs.
- **readings** — reading texts and their folders: Library → Reading, Add
  text, every lesson passage (`useReadingTexts` gives summaries without the
  body, for lists and pickers; `useReadingText(id)` gives one with it).
- **wordSets** — Library → Word sets, the word games, picking a set to
  assign, a student's assigned set. Every word has an `id` (the mock's is
  its place in the set).
- **savedComponents** — Library → Saved, saving from Block Studio and the
  course tree (`save` copies the H5P content first), inserting a saved one.

Toasts aren't a feature but the app's UI: `src/toasts.jsx` (`ToastProvider`
around each app, `useToast()`), per tab, never stored or synced.

Class homework already follows the same pattern from before
(`src/homework.jsx` + `src/db/homeworkClient.js`) and moves into
`src/features/` when it's next touched. Everything else still reads the mock
through `useStore()` and is converted feature by feature: assigned work, the student's own learning,
media, the seed-only analytics pages.

## Tests

```
npm test            unit tests (Vitest) — a couple of seconds, no browser
npm run test:watch  the same, re-running on save
npm run test:e2e    browser tests (Playwright) — drive both apps on the dev server
npm run check       lint + unit tests + build + browser tests: run before committing
```

Two layers, each with one job:

- **Unit tests** — `*.test.js` beside the code they test
  (`src/features/notes/client.test.js`, `src/schedule.test.js`, …). Node
  with a browser-like DOM (jsdom); no browser, no server.
  - A feature's `client.test.js` has two halves:
    - **mock client — the rules.** What the API must do: who receives a
      sent note, what deleting a folder takes with it, which words a set
      hands out. Run against the real seed and reducer through
      `src/test/mockDb.js` (`mockDb()` is the teacher; `.as("s_rashad")` a
      student, on the same db). They describe the backend's contract too:
      when the mock is deleted, port them to the backend's tests.
    - **HTTP client — the requests.** Method, path and body of every call,
      and how errors read, through `src/test/recordingApi.js`. Each path
      must match `docs/openapi.yaml`. These stay when the mock goes.
  - Shared helpers that outlive the mock have their own: `libraryTree`,
    `schedule`, `format`, `richText` (the notes sanitizer — a security
    boundary, keep its tests strict).
- **Browser tests** — `e2e/<feature>.spec.js`, one file per feature, each
  test named for what a person does and sees. `e2e/fixtures.js` gives
  `page` (a teacher tab), `studentPage` (a second tab in the same browser,
  so both apps sync live), `signInAsStudent(page, name)` and `sidebar(page,
  label)`. A test fails on any page or console error. Every test starts
  from the seed in a fresh browser. `page.goto()` reloads the tab, which
  restarts its mock db from the seed: navigate by clicking to keep what the
  test did.

Writing them:
- Name the seed a file relies on in a comment at its top.
- Assert what a person sees — text, roles, labels — never CSS classes.
- No sleeps: Playwright's `expect` waits. Scope text to `page.locator("main")`
  when a toast could show the same words.
- Never assert a relative date ("4 weeks ago") — it changes as days pass.
- A new test must be able to fail: break the code it covers once and watch
  it go red.

**Moving a feature behind its door** (see **Features**):
1. Write `e2e/<feature>.spec.js` for what people do with it today, and get
   it green on the current code — it's the regression net.
2. Build `src/features/<name>/` (`client.js`, `hooks.js`, `index.js`) with
   its `client.test.js`.
3. Move the screens onto the hooks, then `npm run check`.

Playwright is pinned (`@playwright/test` 1.63.0) because each version
drives its own Chromium build; after upgrading it, run
`npx playwright install chromium`.

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
  `activeClassCourse`, `classesOnCourse`, `courseAvgProgress`, …) — a
  real backend would either
  replicate this logic or return it pre-joined, so it lives next to the state
  shape it describes, not in the React layer. `classesOnCourse`/
  `courseAvgProgress` encode a load-bearing rule: **a course has no progress
  of its own** — it's authored content (lessons/blocks/components) until a
  class is actually assigned to it (see `SEED_CLASSES`' `courses` array).
  Progress, "next up" and "lessons taught" all live per class-course
  pairing, never on the course or lesson record directly. A
  plain `/courses/:id` view (no `?classId=`) must never render a progress
  number/badge for the course itself, and doesn't list the classes taking it
  either (that card was removed on request) — class progress is only shown
  when the course is opened through a class.
- **Class progress (teacher side, lesson-level only)** — answers "where did
  this class leave off?"; nothing is tracked inside a lesson, and there is
  no per-lesson percentage. The model, shaped like the backend tables it
  stands in for:
  - **A class meets on days with their own times:** `class.schedule` is
    `[{ day (Mon = 0), start "HH:MM", durationMin }]` — each day can start at
    a different time and run a different length (`src/schedule.js` has every
    helper: `scheduleLabel`, `nextSession`, `inAutoShareWindow`). Set in the
    new-class form and "Edit schedule" on the class page
    (`UPDATE_CLASS_SCHEDULE`), through `ScheduleEditor`. Times are local to
    the viewer.
  - **The next lesson opens by itself:** from 5 minutes before a session
    until it ends, the class's next-up lesson is added to
    `releasedLessonIds` (`AUTO_RELEASE_LESSONS`, the server's job — here run
    by `StoreProvider` every 30 s and on load). Hiding a lesson
    (`SET_LESSON_RELEASED` false) also adds it to `heldLessonIds`, so the
    automatic opening never undoes the teacher; sharing it lifts the hold.
    The lesson bar says when it will open.
  - **A class takes one course for now:** `ASSIGN_CLASS_COURSE` does
    nothing once `class.courses` has an entry, and the class page only
    offers **Assign course** while it has none. The array and its
    statuses stay, so lifting the limit later is a rule change, not a
    migration.
  - `class.courses[]` (`class_courses`): `{ courseId, status, currentLessonId }`
    — `status` is `"in-progress" | "paused" | "done"`, at most **one**
    in-progress per class (making one active pauses the other);
    `currentLessonId` is the lesson the class is on next ("next up").
  - `state.taughtLessons[]` (`taught_lessons`, append-only):
    `{ id, classId, courseId, lessonId, taughtAt }` — ISO timestamps only;
    "5 days ago" is formatting (`src/format.js`).
  - Who's in a class lives in `memberships`, never on the student or the
    class (see **Students, classes & access** below). The roster and a
    student's course are derived (`classMembers`, `studentCourseId`).
  - `classCourseProgress(state, cls, courseId)` is the one read model:
    `{ next, last: { lesson, taughtAt }, taughtAt: {lessonId→iso},
    taughtCount, total, pct, allTaught }` — what
    `GET /classes/:id/courses/:courseId` would return.
  - Writes, one action per endpoint (full list above the class cases in
    `mockDb.jsx`): `ASSIGN_CLASS_COURSE`, `SET_CLASS_COURSE_STATUS`,
    `SET_CLASS_CURRENT_LESSON` and `MARK_LESSON_TAUGHT`, which logs the
    lesson and moves "next up" past it (never backwards). The client sends
    facts (`lessonId`, `taughtAt`); the rule of what comes next lives in
    the reducer, as it would on the server.
  - A lesson or block opened from a class carries `?classId=` in its URL
    (`lessonPath`/`partPath`), and `ClassLessonBar` shows that class's
    position on it. There is no live-lesson mode (teachers teach over
    Meet): the last block of a lesson opened from a class ends with a
    **Finish lesson** card, and the bar has the same button, both
    sending `MARK_LESSON_TAUGHT`. Nothing marks a lesson taught on its
    own, so opening one to prepare it doesn't count.
  - Student-level progress (`student.progress`/`step`) is still seed data
    and doesn't follow the class — deliberately out of scope until the
    student view exists. What a student *had* (lessons taught to them,
    missed, finished on their own) is real, though: see **Lesson history**
    under Students, classes & access.
- **`docs/openapi.yaml`** — the backend contract (OpenAPI 3.0.3), written
  from this reducer: every action is one operation, and the rules each one
  enforces are in its description. Keep it in step when an action or a
  record shape changes.
- **`src/db/h5pClient.js`** — the one real backend today: the H5P server in
  `server/`, built on `createApiClient("/h5p")` (below). It also owns the
  rule that a lesson component's H5P content follows that component:
  `withOwnH5PCopies` gives every independent copy (duplicate, save to a
  library, reuse from one) its own server-side content, and
  `deleteH5PContentIn` deletes it when the component, block or bank item
  holding it is removed. Views reach it through `store.jsx`
  (`h5pClient`, `copyWithOwnH5P`, `discardH5PContent`).
- **`src/db/apiClient.js`** — only the H5P client uses it so far (the
  reducer is fully synchronous), but it's the seam a real backend plugs into: `createApiClient(baseURL)`
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
- **`src/seedLessons.js`** — fully authored lesson content, so Block Studio
  and the course tree show realistic, varied blocks instead of every block
  falling back to its type's identical 1–2 starter components. Everyday
  English is authored end to end and IT English L4 (the ITler — Morning
  class's current lesson) too; between them they use every component kind
  but `h5pActivity` (needs the H5P server) and every kind's variants.
  Everyday English L5 is deliberately long — 12 steps, a ~450-word passage,
  components with many items — for seeing how layouts hold up. Authored
  blocks are titled exactly like unbuilt ones (the plain block-type name,
  no subtitle; `data.jsx`'s `authored`). Block ids are stable
  (`<lesson>-<n>`, matching what `lessonBlocks` gives an unbuilt block) so
  block URLs survive reloads. The Resources block embeds
  local files from `public/seed/` (a map SVG, a small PDF, an HTML slide
  page) rather than third-party URLs, and its Listening components play
  real recordings from `public/seed/audio/`, each followed by a linked
  question set (multiple choice / true-false / matching). The IT standup
  keeps its transcript but hides it from students (`showTranscript: false`).
- **`src/db/mediaStore.js`** — the mock file storage for audio a teacher
  uploads to a Listening component: IndexedDB (`lucid.media`), not
  `localStorage`, since an MP3 alone can blow `localStorage`'s ~5MB and
  break the component bank's saving. A component only ever holds the
  returned id (`audioFileId`, plus `audioName`); `audioUrl` is the
  alternative for a pasted link or a seed file. Views reach it through
  `store.jsx`: `saveMedia(file)` and `useMediaSrc(fileId, url)` →
  `{ src, missing }` (an object URL, released on unmount). Swap these two
  for an upload endpoint returning a URL and nothing above changes.
  Replacing a file doesn't delete the old blob, on purpose — a duplicated
  or library-saved copy may still point at it.
- **Listening transcripts are optional** — shown to students only when
  there's text *and* `showTranscript !== false` (older components predate
  the switch and keep showing theirs). A comprehension set's `passageRefId`
  can point at a Listening as well as a Passage; linked to a Listening it's
  labelled "Listening comprehension" everywhere (`componentLabel` /
  `linkedSource` in `parts.jsx`).
- **Lesson notes persistence** — the lesson notes (the whole `lessonNotes`
  table, sent or not) are kept in `localStorage` under
  `lucid.lesson-notes` (`savedLessonNotes` / `persistLessonNotes` in
  `db/mockDb.jsx`, written from `StoreProvider` by the teacher app only),
  so what a teacher writes survives a reload and the student app reads the
  same copy. The seed notes appear only the first time. This pair is what
  a real backend replaces: `SAVE_LESSON_NOTES` becomes a `PUT`, and the
  initial load a `GET` (see the endpoint list in `mockDb.jsx`).
- **Library trees** (`src/components/LibraryTree.jsx`, `src/libraryTree.js`):
  word sets and reading texts are folders nested to any depth, like a file
  system. `state.wordSets` is a flat list of nodes `{ id, parentId, title,
  level, words[] }` — a word set holds its own words and can hold word sets
  inside it (IELTS → Linkers → Contrast → the words); assigning one sends
  its words and everything below it (`subtreeWords`). Reading texts sit in
  `state.textFolders` (`{ id, parentId, name }`) via `text.folderId`; a
  folder shows the texts in it and below it. Both Library tabs are a tree
  on the left and the open folder on the right, with the open folder kept in
  the URL (`?set=` / `?folder=`). Deleting a folder deletes what's inside
  (the view asks first). Actions: `ADD_/RENAME_/DELETE_TEXT_FOLDER`,
  `ADD_WORDSET`, `UPDATE_WORDSET`, `DELETE_WORDSET`, `ADD_WORD`,
  `UPDATE_WORD`, `DELETE_WORD`. Reading cards carry no icon.
- **Saved** (the Library tab, and "Add a component → Saved" in a lesson) is
  the saved-component library, one `BankBrowser`
  (`src/components/SavedComponents.jsx`) in both places: categorized cards,
  search and filters. The bookmark on a component turns into a filled one
  once saved, until the component is edited.
- **Documents** can be uploaded (PDF, Word, image) into the mock file
  storage (`fileId`, `fileName`, like Listening audio) or linked by URL. An
  uploaded Word file offers a download — Office's viewer can't open a file
  that isn't at a public address.
- **Component bank persistence** — the saved-component library is the other
  piece of state kept in `localStorage` (`persistComponentBank` /
  `savedComponentBank` in `db/mockDb.jsx`). A seed item added to
  `SEED_COMPONENT_BANK` later reaches an already-saved library exactly
  once (tracked by `lucid.component-bank.offered-seeds`), so a new seed
  shows up but one a teacher deleted doesn't come back.
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

## Students, classes & access

How students relate to teachers, what a teacher may see, and what a student
may open. The teacher side is built; the student app is next and must follow
the same rules. The code is `src/db/mockDb.jsx` (model, rules, and the
endpoint list above its class cases) plus the seeds in `src/data.jsx`.

### Two products, one teacher-owned course

| | **Class** (teacher-led) | **Course purchase** (self-paced) |
|---|---|---|
| Owner | the teacher who created the class and course (`teacherId`) | the teacher who created the course |
| How a student gets in | class **link/code** → the student **requests** → the teacher **accepts**; or an **email invite** from the teacher → accepting admits directly; or the teacher adds one of their own students with the class's **+** | finds the course in the public catalog → **buys** it. No teacher step once paid |
| What the student can open | only lessons the teacher has **released** to that class (`releasedLessonIds`); marking a lesson taught releases it | **every** lesson of the course |
| Progress | per class: next up and lessons taught (see Class progress above) | per student (student app, later) |

Payments aren't in the app yet. A buyer taps "Request to buy", pays the
teacher directly (the course's `sale.paymentNote` explains how), and the
teacher confirms it: **Mark paid & give access**. In-app checkout later
only changes how a purchase becomes `paid`, nothing else.

### What a teacher can see: the visibility rule

A teacher sees a student **only through a relationship**: a class
membership (any status) in one of their classes, or a purchase of one of
their courses. There is no platform-wide student list or search. To add
someone new, the teacher shares a class link or code, or types an exact
email.

- `teacherView(db)` enforces this. `StoreProvider` passes views **only**
  the logged-in teacher's slice, the same thing a real API returns:
  their courses and lessons, their classes, the memberships, purchases,
  invites and blocks attached to those, and the students behind them.
  **Views never see the unscoped db.** Don't bypass it; any new "list of
  students" must start from the scoped `state`.
- Relationship groups come from `teacherRoster(state)`: `active`,
  `requests` (class joins plus purchase requests), `former` (removed or
  left), `customers` (paid purchases) and `blocked`. For "my students",
  meaning rosters, assigning, the dashboard and insights, use
  `activeStudents(state)`, never `state.students`, which also holds
  requesters, former students and customers.
- **Former students** stay visible as read-only history: the class, the
  dates, and the teacher's own notes. The teacher can add them back.
  Nothing new about the student reaches the teacher after the end date.
- **Blocking** a student declines their pending requests and hides any
  future ones. It never removes something they bought.

### Records (shaped like the backend tables they stand for)

```
courses       { id, teacherId, …, sale: { forSale, price, currency, description, paymentNote } }
classes       { id, teacherId, name, schedule: [{ day, start, durationMin }], joinToken, joinOpen,
                courses: [{ courseId, status, currentLessonId, releasedLessonIds[], heldLessonIds[] }] }
memberships   { id, classId, studentId, status: requested | active | declined | removed | left,
                source: code | invite | teacher, requestedAt, decidedAt, endedAt, message?,
                periods: [{ startedAt, endedAt, endReason: removed | left | null }] }
purchases     { id, courseId, studentId, status: requested | paid | declined | refunded,
                amount, currency, method: external | in_app, requestedAt, paidAt, confirmedBy, message? }
invitations   { id, classId, email, name?, status: pending | accepted | revoked, createdAt, expiresAt }
blocks        { teacherId, studentId, createdAt }
taughtLessons { id, classId, courseId, lessonId, taughtAt }
lessonNotes   { id, courseId, lessonId, html, text, docUrl?, docManaged, sentTo: [{ classId, at }], createdAt, updatedAt }  (one per lesson)
attendance    { taughtLessonId, studentId, status: present | absent, markedAt }
lessonCompletions { id, studentId, courseId, lessonId, completedAt }
assignments   { id, teacherId, studentId, kind: block | task | wordSet | reading, title,
                blockType?, componentKind?, source: { bankItemId?, from?, wordSetId?, textId? },
                content?, assignedAt, status: assigned | done | withdrawn, completedAt?, withdrawnAt? }
```

- A student record holds only the student's own data (name, email,
  level, goal). **Membership is never stored on the student.** Everything
  relational lives in these tables, so one student can be in several
  classes, including other teachers', and keep their history.
- One membership row per (class, student). Re-adding someone reactivates
  that row (`upsertMembership`) rather than creating a duplicate, and a
  former member asking to rejoin by link reuses it too. `periods` holds
  every stint (a backend's `class_member_periods`): reactivating opens a
  new period and removing closes the open one, so an earlier stint keeps
  its dates. **Never overwrite a period.** `decidedAt`/`endedAt` are the
  latest stint's, for display. Read periods with `membershipPeriods(m)`,
  which also covers a row written before periods existed.
- Times are ISO strings stamped by the reducer, standing in for the
  server. Format them only at display time (`src/format.js`).

### The access rule (the student app enforces this, like the server)

> A student can open lesson L of course C **if they bought C** (a `paid`
> purchase), **or** they're an **active** member of a class taking C
> **and L has been released** to that class.

It's written once, as `canOpenLesson(db, studentId, courseId, lessonId)`.
Every student-side screen that shows or opens a lesson must go through it:
the catalog, "My classes", "My courses" and the lesson player. Consequences:
- Removed from a class: the class's lessons are gone, but a purchase stays.
- A student can be in a class and also own the course: both kinds of
  access, with separate progress.
- A course taken off sale stops new purchases, but **existing buyers keep
  access**. A refund ends access.
- **Lesson notes** a teacher has sent to a class (`sentTo`) reach that
  class's **active** members, and only them: leaving or being removed from
  the class takes the notes away with its lessons. Unsent notes never leave
  the teacher. Written once as `notesSentToStudent(db, studentId)`.

### Lesson history: what counts as a student's lesson

`studentHistory(state, studentId)` is the one read model, what
`GET /students/:studentId/history` returns: `classes` (each stint, what the
class is on now, the lessons they had in it), `purchases` (with lessons
finished), `lessons`, a `timeline` that adds joined, left and bought
milestones, and `totals`.
- **A class lesson is theirs** if it was taught (`taughtLessons`) while
  they were in the class, inside one of their `periods`. That excludes
  lessons from before they joined, between stints, and after they left.
  Nothing new about a former student reaches the teacher.
- **Attendance marks the exceptions.** Someone in the class at the time
  counts as having had the lesson unless an `attendance` row says
  `absent`. `SET_ATTENDANCE` only accepts a student who was in the class
  at that moment, one row per (taught lesson, student). "Lessons taken"
  never counts a missed one.
- **Self-paced lessons** are `lessonCompletions`, written by the student
  app (`COMPLETE_LESSON`, only for a lesson `canOpenLesson` allows, once
  each). `teacherView` passes them to the teacher only for a course the
  student bought from them (paid or refunded). A class member's own work
  in the app isn't shown to the teacher yet.

### Actions (one per endpoint; the full list is in `mockDb.jsx`)

- **Teacher:**
  - `REGENERATE_JOIN_TOKEN` (the old link stops working) and
    `SET_CLASS_JOINING` (the link on or off).
  - `CREATE_INVITATION` / `REVOKE_INVITATION`.
  - `DECIDE_MEMBERSHIP` (`active` | `declined`), `ADD_CLASS_MEMBER`,
    `REMOVE_CLASS_MEMBER`, `BLOCK_STUDENT` / `UNBLOCK_STUDENT`.
  - `SAVE_LESSON_NOTES` (a lesson's rich-text notes), `SET_LESSON_NOTES_DOC`
    (its Google Doc link) and `SEND_LESSON_NOTES` (send to one class, or take
    back; only a class taking the course).
  - `SET_LESSON_RELEASED`, `UPDATE_COURSE_SALE`, `DECIDE_PURCHASE`
    (`paid` | `declined`).
  - `SET_ATTENDANCE { taughtLessonId, studentId, status }` (`present` |
    `absent`).
  - `ASSIGN_WORK { studentIds, item }` (one row per student) and
    `WITHDRAW_ASSIGNMENT` (open work only; the row stays as history).
- **Student**, dispatched by the student app (`student/`):
  - `REGISTER_STUDENT { name, email }` (sign up). One account per email;
    no teacher sees it until the student joins a class or buys a course.
  - `REQUEST_TO_JOIN { token, studentId, message }`. Rejected silently for
    a closed class or a blocked student; a class link never admits
    directly.
  - `ACCEPT_INVITATION { invitationId, studentId }`. Admits directly;
    expired or withdrawn invites do nothing.
  - `REQUEST_PURCHASE { courseId, studentId, message }`. Only for a course
    that's for sale; a paid or pending purchase already existing is a
    no-op.
  - `COMPLETE_LESSON { studentId, courseId, lessonId }`. Only a lesson they
    can open; finishing it again is a no-op.
  - `COMPLETE_ASSIGNMENT { assignmentId, studentId }`. Only their own open
    work.

### Assigned work

Work a teacher hands to one student outside the class's lessons: a saved
block, a one-off task built in the Assign dialog, a word set or a reading.
Each is an `assignments` row, one per student, even when several were
picked at once.
- **Who can get it:** students in one of the teacher's classes right now.
  `ASSIGN_WORK` drops anyone else: former students, course-only
  customers, and other teachers' students.
- **A block or task is a snapshot.** `content` is copied per student at
  assign time, H5P included (`assignWork` in `store.jsx` makes the H5P
  copies first, like saving to the Component Library). Editing or deleting the saved
  original later never changes what the student was given. A block's
  content is `{ components }`; a task's is one component. A word set or
  reading only points at the library item (`source`).
- **Status:** `assigned`, then `done` (the student app) or `withdrawn`
  (the teacher, open work only). Rows are never deleted, so the history
  can say "taken back".
- Every assign surface goes through `assignWork(dispatch, toast,
  studentIds, item, toWhom)`: the student page's dialog
  (`StudentAssignModal`, also opened from the Dashboard) and the
  Library's Assign button (`AssignModal`, several students at once). Show
  an assignment with `assignmentLook(a)`, which gives its icon, tone and
  type label.

### Class homework (Classwork)

Modeled on Google Classroom's Classwork, for the whole class (assigning to
individual students is not part of it yet). An **assignment** is one post:
title, instructions, attachments (lesson blocks / components, or a library
word set), an optional due date and time, and a topic — the lesson, or "No
topic". It is a **draft**, **scheduled** for later, or **assigned**. State
lives in `homework`; posting gives every active class member one
`assignments` row per attachment, tagged `homeworkId` (= `batchId`), so the
student app is unchanged. Per student the teacher sees **Turned in** (every
attachment row done), **Assigned**, or **Missing** (not done after the due
date) — see `homeworkStats`.
- **Pages, all decoupled from Classes/Courses:** `views/Homework.jsx` —
  Classwork list by topic (`/classes/:classId/homework`);
  `views/HomeworkEdit.jsx` — the composer (`…/homework/new?lessonId=`,
  `…/:homeworkId/edit`): Save draft / Schedule / Assign; a posted one edits
  only title, instructions and due date; `views/HomeworkDetail.jsx` —
  Student work and Instructions tabs, Edit, Delete (`…/:homeworkId`). Path
  builders `classHomework*Path` in `router.jsx`. Classes.jsx has just a
  "Classwork" link; Courses.jsx has the lesson row's "Assign" link.
- **Attachments** (composer, not a dialog): Upload file (PDF / Word / image →
  a `document` task, file kept via `saveMedia`), YouTube video (a `youtube`
  task), From the lesson (a whole block or one component), Word set, and Any
  component (the kind picker; the new one opens its editor inline —
  `ComponentEditor` from parts.jsx). Files, videos and components are `task`
  attachments, so the student app plays them like any assigned task.
  `components/HomeworkAttachment.jsx` (`describeAttachment`) words each one —
  what it is, where from, and a block's components — for the composer and the
  assignment page. Already-attached picker rows say "✓ Attached".
- **One door:** the pages use only `src/homework.jsx`
  (`useClassHomework`, `useHomeworkPost`, `useHomeworkActions`).
- **The mock backend:** `db/homeworkClient.js` holds the contract
  (`list` / `get` / `saveDraft` / `publish` / `update` / `remove`), the mock
  client over the reducer (`SAVE_HOMEWORK`, `PUBLISH_HOMEWORK`,
  `UPDATE_HOMEWORK`, `DELETE_HOMEWORK`, `RELEASE_SCHEDULED_HOMEWORK`) and an
  HTTP client for `/classes/{classId}/homework…` (docs/openapi.yaml). To go
  live, build the HTTP one in `homework.jsx`'s `useHomeworkClient`. The mock
  has no server clock, so pages nudge `RELEASE_SCHEDULED_HOMEWORK` on open and
  every 30 seconds; a real server posts scheduled assignments itself.
- Delete takes back rows still `assigned` and leaves `done` ones as history;
  a due-date change reaches open rows; H5P content is copied per attachment at
  post time (`useHomeworkActions().publish`).

### Where it shows up (teacher side)

- **Class page:** one **Class members** panel in the right rail.
  - Tabs **Students / Requests**, both always shown with counts. Requests
    (Accept, Decline, Block) has an empty state, so it never disappears.
  - The header holds **Invite** and **+**. The **+** only offers the
    teacher's own students.
  - **Invite** opens a dialog with the link and code, copy, New link,
    Joining on/off, and email invites with Withdraw.
  - Don't stack invite UI under the roster again: it got pushed off-screen
    as the class grew.
- **Sidebar:** the Students item shows the number of waiting requests
  (class and purchase) from any page.
- **Course page through a class:** a **Shared / Share** toggle per lesson.
  `ClassLessonBar` shows "Students can see it" with Share or Hide, and a

- **Lesson notes** (`src/components/LessonNotes.jsx`) belong to the
  **lesson**, not to a class: one document per lesson, the same whichever
  class it's taught to, written while teaching. They're only in the lesson
  itself (Block Studio), not on the class page, the course tree or the
  lesson overview, and only when the lesson was opened from a class
  (**teaching mode**: the lesson is locked to the student's view — no
  As student / Edit switch, no Add Step, rename, move or delete on the
  overview; opened from the Courses tab it's the author's view, with those
  and no notes):
  - writing: the **Notes** button in Block Studio's toolbar (it stays open as the teacher moves between blocks — the notes belong to the lesson) opens a docked
    side panel (`LessonNotesPanel`) beside the lesson, not over it
    (`body[data-notes-open]` in `index.css` makes room). It holds a small
    Google-Docs-style editor (bold, italic, underline, heading, lists, text
    colour, highlight, clear), autosaved a moment after typing stops
    (`SAVE_LESSON_NOTES`). The note is rich text (`html`, plus its plain
    `text`), always cleaned by `src/richText.js` on write and rendered with
    the `.note-body` class;
  - **sending:** when the lesson was opened from a class (`?classId=`), the
    panel has one **Send to [class]** button (and Unsend,
    `SEND_LESSON_NOTES`): the whole document and its Google Doc link reach
    that class's active students, who see edits live. `sentTo` records which
    classes have it. Opened without a class, the notes are the teacher's
    own. Students get one row per (note, class) from `notesSentToStudent`,
    which the student app reads through `useMyNotes()` (`src/features/notes/`);
  - a **Google Doc** per lesson (`docUrl`, `SET_LESSON_NOTES_DOC`; https
    `docs.google.com` / `drive.google.com` only). With a Google OAuth
    client ID in `VITE_GOOGLE_CLIENT_ID` (`.env.example`), one click signs
    the teacher in (Google's browser sign-in popup, no backend of ours),
    creates the doc in their Drive (scope `drive.file`: only files the app
    created) and opens it in the panel in an iframe, with an Expand button
    for room. All of it lives in `src/features/notes/googleDocs.js`, on `apiClient.js`;
    the token is in memory only. A doc the app created is `docManaged`:
    sending the notes to a class sets it to "anyone with the link can read",
    and taking it back from the last class removes that. Without a client
    ID the panel falls back to pasting a link ("Start a new Google Doc"
    opens `docs.new`), and a pasted doc's sharing is the teacher's to set in
    Google. Students see "Read the document here" (the read-only `/preview`
    in an iframe) and "Open in Google Docs". While a doc is linked it is
    where the teacher writes; the in-app editor comes back if it's unlinked.
- **Plain course page:** a sales card with For sale or "Put on sale" and
  **Sale settings** (price, currency, description, how to pay), plus
  **Customers** (requests to confirm, then buyers).
- **Students page:**
  - **Active / Requests / Former / Customers** tabs (`?filter=`), with no
    made-up metrics;
  - a student's **Profile** tab: counts (classes now, lessons taken,
    missed, work to do); classes with every stint, what the class is on
    now and the lessons they had in it (add, remove); **Assigned work**
    (To do / Done, Withdraw, and Assign, which opens the Assign dialog);
    the last 5 lessons; courses bought with how far they are; contact
    details and block;
  - **Lesson history** (`/students/:id/history`): everything by month,
    lessons plus joined, left, bought, assigned and finished milestones.
    It has a filter (a class, a bought course, missed only, assigned
    work) and **Mark missed / Mark attended** on class lessons. A lesson
    opens through its class (`?classId=`);
  - then **Lesson notes**.
  - The old per-student analytics tabs (Overview, Words, Activity, AI
    Insights, Learning path) are seed data. They're parked behind
    `SHOW_STUDENT_ANALYTICS` in `Students.jsx`; don't show them until the
    student app produces real data.

### The student app (`student/`)

Its own package, served at `/student/` on the same site. `vite.config.js`
builds it as a second page (`student/index.html`), a dev-server fallback
sends `/student/...` deep links to it, and `vercel.json` rewrites them.
It has no design or data of its own:

- **Same design, reused, not copied.** `@app/…` is `src/`: the tokens and
  dark theme (`index.css`), the factory (`design-system.jsx`), the teacher
  app's Auth sheet (`AuthShell`) for sign-in, `ClassCard` / `CourseCard`
  for classes and courses, and `BlockStudentView` (`views/parts.jsx`), the
  same renderer as Block Studio's "As student", inside the same
  `HeaderCard` + `StepNav` + gray-well layout. New student-only UI lives
  in `student/src/`. If a piece is useful to both apps, it goes into the
  factory.
- **Same data layer.** `StoreProvider` takes a `scope`: `teacherView` by
  default, and `studentView(db, studentId)` in the student app (with
  `signedOutView` before sign-in, which offers the demo accounts). A
  student sees their own record, their memberships and those classes (a
  class they asked to join, were invited to, or left shows its name only),
  their purchases, invites to their email, the courses they can reach
  (their classes', the ones they bought, the public catalog) with those
  lessons, and only the notes sent to them. Never another student.
- **Rules stay in the data layer.** Opening a lesson goes through
  `canOpenLesson`, and sent notes through `notesSentToStudent`. The student
  actions are `REGISTER_STUDENT` (sign up), `REQUEST_TO_JOIN`,
  `ACCEPT_INVITATION`, `REQUEST_PURCHASE`, `COMPLETE_LESSON` and
  `COMPLETE_ASSIGNMENT`.
- **Screens:**
  - **Sign in / sign up**, where a class link opened while signed out asks
    you to sign in first.
  - **Home:** invites to accept, requests waiting on the teacher, my
    classes, the latest notes, and my courses.
  - **Class:** each course with its lessons (open, or "Not shared yet") and
    the class's notes.
  - **Lesson:** the teacher's notes for it on top, then the steps. The last
    step is **Finish lesson**.
  - **Notes:** every note, newest first, grouped by when it was sent, with
    a class filter.
  - **Courses:** bought courses, plus the catalog with **Request to buy**
    (showing the teacher's payment note).
  - **Join a class:** the link `/join/<uuid>` (no typed code): it first previews the class (teacher, schedule, course and lesson titles), then Request to join.
  - **My work:** open and done assignments. A block or task plays from
    its `content` snapshot; a word set or reading opens the library item.
    **Mark as done** sends `COMPLETE_ASSIGNMENT`. Withdrawn work is hidden
    from the student.
- **Two tabs, one mock db.** With the teacher app and the student app open
  in the same browser, `src/db/mockSync.js` keeps their copies in step.
  After a change a tab broadcasts its data (`BroadcastChannel`), and the
  others take it (`SYNC_STATE`; toasts stay per tab). A tab that opens asks
  first, so it starts where the others are. `StoreProvider`'s `caughtUp` is
  true once that first copy arrived, and the student app only toasts
  changes ("New note from…", "You're in…", "Lesson 5 is open…", "Payment
  confirmed…") after it. Apart from the component library and the lesson notes
  (`localStorage`), nothing is stored: close every tab and the seed
  comes back. A real backend's push replaces this file. When testing in a
  browser, use a fresh profile per run; leftover open tabs hand their data
  to new ones.
- **Per-viewer only, in browser storage:** who's signed in (per tab,
  `sessionStorage`) and which notes they've seen (the "New" badges),
  kept in `student/src/session.jsx`.
- **Teacher side:** the Invite dialog's class link is `joinLink(token)`
  (`data.jsx`), which opens `/student/join/<uuid>` on the same site.
- **Status (2026-10-01).** UI only, on the mock db; no real backend.
  - **Built and checked end to end,** with two tabs (teacher and student)
    in light and dark mode and at phone width:
    - sign in, or sign up, including from a class link;
    - Home;
    - class pages, where only shared lessons open;
    - the lesson player, which records Finish lesson;
    - the teacher's notes: inside their lesson, on the class page, and on
      Notes, with "New" badges and a count;
    - joining by code or link, then the teacher accepting;
    - accepting an email invite;
    - the catalog, Request to buy, and the teacher confirming;
    - My work: assigned by the teacher, finished by the student.

    Everything the teacher does (sends or unsends a note, shares a lesson,
    accepts a request, confirms a payment, assigns work) reaches an open
    student tab live, with a toast.
  - **Not built yet:**
    - declining an invite (only accepting exists);
    - a student profile or settings page, and resetting a password;
    - leaving a class from the student side;
    - the student's own lesson history;
    - showing a class member's own work (finished class lessons) to the
      teacher, who only sees completions for bought courses;
    - notes for a lesson that isn't shared yet show once sent (they aren't
      held back until the lesson is shared), which is still an open
      product decision;
    - a real push between devices: the sync is same-browser only.
  - **Known rough edges:**
    - a toast sits bottom-right for about 2.6s and can cover a short
      page's bottom-right action (Mark as done, Finish lesson) until it
      goes;
    - a student's answers inside activities aren't saved anywhere; only
      Finish lesson and Mark as done are recorded. Leaving the page clears
      them, the same as the teacher's "As student" preview;
    - the student app's sidebar has no collapse toggle (the teacher's
      does).

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

## Dark mode

Sourced from the kit's own dark frames — the **"dashboard dark mode"**
section of the Learniv Figma file (file `DY29Lqxu9v6ghvM5m0h7gL`, section
`6098:27081`; `dashboard` is `6098:28105`, `setting` is `6098:28714`). The
light/dark mobile sections sit alongside it. Values were pixel-sampled off
those renders, the same way the light tokens were.

**How it works — no `dark:` variants on components.** Tailwind v4 compiles
every color utility to `var(--color-…)`, so the dark theme is just the same
token names redefined under `:root[data-theme="dark"]` in `index.css`. Flip
the attribute and every `bg-neutral-*` / `text-primary-*` / `border-*` in the
app re-resolves. `src/theme.js` owns the switch (sidebar Light/Dark pill, or
the single sun/moon row in the icon-only rail); an explicit choice persists in
`localStorage`, otherwise it follows `prefers-color-scheme` live. `index.html`
sets the attribute before first paint so a dark reload never flashes white.

**What the kit's dark screens do, and how the tokens encode it:**
- Canvas (page, sidebar, topbar) is pure `#000` → `neutral-50`.
- Cards sit one step up at `#141414` with a `#595959` hairline → `surface`,
  `neutral-400`. Fields `#262626` → `neutral-200`; active nav / icon chips
  `#454545` → `neutral-300`; headings white → `neutral-950`.
- Neutral is the light ramp read back to front, so each role keeps its name.
- The five color ramps are mirrored around **500**: 500 is the solid fill
  (buttons, chart lines, progress, the brand orange) and is identical in both
  themes; the tint end (50–200) becomes a dark saturated tint, the text end
  (600–900) the brighter step dark backgrounds need. (The kit's dark "+20%"
  green samples at light `success-400`, which is exactly what dark
  `success-600` resolves to.)

**Rules for new UI:**
- **Never `bg-white` for a surface** — use `bg-surface` (cards, modals,
  drawers, popovers, outline buttons, selected tab pills, tooltips). Page-level
  canvas is `bg-neutral-50`. `bg-white` is only for things that are white in
  both themes (the Switch knob, a play button over a video).
- **Text on a dark-neutral fill carries a flipping color.** `bg-neutral-950`
  becomes near-white in dark mode, so pair it with `text-neutral-50`, not
  `text-white` (the "dark" Button, dark Avatar, neutral Badge, toast, PillTabs
  count all do this). `text-white` stays correct on colored fills
  (`bg-primary-500`, `bg-success-500`, …) because 500 doesn't move.
- **Always-dark regions use `bg-ink`** (video letterboxes, the live-session
  bar) with `text-white` / `text-white/60` — never neutral tokens, which flip.
- **Scrims use `bg-overlay`** (dark mode needs a much heavier one).
- **Charts:** pass `var(--color-…)` strings for grid/axis/tooltip colors
  (`stroke="var(--color-neutral-200)"`) — hex literals don't re-theme.
- **The `dark:` variant exists but is only for raw-hue decorative palettes**
  that can't ride the token swap (the ~30 block/component category tones in
  `data.jsx` / `COMPONENT_META`, each given a `dark:bg-{hue}-950
  dark:text-{hue}-400` counterpart). It's bound to `data-theme`, not the OS.

**Known gaps (dark mode inherits the migration status below):** anything
still on raw `slate`/`indigo` classes doesn't flip — `playground.jsx`,
`ui.jsx`'s legacy primitives, and the grammar
visuals in `grammar.jsx`. Those were deliberately left on light surfaces so
they stay readable (a dark surface under unflipped dark slate text would not
be); they read as light islands in dark mode until migrated.

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
  options may carry an optional `icon`), `MenuButton` (the kit's label +
  chevron Button opening a one-choice menu — list filters like the course
  tree's Taught / Not taught yet; `active` tints it while a non-default
  choice is applied; closes on pick, outside press or Esc)
- **Navigation**: `NavItem`, `NavSectionLabel`, `TabBar` (underline tabs),
  `PillTabs` (filter pills with a count badge)
- **Overlays**: `Modal`, `StudentCheckList` (the shared "pick some students"
  list — renders a purely visual checkbox indicator, not the interactive
  `Checkbox` button, since the whole row is already the click target and a
  `<button>` can't contain another `<button>`), `CategoryPicker` (a big
  catalog of icon+label options grouped into named sections, each with an
  optional used-count badge — "Add a block", "pick a component"),
  `LibraryPickList` (the denser, single-column "insert a saved item, grouped
  by where it was saved from" list — "Insert from My Component Library"), `RailItem` (a compact, selectable row for a
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
`StudentInsights.jsx`, `src/components/modals.jsx`
(`NewCourseModal`, `NewLessonModal`, `AddBlockModal`, `AssignModal`,
`AddTextModal`), `Auth.jsx` (`LoginPage`, `SignupPage`), `Settings.jsx`,
`src/components/StudentAssignModal.jsx`.
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

0. `npm run check` — lint, unit tests, build and browser tests in one go
   (see **Tests**). Add or update tests for what you changed.
1. `npx vite build` — must pass clean.
2. `npx oxlint <changed files>` — exit 0 (pre-existing "Fast refresh" warnings
   on files that export a helper alongside a component are fine to ignore).
3. Start the dev server, screenshot the changed screen(s) in a real browser
   (the student app too, at `/student/`, if the change touches shared code)
   **in both themes** (`localStorage.theme = "dark"`, then reload),
   check for zero `pageerror`/console errors — don't rely on the build passing
   alone; the dynamic-class-interpolation bug above passed the build fine and
   only showed up visually.
4. Clean up: kill the dev server, remove any temp scripts, confirm
   `git status --short` shows no stray `package.json`/`package-lock.json` diff
   if you only installed a temporary tool — uninstall it after. (Playwright
   itself is a dev dependency now: write a browser test in `e2e/` rather
   than a throwaway script.)
