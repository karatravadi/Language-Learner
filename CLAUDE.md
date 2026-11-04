# Stilus: project notes for Claude Code

Read this first, then `HANDOVER.md` for the next phase of work.

## What this is and who it's for
- A web app for learning **European Spanish**, from scratch to a
  conversational level (CEFR A1 to A2, then towards B1). It supplements Language Transfer and Duolingo, whose
  audio-only format is easy to switch off from, so variety and active practice matter more than volume.
- It is built for about **45 minutes a day**. The home screen plans that day: word of the day (3 min), review (10),
  one chapter (15), then weak spots or AI chat (15). Practice time only counts while the learner is active on the page.
- A small invited group, each with their own synced progress (Access Emails policy; see `HANDOVER.md`). A **Latin** course (reading classical
  texts, Roman history, roots of the Romance languages) has 4 chapters, about 25 minutes a day next to the Spanish.
  Spanish stays the priority and the default course. See "Latin course" below.
- The owner develops on Windows. Always lead with free options and state the price of anything paid upfront.

## Run and test
- `start.bat` (Windows) or `npm start`: local server at http://localhost:3000. No `npm install` needed to run.
- `npm test`: unit tests (answer checking, spaced repetition, every chapter's answers) plus the content checker.
- `npm run check`: content checker only. Run it after every content edit.
- `npm run e2e`: plays every chapter in headless Chrome with a fake AI and without AI, at desktop and phone width:
  Spanish three times, Latin twice, French twice, then switches course and back.
  Needs `npm install` once (puppeteer, dev only). It also fails on emoji, `null/undefined/NaN` text or horizontal overflow.
  On Windows, use the installed Chrome instead of Puppeteer's download (npm 11 blocks that script):
  `CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run e2e`.
- AI tutor: key in `settings.env` (`PROVIDER=gemini` with `GEMINI_API_KEY`, or DeepSeek). The model name
  `gemini-3.5-flash-lite` in settings.env is unverified; the hosted Worker uses `gemini-3.5-flash-lite` (500 free requests a day), confirmed in AI Studio.

## Hosted version (live since 2 Nov 2026)
- https://stilus.karatravadi.workers.dev: one Cloudflare Worker named `stilus` (`worker/index.js`, `wrangler.jsonc`) serves
  `public/` and answers `/api/*`. Free plan. Cloudflare Access (All traffic) asks for sign-in
  on every address; the Worker also verifies the `Cf-Access-Jwt-Assertion` token (issuer + AUD, held as the Worker secrets
  `ACCESS_TEAM` and `ACCESS_AUD`, not in `wrangler.jsonc`, since the repo is public) and fails closed if they are blank.
- Who can sign in: Zero Trust → Access → Policies (the owner's Cloudflare account plus an Emails policy for invited learners).
- Until 2 Nov 2026 the Worker was `espanol-trainer` (espanol-trainer.karatravadi.workers.dev), with its own Access
  application and Gemini secret. `stilus` has its own of both.
- D1 database `espanol-trainer` (WEUR, shared by both Workers, so progress carried over): `progress` (sync, versioned saves), `ai_usage` (daily AI caps) and `profiles` (one name and choice of endings per person, shared by every course; `/api/profile`). `/api/usage` and a `usage` field on every AI reply give the tutor calls left today.
  Schema changes go in `migrations/`; `npm run deploy` applies them, then deploys.
- AI: Gemini 3.5 Flash-Lite, free tier 15 a minute and 500 a day for the whole project. Caps: 60 per person, 450 total.
  Key is a Worker secret (`npx wrangler secret put GEMINI_API_KEY`, the owner types it in, never into a chat).
- Local copy of the hosted version: `npm run dev:hosted` (port 3132, local database). `.dev.vars` (git-ignored) sets
  `DEV_USER`, a test login honoured on localhost only; switch person with an `X-Dev-User` header.
- Sync rules are `L.mergeState` in logic.js (unit-tested). The app only syncs when `/api/status` says `sync: true`,
  so `start.bat` keeps working exactly as before.

## Layout
```
server.js                 zero-dependency Node server: static files + /api/status + /api/ai (localhost only)
lib/ai.js                 AI tutor core shared with the hosted Worker: provider, prompts, model call, shape()
worker/index.js           hosted Worker: Access check, /api/status, /api/ai (daily caps), /api/progress (sync)
wrangler.jsonc            Worker config: assets, D1 binding, model, AI caps (Access team and AUD are secrets)
migrations/               D1 schema
public/index.html         shell (manifest and icons for Add to Home Screen)
public/sw.js              service worker: keeps the app and every course on the device, network first, never /api/*
public/manifest.json, icon.svg, icon-*.png, apple-touch-icon.png, favicon-32.png  app icon: ink-blue cover, cream S, red-pen accent marks
public/app.js             all screens, exercise engine, review, word of the day, practice timer
public/logic.js           pure logic, unit-tested: judge() and nearMiss() (spelling slips), spaced repetition, word picker, streaks
public/style.css          design tokens and components (direction in the header comment)
public/fonts/             Instrument Sans + Newsreader (OFL), bundled so it works offline
public/courses/index.json list of courses, each with a label for the course switch in the header
public/courses/es-ES/     course.json (meta, skills, roadmap), chapters/*.json, words.json, glossary.json
public/courses/la/        the Latin course, same shape
public/courses/fr-FR/     the French (European) course, same shape
tools/check-content.js    validates every course file; tests/unit.js runs it too
tools/spanish-text.js     the course-language text a learner can tap; lists words still missing from the glossary
tests/                    unit.js, e2e.js (spawns servers + mock AI), e2e-flow.js, mock-ai.js
```

## Content rules (most of the ongoing work is writing chapters)
- One JSON file per chapter in `public/courses/es-ES/chapters/`, listed in `course.json`, and removed from `roadmap`.
  Copy an existing chapter for the shape. The checker explains every field it rejects.
- Chapter flow: Discover (learner cracks the rule from colour-coded examples before it is named) → Learn (blocks:
  `tables`, `note` with kind tip/spain/warn/culture, `twist`, `list`) → Phrases (8, they join the review deck) →
  ~15 exercises (`mc`, `listen`, `gap`, `translate`, `order`, `fix`, `match`, `rapid`) → Write (AI-corrected or model
  answer) → Scenario (a character, 4 turns, one right reply each with reasons for the wrong ones) → Results.
- European Spanish: vosotros in every table, Spain vocabulary (vale, caña, móvil, ordenador, coger), Spain customs.
- Tokens: `{name}` is the learner's name, `{o}` is a/o for gendered endings. Nothing else.
- Every exercise has a `skill`; skills need a readable name in the chapter's `skills` (or the course's).
  Weak-spot drills group by skill.
- Translate answers: lowercase, no punctuation, list every natural variant (tú/usted/vosotros where sensible).
- Spelling slips: a typed answer (gap, translate, review) one letter off in a word of 5+ letters, outside its first
  and last two letters, and not a real word (glossary), gets half a mark ("Nearly"). Add `"strict": true` to a gap or
  translate exercise where the spelling is the point.
- Fix exercises: the fixed sentence must have the same number of words, so the red-pen mark can line up.
- Why an answer is wrong: when a wrong answer is the right sentence with one form swapped for another from a chapter's
  tables (taught so far), the feedback says what it is for: "vives goes with tú (…). For usted (…), use vive", or
  "estoy is a form of estar. This one needs ser: soy". `L.formHint` in logic.js; the course's `personNotes` explain
  each "you". So keep tables tidy: one form per cell (or `·` between two), row labels that are persons or plain words.
  An `mc` exercise can add `wrong` (one note per option, "" for the right one) where the tables can't explain it.
- Discover groups: `label` says what the examples share ("With ser"), never a colour name. Notes never repeat their
  own label ("Careful: …" under Careful). The checker rejects both.
- Accuracy: the Spanish is written by an AI and checked by tests for consistency, not for correctness.
  Flag anything unusual for the owner. A native speaker reviewing each batch is the best safeguard.
- Pace: at 45 min a day a learner finishes a chapter every 1 to 2 days. Write chapters in batches of 4, run
  `npm test` and `npm run e2e`, then hand over. The roadmap in course.json lists the next chapters (9 onwards).
- The `boss.persona` text is the AI character's brief. Only the server reads it (from disk), so the page can never
  inject its own prompt.

## Design rules (from an unslop pass; unslop by Damir Sokolovsky, @heydamir, CC BY 4.0)
- Direction: patient, exact, a little warm. World: a language exercise book on a café table. Moment: the Spanish
  sentence set large in Newsreader. Signature: **red-pen correction marks** (`pen()` in app.js: wrong words struck
  through, right words written in with a hand-drawn underline). Use the red pen only for feedback.
- Neutral, slightly warm ramp; one accent (the red pen, also the daily-minutes bar); blue/orange/green only as
  grammar colours that carry meaning in content. All tokens are at the top of style.css, with a dark mode.
- No emoji, no exclamation marks in English UI text (Spanish ¡…! is fine, it's the language), no greeting headline,
  sentence case, no trailing periods on labels or buttons, weights 400 to 600, 4px spacing grid,
  Lucide icons at 16 to 18px with a 1.5 stroke (paths are inlined in app.js `ICONS`).
- No confetti, no looping or bouncy motion. One easing curve, `cubic-bezier(.22, 1, .36, 1)`.

## Safety rails to keep
- The API key never reaches the browser. Locally, `/api/*` only answers localhost (Host and Origin checked) and is
  rate-limited (40 AI calls a minute); hosted, it needs a verified Access token, same origin, and has daily caps.
  Both cap AI request bodies at 20 KB, wraps learner text in `<learner>` tags and reshapes model
  output into fixed JSON before it reaches the page.
- `confirm()` guards destructive actions (reset progress, leaving a lesson).

## Known gaps
- Tests use a mock AI. Live Gemini and Access sign-in were checked by hand on 2 Nov 2026.
- Listening exercises and speaker buttons need a Spanish voice in the browser (Edge on Windows usually has good ones).
  Headless Chrome has none, so the tests skip listening exercises.
- Locally, progress lives in one browser's localStorage, behind `store` in app.js, with export/import in Settings.
- Practice time: counted while the page is on screen with activity in the last 3 minutes (tap, key, scroll, mouse,
  or the voice speaking), as real elapsed time, per device (`S.time[day] = { deviceId: secs }`, summed by `L.daySecs`).
- Offline: `sw.js` caches the app and all courses on first visit and refreshes the copy after each online load.
  Offline, the home screen says "Offline · lessons still work"; progress stays on the device and syncs on reconnect.
  The AI tutor and AI word lookups need a connection. iPhone home-screen apps keep their own sign-in, so Access asks
  once more the first time the app is opened from the home screen.
- `npm run e2e` covers the local server only; the hosted Worker was checked by hand with `wrangler dev`.

## Latin course (public/courses/la)
- The second course, about 25 min a day next to 45 min of Spanish. Reading first: classical Latin,
  Roman history as content, Romance roots (note kind `roots`, word-of-the-day `kin` lines).
- Course choice: `?course=<id>`, then the last course used on the device (`trainer-course` in localStorage), then the
  first in index.json. The header switch (Español | Latīna) reloads with `?course=`. Each course has its own
  `storageKey`, so progress, streak, goal, review deck and sync row are separate.
- course.json drives the differences, and Spanish needs none of it: `ui` labels (merged over `UI_DEFAULTS` in app.js),
  `plan` minutes, `goalMins` 25, `ui.marksOptional` (macrons never count as mistakes), `ui.invertedQuestion` false,
  `genderedExamples` false, `scenarioReplies: "en"` (scenario replies are English, so only the character's lines are
  tappable Latin), `brand`, and for the AI `languageName`, `roleplayRules`, `speaker`, `glossNote`.
- Exercise extras: translate `"dir": "toEn"` (Latin to English, compared ignoring articles and contractions, and
  no review card on a miss), order `"promptStyle": "target"` with optional `alts`. No listen type: browsers have no
  Latin voice, so there are no speaker buttons either.
- Every Latin word shown needs an entry in `la/glossary.json` (same checker rule as Spanish). Gaps can be endings
  (`Puell___`): the checker reads the sentence with the answer written in, and the app leaves the stem untappable.
- Macrons in all Latin text. Check new Latin against Whitaker's Words or Wheelock (both free online).

## French course (public/courses/fr-FR)
- The third course (added 2 Nov 2026): French (European), meaning standard French, A1 then A2, 25 min a day (`goalMins` 25, plan 2/7/8).
  Chapters 1 to 8 are written (être and tu or vous, avoir and -er verbs and ne … pas, numbers and time, food and
  ordering, aller and directions, hotels with vouloir and pouvoir, likes and plans, daily routine with reflexive verbs).
  The roadmap in course.json plans 9 to 12 and ends in an A2 checkpoint, like Spanish.
- Settings that differ from Spanish: `lang` fr-FR, `languageName` French, `genderedExamples` false (no `{o}` in French
  content: write both forms as answers, e.g. "je suis français" and "je suis française", with `who` labels),
  `invertedQuestion` false, `brand.mark` ç, `speaker` a person from France, and `ui` praise and labels in French.
- The content fields are still called `es` (words.json, phrases) in every course. Do not rename them.
- Apostrophes: a word is letters only, so j'ai taps as j and ai. The glossary has entries for the single letters
  (j, l, d, n, m, t, s, c, y) saying what they stand for. `L.judge` treats a curly apostrophe (what an iPhone types) as a
  straight one, keeps apostrophes inside words (j ai is wrong, j'ai is right), and ignores « ». Œ and æ count as oe and ae.
- Standard French only. Septante and nonante are explained as Belgian and Swiss and not taught.
- Accent slips count as right with a note, as in Spanish. That is too kind for pairs that differ only by an accent
  (a and à, ou and où, la and là). Test those with `mc` or `gap`, where the accent is the choice, not with typed answers.
- Same safeguard as the others: the French is AI-written, checked by tests for consistency and not for correctness.
  A French speaker should read each batch.

