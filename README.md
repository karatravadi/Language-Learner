# Español Trainer

A local web app for learning European Spanish (as spoken in Spain) (CEFR A1 → A2), built for one problem: audio-only courses
and flashcard apps can feel boring. Setup steps are in **START-HERE.txt**. Notes for developers (and for
Claude Code) are in **CLAUDE.md**, and the plan for putting it online is in **HANDOVER.md**.

## What's in it
- **8 chapters.** Ser and estar, everyday verbs, numbers and time, food and ordering, getting around, hostels and
  shopping, likes and plans, daily routine. Each runs
  Discover → Learn → Phrases → ~15 mixed exercises → Write → a scenario with a character → Results.
- **A 45-minute day.** The home screen plans it (word 3 min, review 10, chapter 15, weak spots or chat 15) and counts
  minutes only while you're actively practising. You can change the goal in Settings.
- **Palabra del día.** A new Spain-Spanish word each day, with a question you answer using it.
- **Review.** Spaced repetition (1, 3, 7, 14 and 30 days). A card you miss stays at the start, even if you get it
  right on the re-ask.
- **Weak spots.** Mistakes are tracked by skill, with a drill for the weakest one.
- **Optional AI tutor** (Gemini or DeepSeek). Corrects what you write, checks your word-of-the-day sentence, and plays
  each chapter's character (Lucía, Javi, Carmen, Pepe, Marta, Álvaro, Nuria, Jordi) in free chat.

## Look and feel
Redesigned with [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir), CC BY 4.0.
Direction: a language exercise book on a café table. The Spanish sentence is set large in a serif, grammar colours
appear only where they carry meaning, and mistakes get a teacher's red-pen correction. It has a dark mode and works
at phone width.

## Adding content
Chapters and words are JSON files in `public/courses/es-ES/`. Copy a chapter, change it, add it to `course.json`,
then run `npm test`. The checker catches answers that aren't in the options, word tiles that don't build the
sentence, duplicate review cards, unknown skills and more. Details are in CLAUDE.md.

## Tests
```
npm test        unit tests + content checker (no install needed)
npm install     once, for the browser test
npm run e2e     plays every chapter in headless Chrome, with and without AI, at desktop and phone width
```

## Known limits
- Tested in headless Chrome on Linux against a mock AI. Not yet on Windows, a real phone, or live Gemini/DeepSeek.
- The Gemini model name in settings.env is a best guess. Copy the exact name from Google AI Studio if it errors.
- Listening exercises need a Spanish voice in the browser (Edge on Windows usually has one).
- Progress is saved in one browser on one device until the online version (HANDOVER.md) is built.

Credits and licences: see NOTICES.md.
