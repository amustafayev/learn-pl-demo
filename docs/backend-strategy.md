# Lucid backend: strategy

*How to turn `../backend/lucid-backend` (was `whisper-backend`) into the real
backend behind this prototype, without breaking the "views never change" seam
in `src/db/`.* Read this together with
[`mvp-business-strategy.md`](./mvp-business-strategy.md). That doc decides
**what** to build. This one decides **how**.

## 1. Verdict on the existing code

**Keep the base, replace the features.** The Whisper backend is well built:
Go 1.25, Chi, GORM, Postgres. It builds cleanly, `go vet` passes, and all 13
test packages pass. But everything above the infrastructure layer is about
quotes.

| Layer | What's there | Decision |
|---|---|---|
| `main.go`, `config/`, `infra/`, `common/`, `pkg/` | Env profiles, connection pool, request-id + logger middleware, JWT middleware, one error shape (`{status,type,message,code,traceId}`), one success shape (`{status,type,data}`), validator | **Keep.** Fix the items in §2 |
| `auth/` | Register/login, access + refresh tokens with **rotation and reuse detection**, email OTP password reset with attempt cap, rate limit and constant-time compare | **Keep.** This is the most valuable part. Fix §2, then change the roles |
| `account/` | `GET /me` read from token claims | **Keep**, then extend with the profile from the DB |
| Module layout `x/{db,model,service,handler,http}` + hand-written fake repos in service tests | A clean, repeatable pattern. Repos enforce ownership (`WHERE id=? AND user_id=?` and return 404 when the row isn't yours) | **Keep as the template for every Lucid module** |
| `quote`, `bookmark`, `note`, `collection`, `highlight`, `footnote`, `journal`, `reminder`, `reading`, `reward`, `subscription` + `cmd/seedquotes` | All keyed on `QuoteID` | **Deleted** in Phase 0. Three are worth copying back later (below) |

Patterns worth copying back from the deleted modules. They're still on the
backend's local `whisper-main` branch and in the `whisper` remote:
- `reading`: a unique `(user_id, day)` row per active day is exactly how streaks should be stored later.
- `reward` + `rewardevents`: an append-only ledger plus an in-process event bus. Reuse the bus now for the **activity feed**, and the ledger later for XP.
- `subscription`: one entitlement row per user. This is the right shape for teacher seat plans once billing starts.

## 2. Fix before building on it

Verified against the code. P0 items are confirmed bugs (reproduced with a
throwaway test, since deleted).

**Status (2026-09-29): fixed in Phase 0**, with regression tests. Covered:
- both P0s, every P1, and the P3 row
- the P2 logging and chi rows

How some of them were done:
- The access-token check is by issuer (`lucid-api`), not `aud`/`typ`.
- `RealIP` was left out on purpose. It trusts `X-Forwarded-For`, which is only safe behind the reverse proxy from §8. Add it when that proxy exists.

**Still open:** the refresh-token cookie (P2). It belongs with the real frontend login in Phase 1.

| # | Issue | Where | Fix |
|---|---|---|---|
| **P0** | **Refresh tokens collide.** Two tokens minted for the same user in the same second are byte-identical: HS256 over `{sub, iat, exp}` at 1-second precision. `refresh_tokens.token` is `uniqueIndex`, so the second insert fails with a 500. In `Refresh` the old token is already revoked by that point, so **the user is silently logged out**. Logging in from two tabs in the same second is enough to trigger it, and so is a login followed by a refresh within one second | `common/util/jwt_util.go` `GenerateRefreshToken` | Make refresh tokens opaque random values (32 bytes from `crypto/rand`) rather than JWTs, and **store only their SHA-256 hash** (they're stored in plaintext today) |
| **P0** | **A refresh token passes as an access token.** `ValidateAccessToken` accepts it (same secret, no type claim) and puts `UserID=0` on the request. The only thing stopping it today is every service calling `RequireUserID`. One forgotten call would turn a 30-day token into a working credential | `jwt_util.go`, `infra/middleware.go` | Opaque refresh tokens (above) fix this. Also add `aud`/`typ` checks, and have the middleware reject `UserID==0` |
| P1 | Roles are `ADMIN`/`USER`. Login and refresh never check `Status`, so a deactivated student can still log in. `Register` validates `username` and then drops it (there's no name column) | `auth/model/enums.go`, `auth/service` | Roles become `TEACHER`/`STUDENT`. Add `users.name`. Check `ACTIVE` in login and refresh. Only teachers self-register; students are invited (§5) |
| P1 | Schema is created by `AutoMigrate` at boot. It never drops or renames anything and can't do check constraints or backfills. `sql-migrate` is already a dependency, and `fileMigration()` is written but commented out | `*/db/migrations.go` | Switch to versioned SQL files in `migrations/` via the `sql-migrate` code that's already there. Stop calling `AutoMigrate` |
| P1 | Integer serial IDs. The frontend mints IDs on the client (`uid()`; `ADD_LESSON` takes a caller-supplied `id`) and does optimistic writes | every entity | **UUID primary keys**, and create endpoints accept a client-supplied UUID. Then optimistic UI needs no ID remapping |
| P1 | `InitDb` logs a failed connection and keeps going | `infra/db/db.go` | `log.Fatal`, and build the DSN with `url.UserPassword` so passwords containing `@`/`!` are escaped |
| P2 | `LOG_LEVEL` does nothing: `pkg.InitLogger` is never called, and the GORM logger is hard-coded to `Info`, so every SQL statement is logged | `main.go`, `infra/db/db.go` | Call `InitLogger`, and drive GORM's level from config |
| P2 | `github.com/go-chi/chi v1.5.5` is the legacy import path. There's no panic recoverer, no graceful shutdown and no health endpoint | `go.mod`, `main.go` | Move to `chi/v5` with `middleware.Recoverer`/`RealIP`, add `GET /healthz`, and use `signal.NotifyContext` + `Server.Shutdown` |
| P2 | Refresh token travels in the JSON body. That's fine for Whisper's mobile app, but a web app would have to keep it in `localStorage` | `auth/handler` | Set it as an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `/api/v1/auth`, and keep the access token in memory only. This works because everything is same-origin (§7) |
| P3 | Dead or broken code: `UserRepo.Update` panics, and `GetUserByIdAndUsernameAndRole` queries a `name` column that doesn't exist. `Logout` doesn't check that the token belongs to the caller | `auth/db/repository.go`, `auth/service` | Delete the dead code. Scope logout to the caller's own tokens |

## 3. Domain model: from `mockDb` state to tables

The source of truth is `createInitialState()`/`reducer` in
`src/db/mockDb.jsx`, plus the seed shapes in `src/data.jsx`. The rules that
matter most:

- **A course has no progress of its own.** Progress lives on the class-course pairing only.
- **A student's lesson is whatever their class is on.**

```
workspaces            id, name, created_at            ← one per teacher at signup; never shown in UI (yet)
users                 id, workspace_id, role(TEACHER|STUDENT), status, email, name, password_hash NULL
courses               id, workspace_id, title, level, hue, template_id
lessons               id, course_id, position, title, teacher_notes
lesson_blocks         id, lesson_id, position, type, title, meta, content JSONB   ← components live in content
classes               id, workspace_id, name, schedule_days smallint[]
class_members         class_id, student_id  UNIQUE(student_id)                   ← replaces studentIds[] + student.classId
class_courses         class_id, course_id, current_lesson_id NULL, status(in-progress|done), started_at, finished_at
                      PK(class_id, course_id)                                     ← the ONLY place progress pointers live
texts                 id, workspace_id, title, topic, level, word_count, body JSONB   ← token list incl. az/def/ipa
word_sets             id, workspace_id, title, category, level, words JSONB
bank_blocks           id, owner_id, type, title, from_label, content JSONB        ← "My Blocks"
bank_components       id, owner_id, kind, title, from_label, data JSONB           ← today in localStorage
assignments           id, student_id, kind(lesson|reading|vocabulary), target_id, status, assigned_at, completed_at
block_attempts        id, student_id, lesson_id, block_id, score, answers JSONB, created_at
lesson_completions    student_id, lesson_id, class_id, completed_at  PK(student_id, lesson_id)
student_words         student_id, term, az, def, example, status, source, due_at, loop_stage  PK(student_id, term)
student_notes         id, student_id, author_id, date, covered, new_words text[], mistakes text[], next
activity_events       id, student_id, type, detail, ref JSONB, at                 ← append-only; feeds activity + future analytics
```

Design choices:
- **JSONB for block content, not a table per component kind.** There are about 30 component kinds (`COMPONENT_META`) with free-form shapes, and the frontend is their only interpreter. Normalizing them now would freeze the builder. Blocks are still separate rows because `UPDATE_PART`/`MOVE_PART` act on one block at a time.
- **`workspace_id` on every tenant-owned row from day one**, created automatically, with no UI. The B2B2C plan sells to schools. Adding tenancy later means changing the `WHERE` clause of every query. Adding it now costs one table and one foreign key per row.
- **Don't store derived analytics as columns.** The prototype's student fields `skills`, `concepts`, `cefr`, `l1`, `tracking`, `xp`, `streak`, `atRisk` and `wordFlow` are parked by the MVP doc. When they come back, compute them from `activity_events` + `block_attempts`; don't hand-maintain them.
- **H5P stays in Node** (`server/`; there's no Go H5P server). Lucid stores only the `contentId` inside `lesson_blocks.content`, the same as today.

## 4. API: one endpoint per reducer action

Everything is under `/api/v1`. Responses use the existing envelope. The
"Phase" column refers to §6.

> **As built (2026-09-29, backend branch `modules`):** routes are grouped by
> role. Teacher routes live under `/api/v1/teacher/…`, student routes under
> `/api/v1/student/…`, and each group enforces its role before any module code
> runs. So the implemented paths differ from the table below: for example,
> `POST /teacher/courses` rather than `POST /courses`. The backend `README.md`
> has the current route list and explains the module architecture.

| Reducer action | Endpoint | Phase |
|---|---|---|
| *(login / signup forms in `Auth.jsx`)* | `POST /auth/register` (teacher), `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /me` | 1 |
| *(new)* bootstrap | `GET /workspace/snapshot`: courses, lessons + blocks, classes, students, texts, word sets, bank in one payload | 1 |
| `ADD_COURSE` | `POST /courses` | 1 |
| `ADD_LESSON` | `POST /courses/{id}/lessons` (accepts client UUID) | 1 |
| `UPDATE_LESSON_NOTES` | `PATCH /lessons/{id}` | 1 |
| `ADD_PART` / `UPDATE_PART` / `REMOVE_PART` | `POST` / `PATCH` / `DELETE /lessons/{id}/blocks[/{blockId}]` | 1 |
| `MOVE_PART` | `PUT /lessons/{id}/blocks/order` `{ids:[…]}` | 1 |
| `ENSURE_BUILT` | *(gone: the server always stores real blocks; seed hydration is client-only)* | 1 |
| `ADD_TEXT` | `POST /texts` | 1 |
| `UPDATE_TEACHER_PROFILE` | `PATCH /me` | 1 |
| `ADD_CLASS` | `POST /classes` | 2 |
| `SET_STUDENT_CLASS` / `SET_STUDENT_COURSE(null)` | `PUT /students/{id}/class` `{classId\|null}` | 2 |
| `ASSIGN_CLASS_COURSE` | `POST /classes/{id}/courses` | 2 |
| `SET_CLASS_COURSE_STATUS` / `SET_CLASS_CURRENT_LESSON` | `PATCH /classes/{id}/courses/{courseId}` | 2 |
| *(new)* invite a student | `POST /classes/{id}/invites` `{name, email}` | 2 |
| `ASSIGN` | `POST /assignments` `{studentIds, kind, targetId}` | 3 |
| *(new, student)* | `GET /me/assignments`, `GET /me/lessons/{id}`, `POST /me/blocks/{id}/attempts`, `POST /me/lessons/{id}/complete` | 3 |
| `SET_WORD_STATUS` / reader "save word" | `PUT /students/{id}/words/{term}` (teacher) · `PUT /me/words/{term}` (student) | 3 |
| *(new)* the feedback loop | `GET /students/{id}/progress`, `GET /classes/{id}/progress` | 4 |
| `SAVE_NOTE` | `POST /students/{id}/notes` (the server also upserts `newWords` into `student_words`) | 4 |
| `SAVE_BLOCK_TO_BANK`, `REMOVE_FROM_BANK`, `SAVE/REMOVE_COMPONENT_TO/FROM_BANK` | `POST`/`DELETE /bank/blocks`, `/bank/components` | stretch |
| `BUILD_RECAP_LESSON` | `POST /students/{id}/recap-lessons` (one server-side transaction) | parked |
| `SET_RECORDING_SUMMARY`, `SET_TEACHER_2FA` | — | parked |
| `PUSH_TOAST` / `DISMISS_TOAST` | client-only, never persisted | — |

**Authorization is the core security property.** A teacher can only reach
rows in their own workspace. A student can only reach their own rows, plus
lessons of the course their class is on. Build this into the repos the way
Whisper already does ownership (`WHERE workspace_id = ?`, 404 on miss). Write
one integration test per module that tries to cross the boundary.

## 5. Student accounts

For the MVP loop, students **don't self-register**. The teacher invites them
from a class, and the backend creates a `STUDENT` user with no password. The
student logs in with a **6-digit email code**. Whisper already has almost all
of this: the `PasswordResetOTP` table, the attempt cap, the rate limit, the
constant-time compare and the SMTP sender all carry over as-is. Only the
purpose of the code and the email template change.

*Open decision:* if your students are mostly on phones and don't read email,
a **class join code + first name + 4-digit PIN** is less friction. It needs
new code, though, and email OTP needs almost none. Start with OTP and switch
if onboarding stalls.

## 6. Phased plan (fits the MVP doc's weeks 1–4)

**Phase 0: clean the base (1–2 days). ✅ Done 2026-09-29** on the backend's `phase-0` branch. It was verified end to end against a real Postgres:
- register, login, rotation and replay detection, logout
- `/healthz` returns 200, and 503 with the database down
- restarting applies 0 migrations
- SIGTERM drains cleanly

1. Delete the 11 Whisper modules and `cmd/seedquotes`, and simplify `main.go`'s wiring.
2. Fix the P0 and P1 items in §2: opaque refresh tokens, roles, status check, UUID keys, versioned migrations, fail-fast DB connection.
3. Move to `chi/v5`, add `/healthz`, graceful shutdown and `InitLogger`.
4. Frontend: add `'/api': 'http://localhost:8081'` to the proxy in `vite.config.js`.

**Architecture: ✅ built 2026-09-29** on the backend's `modules` branch. It's one service for teachers and students, split by domain into `identity`, `course` and `class`. The modules never import each other: they couple through interfaces and events wired in `app/wiring.go`, and a test enforces that rule. See the backend README.

**Phase 1: teacher content persists (week 1).** Workspaces, users, courses, lessons, blocks, texts, word sets and the snapshot endpoint. Frontend: real login, then hydrate the store from `GET /workspace/snapshot` and write each content action through (see §7).
*Done when:* a teacher builds a lesson, reloads, and it's still there.
*Backend status:* workspaces, courses, lessons and blocks are done. Still to do: texts, word sets and the snapshot endpoint, plus all of the frontend work.

**Phase 2: classes and students (week 2).** Classes, members, class-courses, invites and student OTP login.
*Done when:* a teacher invites a real student, who can log in.
*Backend status:* done. Teachers add students, and students log in with an emailed code. Students can also already open their class and its lessons, which is the lesson-view part of Phase 3.

**Phase 3: the student loop (week 3).** Assignments, the student's lesson view, block attempts, lesson completion and saved words, plus the minimal mobile student UI (frontend work).
*Done when:* a student completes an assigned reading + vocabulary lesson on a phone without help.

**Phase 4: close the loop and deploy (week 4).** Progress endpoints and `activity_events` publishing (through the `rewardevents`-style bus), then deploy (§8).
*Done when:* the teacher sees "Rashad finished Lesson 4, missed *deploy*, *blocking*".

**Parked** until real users ask:
- the bank of saved blocks and components (it stays in localStorage for now). Kits were removed from the prototype on 2026-09-29; if they come back, they'd be a `kits` + `kit_items` table that references bank items by id rather than copying them.
- recap lessons
- analytics/tracking and AI summaries
- level tests
- XP/streaks (reuse the `reward` ledger + `reading` day patterns)
- billing (reuse the `subscription` shape)
- per-student H5P auth and xAPI progress

## 7. Frontend integration: keep the seam

The goal is still what `CLAUDE.md` promises: nothing in `src/views/` or
`src/components/` changes.

- **New `src/db/lucidClient.js`** on `createApiClient("/api/v1")`, which unwraps the `{status,type,data}` envelope once. The error side needs no changes: `apiClient.js` already reads `code` and `message`, which is exactly what the Go `ErrorResp` sends.
- **Hydrate once, then write through.** At MVP scale (one teacher, dozens of students) the whole workspace is a small payload. `StoreProvider` fetches the snapshot after login and seeds the existing `useReducer` with it. The reducer stays the local cache. A `persist(action)` map in the db layer sends each mutating action to its endpoint from §4. It updates optimistically (possible because IDs are client-minted UUIDs), and on an `ApiError` it rolls back and calls `toast(err.description)`. Views keep calling `dispatch` exactly as they do now.
- **Switch `uid()` in `mockDb.jsx` to UUID v4.** Keep building it from `getRandomValues`, since `randomUUID` is missing on plain http. Today it emits `c` + 12 hex characters, which a UUID column won't accept.
- **Refresh must be single-flight.** On a 401, one shared promise refreshes and every waiting request retries after it. Two parallel refreshes with the same token look like token theft to Whisper's reuse detector, which then **revokes every session** for that user.
- **Split the snapshot** into per-page queries only when it gets slow. That's a later problem, and it stays inside `src/db/`.
- **Seed data** (`SEED_*` in `data.jsx`) becomes a dev-only seeding command in Go (`cmd/seed`), so a fresh database looks like the prototype does today.

## 8. Deployment (first 5–10 teachers)

Run one small VM (or Fly.io/Render) with **Caddy** in front of everything on
one origin:
- `/api` goes to the Go server.
- `/h5p` goes to the Node H5P server, which needs a persistent volume for `h5p/content`.
- `/` serves the static Vite build.
- Postgres runs on the same machine or as a managed instance.

Same-origin means no CORS, and the refresh cookie just works. Also:
- Take a nightly `pg_dump` to object storage.
- Before real students log in, replace the H5P server's hardcoded `demo-teacher`. It should verify the Lucid access token, which is signed with the same secret or a short-lived token Go mints for it.

## 9. Before you push

- `origin` is **`github.com/amustafayev/learnin-pl-backend.git`**. Whisper's repo is kept as a second remote named `whisper`, so pushing to `origin` can't reach it.
- `origin/main` is a single fresh commit: the renamed Whisper base. It contains no Whisper history. Here's what the rename changed:
  - folder: `whisper-backend` → `lucid-backend`
  - module: `github.com/wisper-org/whisper-backend` → `github.com/amustafayev/learnin-pl-backend`
  - route prefix: `/whisper/v1` → `/api/v1`
  - env vars: `DB_WHISPER_*` → `DB_LUCID_*`
  - default port: 8080 → 8081 (the H5P server owns 8080)
  - Docker Compose and email branding renamed to Lucid
- Phase 0 sits on the local `phase-0` branch and isn't committed or pushed yet.
