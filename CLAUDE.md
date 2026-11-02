# Español Trainer: project notes for Claude Code

Read this first, then `HANDOVER.md` for the next phase of work.

## What this is and who it's for
- A web app Kara (UK, product manager, on sabbatical) uses to learn **Spanish from Spain**, from scratch to a
  conversational level (CEFR A1 to A2, then towards B1). It supplements Language Transfer and Duolingo, whose
  audio-only format she finds easy to switch off from, so variety and active practice matter more than volume.
- She studies about **45 minutes a day** in the app. The home screen plans that day: word of the day (3 min), review (10),
  one chapter (15), then weak spots or AI chat (15). Practice time only counts while she is active on the page.
- Later: 2 to 3 friends with their own synced progress (see `HANDOVER.md`), and a **Latin** course
  (reading classical texts, Roman history, roots of the Romance languages) taking about 30 to 40% of her time.
  Spanish stays the priority.
- Kara is on Windows. Always lead with free options and state the price of anything paid upfront.

## Run and test
- `start.bat` (Windows) or `npm start`: local server at http://localhost:3000. No `npm install` needed to run.
- `npm test`: unit tests (answer checking, spaced repetition, every chapter's answers) plus the content checker.
- `npm run check`: content checker only. Run it after every content edit.
- `npm run e2e`: plays every chapter in headless Chrome with a fake AI and without AI, at desktop and phone width.
  Needs `npm install` once (puppeteer, dev only). It also fails on emoji, `null/undefined/NaN` text or horizontal overflow.
- AI tutor: key in `settings.env` (`PROVIDER=gemini` with `GEMINI_API_KEY`, or DeepSeek). The model name
  `gemini-3.5-flash-lite` in settings.env is an unverified guess: confirm the exact name in Google AI Studio.

## Layout
```
server.js                 zero-dependency Node server: static files + /api/status + /api/ai (localhost only)
public/index.html         shell
public/app.js             all screens, exercise engine, review, word of the day, practice timer
public/logic.js           pure logic, unit-tested: judge(), spaced repetition, word picker, streaks
public/style.css          design tokens and components (direction in the header comment)
public/fonts/             Instrument Sans + Newsreader (OFL), bundled so it works offline
public/courses/index.json list of courses
public/courses/es-ES/     course.json (meta, skills, roadmap), chapters/*.json, words.json
tools/check-content.js    validates every course file; tests/unit.js runs it too
tests/                    unit.js, e2e.js (spawns servers + mock AI), e2e-flow.js, mock-ai.js
```

## Content rules (most of the ongoing work is writing chapters)
- One JSON file per chapter in `public/courses/es-ES/chapters/`, listed in `course.json`, and removed from `roadmap`.
  Copy an existing chapter for the shape. The checker explains every field it rejects.
- Chapter flow: Discover (learner cracks the rule from colour-coded examples before it is named) → Learn (blocks:
  `tables`, `note` with kind tip/spain/warn/culture, `twist`, `list`) → Phrases (8, they join the review deck) →
  ~15 exercises (`mc`, `listen`, `gap`, `translate`, `order`, `fix`, `match`, `rapid`) → Write (AI-corrected or model
  answer) → Scenario (a character, 4 turns, one right reply each with reasons for the wrong ones) → Results.
- Spain Spanish: vosotros in every table, Spain vocabulary (vale, caña, móvil, ordenador, coger), Spain customs.
- Tokens: `{name}` is the learner's name, `{o}` is a/o for gendered endings. Nothing else.
- Every exercise has a `skill`; skills need a readable name in the chapter's `skills` (or the course's).
  Weak-spot drills group by skill.
- Translate answers: lowercase, no punctuation, list every natural variant (tú/usted/vosotros where sensible).
- Fix exercises: the fixed sentence must have the same number of words, so the red-pen mark can line up.
- Accuracy: the Spanish is written by an AI and checked by tests for consistency, not for correctness.
  Flag anything unusual for Kara. A native speaker reviewing each batch is the best safeguard.
- Pace: at 45 min a day Kara finishes a chapter every 1 to 2 days. Write chapters in batches of 4, run
  `npm test` and `npm run e2e`, then hand over. The roadmap in course.json lists chapters 5 to 12.
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
- The API key never reaches the browser. `/api/*` only answers localhost (Host and Origin checked), is rate-limited
  (40 AI calls a minute), caps request bodies at 20 KB, wraps learner text in `<learner>` tags and reshapes model
  output into fixed JSON before it reaches the page.
- `confirm()` guards destructive actions (reset progress, leaving a lesson).

## Known gaps
- Never run on Windows or against live Gemini/DeepSeek, only headless Chrome on Linux with a mock AI.
- Listening exercises and speaker buttons need a Spanish voice in the browser (Edge on Windows usually has good ones).
  Headless Chrome has none, so the tests skip listening exercises.
- Progress lives in one browser's localStorage. Syncing is the next phase (`HANDOVER.md`).
