# Español Trainer

A local web app for learning Spanish from Spain (CEFR A1 → A2), built around one problem: audio-only courses
and flashcard apps can feel boring. Setup steps are in **START-HERE.txt**.

## Spec

**Goal.** Get an English-speaking beginner to a conversational level (about B1-ish) in ~3 months, as a companion to
Language Transfer and Duolingo rather than a replacement.

**Design principles (against boredom)**
- Discover first: the rule is something you work out (ser vs estar), then it is named. No lecture.
- Varied formats, so no two minutes feel the same: multiple choice, fill the gap, word order, error hunt, matching,
  rapid fire, typed translation, listening (needs a Spanish voice), free writing, a role-play scenario.
- Colour and visual hooks: blue = SER, orange = ESTAR everywhere; DOCTOR / PLACE mnemonic cards.
- Short and finishable: chapters ~12 minutes, word of the day ~2 minutes, review ~5 minutes.
- Spain Spanish: vosotros in every table, "vale", "tío", "menú del día".

**Features (built)**
- Chapter 1 end to end: Discover → Learn → Phrases → 15 exercises → Write → Boss level → Results.
- Word of the day: one new Spain-Spanish word daily (30 queued), example, and a short question you answer using it.
  Checked by the AI if on, otherwise by a local "did you use the word" check.
- Spaced-repetition review (Leitner boxes: 1, 3, 7, 14, 30 days). Chapter phrases and daily words feed it. A card you miss
  stays in box 1 (back tomorrow) even if you get it right on the immediate re-ask.
- Weak-spot tracking by skill, with a drill. XP, daily goal, streak.
- Optional AI tutor (Gemini or DeepSeek): corrects free-written sentences with reasons, checks word-of-the-day sentences,
  free chat with a hostel receptionist who gently flags mistakes.

**Roadmap.** Chapters 2-12 are listed on the map (everyday verbs, numbers/time, food, directions, hostels, likes and
plans, routine, irregular verbs, past tense, describing, A2 checkpoint). Each follows the shape of chapter 1 in
`public/chapters.js`.

## How the AI layer works

`server.js` is a ~300-line Node server with no dependencies. The browser never sees your key. It exposes `/api/ai`
with three fixed modes (`correct`, `wotd`, `roleplay`); prompts live on the server, learner text is wrapped as data, and
replies are forced into a fixed JSON shape before reaching the page. It only accepts requests from localhost, and
rate-limits to 40 AI calls a minute so a bug can't run up a bill.

| Provider | Free? | Notes |
|---|---|---|
| Gemini (default) | Free tier with daily limits | Google says free-tier prompts may be used to improve its products |
| DeepSeek | Small signup credit, then pay-as-you-go | Servers in China |

Prices and limits change: check each provider's pricing page.

## Files

```
start.bat          double-click to run (Windows)
settings.env       provider, key, model, port (edit in Notepad)
server.js          local server + AI proxy
public/index.html  page shell
public/app.js      screens and exercise engine
public/logic.js    answer checking, spaced repetition, word picker (unit-tested)
public/chapters.js chapter content + roadmap
public/words.js    word-of-the-day list
public/style.css   look and feel
```

## Adding content
- **Words:** append to `public/words.js` (`id`, `es`, `en`, `ex`, `q`, `starter`, `forms`).
- **Chapters:** copy chapter 1's object in `public/chapters.js`, change the content, and delete the matching entry from
  `ROADMAP`. Exercise types: `mc`, `gap`, `translate`, `order`, `fix`, `match`, `rapid`, `listen`.

## Known limits
- Tested in headless Chrome on Linux against mock AI servers; not yet on Windows or against live Gemini/DeepSeek.
- The Gemini model ID in `settings.env` is a best guess; copy the exact name from Google AI Studio if it errors.
- Listening exercises and speaker buttons need a Spanish voice installed on the computer.
- Progress lives in the browser's local storage (same browser, same address each time).
