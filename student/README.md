# Lucid for students

The student app — its own package, served at **`/student/`** next to the
teacher app at `/`. Same dev server, same build, same deploy:

```
npm run dev      # teacher app: http://localhost:5173/   student app: http://localhost:5173/student/
npm run build    # dist/index.html (teacher) and dist/student/index.html (student)
```

It has no design or data of its own. Everything comes from the teacher app
through the `@app` alias (`src/`):

- **Design:** `@app/index.css` (tokens, dark theme) and `@app/design-system.jsx`
  (the component factory). The sign-in page is the teacher app's own Auth
  sheet (`AuthShell`), and lessons play through the same renderer as Block
  Studio's "As student" view (`BlockStudentView` from `@app/views/parts.jsx`).
- **Data:** the same mock db and reducer (`@app/store.jsx`), scoped to the
  signed-in student by `studentView`, the student-side twin of `teacherView`.
  The access rule (`canOpenLesson`) and which notes reach a student
  (`notesSentToStudent`) live in the data layer, not here.

## Trying it end to end

Open the teacher app and the student app in two tabs of the same browser.
They share one mock db (`src/db/mockSync.js`), so what one does shows up in
the other straight away:

- **Notes:** the teacher sends a class note (class page, lesson page, or the
  live lesson), and the student sees it on Home, under Notes, and inside that
  lesson, with a toast.
- **Joining:** the student joins with a class code (or the class link from
  the teacher's Invite dialog, `/student/join/CODE`), and the request shows up
  in the teacher's Requests; the teacher accepts it and the class appears for
  the student.
- **Sharing:** the teacher shares a lesson (or marks it taught), and it opens
  for the class's students.
- **Buying:** the student requests to buy a course; the teacher marks it paid
  under Customers, and every lesson opens.
- **Work:** the teacher assigns a block, task, word set or reading from the
  student's page; it shows up under My work, and Mark as done reaches the
  teacher's Assigned work card.

Sign in with any demo account on the sign-in page, or sign up. Nothing is
saved: close every tab and the next one starts from the seed data again.

## Layout

```
student/
  index.html              entry page (same pre-paint theme script as the teacher app)
  src/main.jsx            mounts the app on @app/index.css
  src/StudentApp.jsx      router (basename /student), shell, live-update toasts
  src/session.jsx         who's signed in (per tab) and which notes they've seen
  src/lib.js              small read helpers over the scoped state
  src/components/         NoteItem, LessonRow
  src/views/              SignIn, Home, ClassPage, LessonPage, Notes, Courses, JoinClass, Work
```

## What's built and what's left

See **"The student app"** in the root `CLAUDE.md`: it keeps the current
status, what isn't built yet, and the known rough edges.
