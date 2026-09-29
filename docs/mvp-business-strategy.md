# Lucid: MVP & Business Strategy

*A path from "prototype that never finishes" to a product real people pay for.*

## The honest starting point

You already have a lot built. Lucid's teacher console has a dashboard, a full course/lesson builder, a reading library with tap-to-translate words, flashcards and drag-and-drop word games, a rich student profile (skills, grammar radar, streaks, L1-interference tracking), class analytics, and a design system faithfully cloned from a UI kit. That is genuinely more UI than most funded seed-stage EdTech startups have at this stage.

But it is also the classic trap: everything is teacher-facing, nothing has a student actually using it, there is no backend (state lives in memory and resets), and a large share of recent effort has gone into re-skinning components to match a design kit pixel-for-pixel. That is polish spent on a product no student, parent, or paying teacher has touched yet. This is why it feels like it "never finishes" — the definition of done has been "matches the Figma-equivalent kit," not "a teacher and a student completed one real lesson together."

The fix isn't more discipline on the same plan. It's shrinking the plan.

## The core problem, named plainly

Solo/small-team builders who never ship usually aren't failing from lack of skill — they're failing from an unbounded scope. The common pattern: a clean idea picks up "just one more" feature indefinitely, and months later there's an impressive app with zero users because nothing was ever *finished enough to expose to a stranger*. The rule of thumb worth adopting: if a version isn't shippable to 5 real users within roughly 4-6 weeks of focused work, the scope is wrong, not the timeline.

Two symptoms already visible in this codebase:
- Design-system migration work (retinting colors, radius fixes, motion tokens) is real craft, but it's infrastructure investment for a product with no users yet. It matters eventually; it shouldn't be competing for time with "can a student finish a lesson."
- The student side doesn't exist. A teacher/student platform with no student experience isn't a half-finished product — it's a different, unstarted product wearing the same repo.

## What Lucid actually is, competitively

English learning is a large, crowded market — language apps alone generated roughly $1.5B in 2025, with Duolingo dominant at over $1B in annual revenue, and structured/curriculum apps like Busuu and Babbel occupying the "serious learner" niche. You cannot out-gamify Duolingo or out-fund Babbel. But none of the mass-market apps have a real human teacher assigning, tracking, and adapting lessons for a specific class of students who share a first language — which is exactly what Lucid is built around (Azerbaijani-first interface, L1-interference tracking, a teacher who curates rather than an algorithm that guesses).

That's the wedge: **not** "another app that teaches English," but **the tool a real English teacher or small language school uses to run their existing students better** — assign lessons, see who's stuck, generate a parent/student-readable summary after each session. The AI/analytics layer is the differentiator over a plain LMS; the "teacher stays in the loop" positioning is the differentiator over Duolingo-style pure self-study.

## MVP: the one loop worth proving

Before touching another color token or animation, the only question that matters: **can one teacher assign a lesson to one real student, and can that student complete it, on a phone, without the teacher explaining how?**

Everything in the MVP should exist only to test that loop. Suggested cut:

**Keep (this is the whole MVP):**
- Teacher: create/edit one lesson type (reading + vocabulary is enough — drop quizzes/games/grammar-visuals from v1), assign it to a student or class
- Student: a simple, mobile-first view — log in, see assigned lessons, open one, read/tap-translate words, mark done
- One persistence layer: a real (even minimal) backend/database so a lesson assigned today is still there tomorrow — this alone (replacing the in-memory mock) is more valuable than any UI polish left on the teacher side
- One feedback loop back to the teacher: "student X finished lesson Y, missed these words"

