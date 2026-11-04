# Stilus

A web app for language learning designed to be more intensive than popular alternatives (looking at you Duo). Fun but not easy. Built around active practice and focused on romance languages. Invite-only.

![Screenshot of a Stilus lesson](docs/screenshot.png)

## What this is
I have spent years telling myself I'll learn a romance language and have never found free or paid apps to be helpful.

Stilus is designed to help me (+ a few friends) learn a romance language, right now limited to:

- Spanish (European)
- French (Standard)
- Latin

Users can select courses, work through chapters and learn from past mistakes.

## Key features
- Tap a word to see its meaning and save it to My words.
- Spaced-repetition review. Saved words come back when you are about to forget them.
- Weak-spot drills, so practice goes where it is needed most.
- A daily plan with an active-time tracker.
- AI correction and role-play chat. The tutor explains the mistake and plays a character in short scenes.
- Fair marking. Small spelling slips earn half marks rather than zero.
- Familiar chapter and content shape every time.

## Product decisions
- Active practice over volume. Variety and doing beat long passive sessions, so every chapter mixes formats.
- Free plans only. Cloudflare Workers, D1 and Access, plus the Gemini free tier. The cost of running Stilus is zero, and that shaped everything below.
- A capped tutor. The AI tutor allows 60 calls per person and 450 in total per day. The caps keep the app inside the free tier, and the remaining calls are shown to the learner so the limit is never a surprise.
- European Spanish content prioritised.
- Content designed to align with CEFR levels. Spanish and French currently run from A1 to A2, ending in an A2 checkpoint. Latin isn't covered by CEFR, so it follows its own reading path.
- Beginner-safe explanations. No grammar term is used before a chapter has taught it.
- Calm interface. The look is an exercise book on a café table. Red-pen marks appear only for corrections.

## How this was built
Designs were made in Claude Design, given an initial clean-up with [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (CC BY 4.0), then tweaked further in Figma.

The code is written with an AI pair-programmer (Claude Code). `CLAUDE.md` is the technical reference it works from, and `HANDOVER.md` lists the open steps.

The lesson content (Spanish, French and Latin) is also AI-written, so treat it as a study aid rather than an authority. It can contain mistakes. Latin is checked against Whitaker's Words and Wheelock's Latin where possible.

## Tech stack
- [Cloudflare Workers](https://workers.cloudflare.com/) for the app and API
- [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) for synced progress
- [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) for sign-in, with an email allow-list
- Google Gemini 3.5 Flash-Lite (free tier) for the tutor
- Plain HTML, CSS and JavaScript on the front end

## Project structure
```
public/              the front end: app.js (screens and exercises), logic.js (marking, review, sync rules), sw.js (offline)
public/courses/      course content, one folder per course (chapters, words of the day, glossary)
server.js            local server: serves public/ and the AI tutor, no install needed
lib/ai.js            the AI tutor (prompts, model call, output checks), shared by the local server and the Worker
worker/index.js      the hosted Worker: sign-in check, AI caps, progress sync, profiles
wrangler.jsonc       Worker configuration
migrations/          D1 database schema
tools/               content checker
tests/               unit tests and the browser test
CLAUDE.md            full technical reference
HANDOVER.md          open steps
START-HERE.txt       step-by-step setup on Windows
```

A note on names: sorry, the app is called Stilus, the repo Language-Learner, and some internal names (the database,
the package and the saved-progress keys) still say espanol-trainer, from when it was Spanish only. Renaming the
database and the progress keys would reset everyone's saved progress, so they stay.

## Getting started
Both options are free.

<details open>
<summary><b>Online (recommended): ~30 minutes</b></summary>

<br>

Sign in from any device, progress synced, an invite list, and offline use once opened.
You need [Node.js](https://nodejs.org) (LTS), a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and a
Google account (for a free Gemini key).

1. Get the code and sign in to Cloudflare:
   ```
   git clone https://github.com/karatravadi/Language-Learner.git
   cd Language-Learner
   npm install
   npx wrangler login
   ```
2. Create the database (keep this name) and paste the `database_id` it prints into `wrangler.jsonc`:
   ```
   npx wrangler d1 create espanol-trainer
   ```
3. Deploy. It prints your address, `https://stilus.<your-subdomain>.workers.dev`:
   ```
   npm run deploy
   ```
4. In the Cloudflare dashboard: **Workers & Pages** › **stilus** › **Domains** › **Enable Cloudflare Access** for
   `workers.dev`. Add the emails allowed in under **Manage Cloudflare Access**.
5. Add three secrets, pasting each when asked: your Gemini key from [Google AI Studio](https://aistudio.google.com/),
   then the team name and **AUD** tag Cloudflare showed in step 4:
   ```
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put ACCESS_TEAM
   npx wrangler secret put ACCESS_AUD
   ```

Until step 5 is done the app loads but won't sync or use the tutor.

</details>

<details>
<summary><b>Offline: ~5 minutes</b></summary>

<br>

Runs on one computer, with progress saved in that browser. No sign-in or sync.
You need [Node.js](https://nodejs.org) (LTS). The tutor is optional and needs a Google account (for a free Gemini key).

```
git clone https://github.com/karatravadi/Language-Learner.git
cd Language-Learner
npm start
```

- Open http://localhost:3000.
- On Windows, you can double-click `start.bat` instead.
- [START-HERE.txt](START-HERE.txt) walks through every step.
- For the tutor, copy `settings.example.env` to `settings.env`, add your key from
  [Google AI Studio](https://aistudio.google.com/), and restart.

</details>

## Tests
```
npm test        unit tests (marking, spaced repetition, sync rules, every chapter's answers) and the content checker
npm run e2e     plays every chapter of every course in headless Chrome, with and without the AI tutor,
                at desktop and at 360, 390 and 430px phone widths, including offline (needs npm install once)
```

The content checker rejects things like answers missing from their options, word tiles that don't build the
sentence, words with no glossary entry, and labels that rely on colour alone. The tests use a mock AI, so they don't
cover the hosted Worker or the live model.

## What's not done yet
- Automated tests for the hosted Worker.
- Clearer explanations for absolute beginners, for example ustedes as the formal plural.

Next on the course roadmap:
- Spanish: irregular favourites, what happened (past tense), describing people and places, then an A2 checkpoint/test.
- French: chapters 9 to 12, then an A2 checkpoint/test.
- Latin: describing words, was and will be, the third declension, then real texts.

## Licence
MIT for the code, see [LICENSE](LICENSE). Lesson content is AI-written and shared as is.
