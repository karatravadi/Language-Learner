# Handover: putting Stilus online for Kara and friends

> Status, 2 Nov 2026: Steps 0 to 4 are done and live (see the Hosted version section of `CLAUDE.md`). We chose a
> Worker with static assets rather than Pages. Friends' Emails policy added the same day. Left: Step 5 (phone polish, offline),
> and automated tests for the Worker and the merge-on-conflict path in the browser.

Written 2 November 2026 at the end of a build session in Claude's cloud workspace. That workspace could not reach
hosting providers, auth services or the AI APIs, and could not hold Kara's logins, so this phase moves to
Claude Code on her Windows PC. Read `CLAUDE.md` first.

## Where things stand
- v2 works locally: 8 chapters (ser/estar, present tense, numbers and time, food and ordering, getting around,
  hostels and shopping, likes and plans, daily routine), 29 words of the day,
  spaced-repetition review, weak-spot drills, a 45-minute daily plan with an active-time tracker, optional AI tutor
  (sentence correction, word-of-the-day check, free chat with each chapter's character).
- Content lives in JSON files with a checker. The UI was redesigned with the unslop skill.
- Tests: `npm test` (62 checks) and `npm run e2e` (14 checks × 3 runs). All pass.

## Goal of this phase
1. Kara and 2 to 3 friends open the app from any device (PC and phone) and sign in.
2. Each person's progress syncs across their devices.
3. AI works for everyone through one shared key held on the server, with per-person daily limits.
4. Nobody else can get in or use the key.
5. Running cost stays at £0 if possible. Anything paid gets a price and Kara's OK first.

Friends will not create their own AI keys, so bring-your-own-key is out.

## Step 0: check before building (Kara's rule: free first, prices upfront)
Free tiers change. Verify each of these against the provider's own current pages and show Kara a short comparison
with prices before choosing:

| Option | Sign-in | Data | AI proxy | Things to verify |
|---|---|---|---|---|
| **A. Cloudflare** Pages + Workers/Pages Functions + D1, with **Cloudflare Access** in front (favourite) | Access email one-time code, invite list of emails, no login code to write | D1 (SQLite) | a Worker function | Access free-plan seat limit (believed 50), whether it protects `*.pages.dev` or needs a custom domain (about £8 to £10 a year if so), D1 free limits |
| **B. Supabase** + any static host | Supabase Auth magic link | Postgres | Edge Function (Deno) | whether idle free projects get paused (believed after about a week, bad for a study app), email sending limits on the built-in mailer |
| **C. Keep `server.js`** on a Node host with a disk, adding login code | write it yourself (riskier) | SQLite file | as now | which hosts still have a free tier with a persistent disk; cold starts |

Recommendation to test first: **A**. An invite list of emails suits "me plus 2 or 3 friends", there's no password
or reset code to write, and nothing sleeps. The cost: `server.js` doesn't run on Workers as it is, because Workers are
per-request functions with no disk, no long-running process and no in-memory counters. About a third to a half of it
gets rewritten, namely startup, static serving, settings and rate limiting. Prompts, `shape()` and the provider calls
carry over.

## Step 1: get the code into GitHub
- Create a **private** GitHub repo (free) and push this folder. `.gitignore` already excludes `node_modules` and
  test screenshots. **Never commit `settings.env` with a key in it**: add it to `.gitignore` and ship
  `settings.example.env` instead.

## Step 2: refactor without changing behaviour
- Move `buildMessages`, `shape`, `loadCourses` and the provider call out of `server.js` into a shared module used by
  both the local server and the hosted function.
- Put all storage behind a small `store` interface in app.js (`load()`, `save()`), still localStorage, so sync can
  slot in later.
- Add **Export / import progress** (a JSON file) in Settings. Useful now, and a safety net for the migration.
- Keep `npm test` and `npm run e2e` green after every step.

## Step 3: sync design
- One row per person per course: `progress(user_id, course_id, state_json, updated_at, version)`.
- localStorage stays as an offline cache. Load the server copy on start. Save with the version you loaded.
  If the server has moved on, merge and retry:
  - `done[n]`: keep the higher `best`, latest `date`
  - `srs[id]`: keep the card reviewed most recently (add a `seen` timestamp in `srsGrade`)
  - `time[day]`: keep the larger number (two devices on the same day otherwise double-count), and prune old days
  - `wotd.done`, `wotd.learned`, `reviewed`: union
  - `skills[k]`: keep the larger `r` and `w`
  - `xp`: recompute from the merged state, or take the max (simpler, and fine for a game score)
  - `name`, `fem`, `goalMins`: last writer wins
- First sign-in on a device that already has local progress: offer "Use this device's progress" (one-time upload),
  so Kara keeps her streak.

## Step 4: hosted AI proxy
- Same three modes (`correct`, `wotd`, `roleplay`) and the same rules: key as a platform secret, never in the page;
  persona read from the course files on the server; `<learner>` wrapping; output reshaped into fixed JSON.
- Limits: per person per day (start at 60 AI calls, enough for 45 minutes with chat) and a global daily cap below the
  provider's free quota. Show a friendly message when a limit is hit.
- Identity comes from the auth layer (with Access, validate the `Cf-Access-Jwt-Assertion` JWT, not just the email
  header). Same-origin only, no CORS.
- Google's free Gemini tier may use prompts to improve its products. Tell friends that in the app's AI help text.
  If they'd rather not, the paid tier doesn't, and costs pennies at this volume, but check current prices first.

## Step 5: phone polish
- Web app manifest plus icon, so "Add to Home Screen" works on iPhone and Android.
- Check the layout at 360 to 430px wide (the e2e test already runs at 390).
- Spanish voices on phones are usually good. Test the listening exercises on a real phone.

## Acceptance checklist
- [ ] Kara signs in on PC and phone and sees the same streak, chapters and review cards (PC done 2 Nov; phone to check)
- [ ] A friend signs in with their own email and starts from zero. A stranger can't get in (Emails policy added 2 Nov; first friend sign-in to confirm)
- [ ] Offline on the phone: lessons still work, and progress syncs when back online without losing anything
- [x] The AI key is not visible in page source, network responses or the repo
- [ ] Per-person AI limit works, and the global cap works (calls left now shown in the app)
- [ ] `npm test` and `npm run e2e` pass. Add tests for the merge rules
- [x] Monthly cost confirmed with Kara (target £0): Cloudflare free plans, Gemini free tier

## After this phase
- **More Spanish chapters (the main ongoing need).** Chapters 9 to 14 are on the roadmap in `course.json`.
  Then extend towards B1: preterite vs imperfect, the future, giving opinions, the subjunctive basics.
- **French course**, in `public/courses/fr-FR/` with 4 chapters (see "French course" in CLAUDE.md). Next: chapters 5 to 12
  from its roadmap (getting around, hotels and shopping, likes and plans, daily routine, irregular favourites, the passé
  composé, describing people and places, A2 checkpoint), and a read of chapters 1 to 4 by someone who speaks French.
- **Latin course**, in `public/courses/la/` with 4 chapters (see "Latin course" in CLAUDE.md). Next:
  - Chapters 5 to 12 from its roadmap, ending in real public-domain texts (Caesar, Catullus, Ovid, Cicero).
  - A Latinist's check of the 4 chapters and the glossary.
  - Romance descendants are on the Latin word of the day; the Spanish one could show its Latin root too.

  Free references to check against: Perseus Digital Library, Whitaker's Words, Dickinson College Commentaries.

## Open questions for Kara
- Hosting choice after the Step 0 comparison
- Whether friends also learn Spain Spanish (their emails are on the invite list)
- Is a custom domain worth about £8 to £10 a year?