**Cut from v1 (park, don't delete):**
- Multiple lesson block types (flashcards, drag-and-drop, quizzes, grammar visuals) — pick the single most-used one, ship it, add the rest only once teachers ask
- AI-generated pre-lesson briefs, churn/at-risk flags, grammar-mastery radar, CEFR trajectory — impressive, but nobody has asked for them yet because nobody outside you has used the product
- Level tests, class-wide statistics/heatmaps, streaks/XP/gamification
- Design-system perfection — "good enough and consistent" beats "pixel-identical to the kit" while there are zero users
- Multi-tenant accounts, roles/permissions beyond teacher/student, SSO, localization beyond Azerbaijani+English

If a task doesn't make the teacher-assigns → student-completes loop work, it goes on the parking-lot list, not into this sprint.

## Business strategy

**Who pays, and for what.** Two viable paths, not mutually exclusive:
- *B2B2C*: sell to small private language schools / individual tutoring businesses (there are many across Azerbaijan and the wider Turkic/Russian-speaking region) a seat-based subscription per teacher, where each teacher brings their own roster of students. This is the faster path to revenue because you're selling to one decision-maker (the school owner or lead teacher) instead of convincing individual parents.
- *B2C*: sell direct to independent tutors or to parents, freemium on the student app with the teacher tools behind a paid tier. Freemium works well in education because most teachers discover new tools via a free trial or free tier and become the internal advocate who pulls a whole school onto a product — but it's a slower revenue ramp and needs volume you don't have yet.

Start B2B2C: it gets you 5-10 real teachers (and their students) faster, which is exactly the group you need to validate the MVP loop with.

**Pricing anchor.** Education SaaS typically lands on a monthly/annual per-teacher-seat subscription, sometimes with a per-student add-on once a teacher's roster passes a threshold. A workable starting anchor: free for a teacher's first class (up to ~5-10 students) to remove all friction from trying it, then a flat monthly fee per teacher once they exceed that — not per-feature tiers yet, you don't have enough features or users to justify tiering.

**Differentiation to say out loud to a prospective teacher:** "Duolingo doesn't know your students exist and can't tell you what to teach next Tuesday. Lucid is the assistant that watches what your students actually struggle with (in their own language) and hands you a ready lesson plan and a parent-readable summary — you stay the teacher, the app does the tracking."

**Go-to-market for the first 10 customers:** not ads, not a landing page funnel — direct outreach to language-school owners and independent English tutors you can reach personally or through one warm intro, offer to onboard their first class by hand, watch them use it, fix what breaks that week. The dashboard/AI-insights features you've already half-built are exactly what turns "free trial teacher" into "paying advocate," but only after the core loop is proven — sequence them second, not first.

## Phased roadmap

1. **Weeks 1-4 — Prove the loop.** Ship the MVP above to 3-5 real teacher/student pairs (can be friends, your own contacts, or one small school). Real backend, one lesson type, mobile student view. Success = a student who was never trained on the app completes a lesson unassisted.
2. **Weeks 5-8 — Close the loop teachers actually asked for.** Add back exactly the 1-2 features from the "cut" list that real users requested (probably: one more lesson type, or a simple progress view). Start charging the first cohort, even a token amount — paying is the real validation signal, not sign-ups.
3. **Months 3-4 — Scale the teacher side.** Now the AI-insights/dashboard/analytics work earns its keep, because there are real usage patterns to analyze and real teachers who'll notice if a "focus action" recommendation is actually useful. Bring the design-system migration to completion here, not before.
4. **Months 5-6+ — Expand surface area.** Level tests, gamification, class-wide statistics, more lesson types — driven by what paying customers ask for, not by what's left on a feature list.

## How you'll know it's working

Pick a small number of numbers and ignore the rest until the MVP is live:
- Weekly active students (not signups — a student who opened one lesson and vanished doesn't count)
- Lesson completion rate (assigned vs. finished)
- Teachers who assign a *second* lesson without being prompted (the real retention signal — it means the first one worked well enough to trust the tool again)
- First 3 teachers who pay anything, even a small amount

## The one-sentence rule for the next month

Before adding anything to the codebase, ask: *does this help a real teacher assign a real lesson to a real student this week?* If not, it goes in the parking lot — the parking lot is not where good ideas go to die, it's where they wait until real users have earned the right to prioritize them for you.

---

*Sources consulted: [Language Learning Revenue and Usage Statistics (2026) – Business of Apps](https://www.businessofapps.com/data/language-learning-app-market/), [21 Apps Better Than Duolingo for Serious Language Learners in 2026 – PolyChat](https://www.polychatapp.com/blog/apps-better-than-duolingo), [90 Days to MVP: The Ultimate Scope Creep Prevention Guide – PilotSprint](https://www.pilotsprint.com/blogs/the-hidden-cost-of-mvp-scope-creep-why-less-really-is-more), [Ultimate Guide: How To Build A Successful MVP In 2025 – F22 Labs](https://www.f22labs.com/blogs/ultimate-guide-how-to-build-a-successful-mvp/), [EdTech Pricing Models – Monetizely](https://www.getmonetizely.com/articles/edtech-pricing-models-monetizing-education-technology-effectively), [What Are the Monetization Models for AI Tutoring SaaS Platforms – Idea Usher](https://ideausher.com/blog/ai-tutoring-saas-monetization/).*
