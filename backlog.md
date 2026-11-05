# Stilus backlog

Last updated 5 Nov 2026. Sizes: S under an hour of work, M a session, L several sessions. Item numbers are fixed IDs, not the order they appear in. Done items are at the end.

## Suggested build order

| Stage | Items | Why |
|---|---|---|
| 1. Bugs | 12 and 7 together, then 8, 9, 10 | 12 loses real progress. 7 shares its cause. 8 to 10 are small fixes. |
| 2. Quick win | 16 | Small, no dependencies |
| 3. Bigger features | 3 with 21, then 11, 13, 14, 5, 15 | 3 and 21 first because they help beginners most. 11 feeds 13 and 14. 15 is the largest. |
| 4. Content checks | 18, 19, then 20 after 15 | Keep the course coherent as chapters are added |
| 5. Test on the phone first | 6, 17 | Each starts with a five-minute test. Drop the item if it fails. |

---

# 1. Bugs

## 12. Starting a new chapter erases progress in an unfinished one (M, fix first) - FIXED 4 Nov 2026

Seen: halfway through chapter 2, Kara opened chapter 3 and the chapter 2 progress was gone. Going back to chapter 2 started it again from the very first step, so the position really is lost, not just hidden.

Likely cause, to verify: this probably shares a root cause with item 7. The app seems to keep one "current chapter" slot, so opening any chapter overwrites whatever the last one held. In item 7 only the display was affected. Here the half-finished position is really lost, which is worse. Fix both together.

Plan:
- Store progress per chapter, keyed by chapter id: step reached, answers so far and score so far. Opening a chapter must never write to another chapter's record.
- Save after every exercise, locally and to D1, so a closed tab or a crash loses at most one answer.
- A chapter that is part-done shows "Resume" and where you are (for example "exercise 6 of 15"), not "Carry on" with no position.
- Cover all three courses.
- Test: get halfway through chapter 2, open chapter 3, leave it, go back to chapter 2, and confirm it resumes at the same exercise with the same score. Repeat after a page reload and on a second device.

Still to check: whether the answers and score from the first attempt were also dropped or only the position.

## 7. The most recently clicked chapter hides its saved score and ticks (S) - FIXED 4 Nov 2026

Seen: chapter 1 shows a tick on the course list, but its button says "Carry on". Reopening it resets the chapter's progress in the left-hand Today checklist and the score from the first run stops showing. The Today plan also lists "Carry on: chapter 1" after the chapter was finished.

Finding (Kara): it happens the moment the chapter is reopened, before any answer is given. The percentage shows for every chapter except the most recently clicked one, and chapter 1 shows its original score again once another chapter is opened. So the score is not lost. This is a display and state bug, not data loss.

Plan:
- Treat a finished chapter as finished for good. Keep the completed flag, the first score and the best score.
- The course list and Today plan should render the last-clicked chapter like any other, with its saved score and ticks.
- Reopening starts a fresh practice run that is stored separately. It never overwrites the first score or clears today's ticks.
- Change the button on finished chapters from "Carry on" to "Practise again", and show the score next to it.
- The Today plan should not suggest a chapter that is already finished.
- Check the same for Latin and French, and check the synced D1 copy as well as the local one. First check that the first score is still in D1 while the chapter is reopened.
- Test: finish a chapter, reopen it, quit halfway, and confirm the score, tick and Today checklist are unchanged.

## 8. Rapid fire ends with Finish and Continue, and Finish goes nowhere (S) - FIXED 4 Nov 2026

Seen: after the last rapid fire question (score "7 of 8") two buttons show. Finish does nothing visible.

Plan:
- Show one button after the final question. Keep Continue, remove Finish.
- If Finish was meant to end a round early, give it a real destination or take it out.
- Check the other exercise types that end a block for the same duplicate.

## 9. "Careful" appears twice in warning notes (S) - FIXED 4 Nov 2026

Seen: in chapter 1 the note has the label "Careful" and the text starts with "Careful:" again (about sleepy, hungry, thirsty and age using tener).

Plan:
- Remove the leading "Careful:" from the text. The label already says it.
- Search all chapters (Spanish, French, Latin) for notes whose text starts with the same word as their label (Careful, Tip, Spain, Culture) and fix them.
- Add a rule to the content checker so a note that repeats its own label is rejected from now on.

## 10. Discover boxes are titled by colour, not by meaning (S) - FIXED 4 Nov 2026

Seen: the first page of a chapter ("Work it out") shows two coloured boxes headed "Blue" and "Orange". In chapter 2 they should say what the group is, for example "I" and "we". Kara says it looks like every chapter.

Plan:
- Give each box a title that says what its examples have in common, in plain English. Chapter 2: "One person (I)" and "A group (we)". Chapter 1: ser and estar.
- The colour stays as decoration, matching the colour coding used later in the chapter. It never carries the meaning on its own.
- Add a `label` field to each group in the chapter JSON, and make the content checker reject a group with no label or a label that is only a colour name. Fix all Spanish, French and Latin chapters in one pass.
- Accessibility: colour-only headings fail for colour-blind users, so this also fixes that.

---

# 2. Quick win

## 16. Mixed review across chapters (S) - DONE 5 Nov 2026 (drills; flashcards get it with item 13)

Why: mixing old topics in one session feels harder than one topic at a time, but it improves long-term retention and forces a choice between forms (ser or estar, tú or usted).

Plan:
- Add a "Mixed" option to weak-spot drills and flashcards. It draws exercises from several finished chapters in a random order instead of one skill at a time.
- Keep the plain skill drill too, since a single skill is easier when first learning something.
- Show the skill under each question only after answering, so the mix stays a real test.

---

# 3. Bigger features

## 3. Say why an answer is wrong (M) - DONE 4 Nov 2026 (hints from the chapters' tables; "Four ways to say you" in Spanish chapter 1)

Problem: the app says an answer is wrong but not why, which is hard for a complete beginner.

Plan:
- Add an optional `why` note to exercises, shown after a wrong answer in plain English. Example: "vives goes with tú. For usted, use vive".
- Only use grammar words the chapter has already taught.
- Start with the known gaps: ustedes as the formal plural, usted vs tú, and verb endings.
- Written by AI, so flag anything uncertain for Kara to check. Latin notes get checked against Whitaker's Words or Wheelock.
- This is the first step on the open "clearer explanations for absolute beginners" item in HANDOVER.md.

## 21. Give a hint before showing the answer (S, build with item 3) - DONE 5 Nov 2026 (chapter exercises, drills and mixed review)

Why: studies of corrective feedback find that prompting the learner to fix their own mistake can help lasting learning more than just giving the answer.

Plan:
- On a wrong typed answer, show a short hint first ("check the ending" or "this verb goes with tú"), then allow a second try.
- Show the answer and the red-pen correction after the second miss.
- The first-try result counts for marks. The second try only gives the learner another go.
- Hints come from the `why` notes in item 3, so build the two together.

## 11. Save a whole verb, with its conjugation, to My words (M) - DONE 4 Nov 2026 (Spanish, 44 verbs; review asks one form at a time)

Problem: tapping a verb saves one form (for example "vivo"), so learning a verb means saving six forms by hand.

Plan:
- When the tapped word is a verb, offer "Save verb" next to the normal save. It saves the infinitive (vivir) with the full present-tense table: yo, tú, él/ella/usted, nosotros, vosotros, ellos/ellas/ustedes. Spain Spanish, so vosotros is always included.
- One card per verb in My words, showing the table. Not six separate cards.
- Review: the card asks for one form at a time, picked at random ("vosotros, vivir"), which suits active practice over reading a table. Missing a form keeps the whole verb due sooner.
- Source of the tables: ship them in the content, not from live AI calls, so it costs no tutor calls and works offline. Mark irregular verbs (ser, estar, tener, ir, hacer) and have each table checked, since the content is AI-written.
- Later tenses: when the past tense chapter arrives, the same card gains a tense switch.
- Latin and French: same idea, with Latin showing the verb's endings by person and macrons throughout. Do Spanish first.

Open question: should review ask for one form at a time (recommended) or the whole table at once?

## 13. Flashcards: type the English, then sometimes type the Spanish (M) - DONE 5 Nov 2026

Idea (Kara, 5 Nov 2026): a flashcard mode, Spanish first. A Spanish word shows and she types the English. After a right answer the card sometimes flips at random, showing the English so she types the Spanish.

Plan:
- A "Flashcards" session of about 10 cards on the home screen, separate from Review. Review keeps its due-date schedule. Flashcards are free practice any time.
- Card source: My words and the 8 key phrases from finished chapters, weighted towards weak ones. No new data to maintain.
- Direction: Spanish to English first. After a right answer, a random share of cards (suggest 1 in 3) flip so the English shows and she types the Spanish. Production is harder, so track each direction separately on the card.
- Marking uses the item 2 rules: a one-letter slip is half a mark, and an accent slip is a warning, not a fail.
- Accepted answers: every card needs a list of natural English meanings and, for the reverse direction, the Spanish variants (tú, usted, vosotros). Cards with only one possible answer stay Spanish to English only, so a correct synonym is not marked wrong.
- Typing Spanish on a phone and a Windows PC is awkward, so show a row of buttons above the box for á é í ó ú ñ ¿ ¡.
- Verb cards from item 11 pick one random form for the reverse direction.
- Show the answer with the red pen on any difference, then one tap for the next card. Session end shows the score and the cards to look at again.
- Counts toward the daily active-time tracker. Uses no tutor calls.

Decided: a missed card comes back once at the end of the same session.

## 14. Rote drills for the core verbs, starting with ser and estar (M) - DONE 5 Nov 2026 (Spanish: ser, estar, tener, ir, hacer)

Idea (Kara, 5 Nov 2026): use rote learning to get the basics automatic, particularly soy and estoy and the verbs like them. (Written as "rota"; read as "rote".)

Why: ser versus estar by meaning is already taught in chapter 1. Rote work on the forms is what makes them come out without thinking. It complements the meaning work, it does not replace it.

Plan:
- A short daily drill of 2 to 3 minutes, added as a line in the Today plan, on a small set of core verbs. Start with ser and estar, then tener, ir, hacer. Present tense, all six forms including vosotros.
- Rotate three formats so it does not become a chant:
  1. Speed round in sentences: a gap sentence appears ("Yo ___ de Inglaterra", "Vosotros ___ en el bar") and she types soy or estoy, against a timer. Drilling the form inside a sentence transfers to real use better than drilling it alone, and it forces the ser or estar choice.
  2. Who is it: a form appears ("estoy", "sois") and she picks the person.
  3. Fill the table: all six forms of one verb, typed from memory. Use this as an occasional warm-up, not the main format, since isolated table drilling transfers less well.
- Mix the pairs on purpose: soy and estoy, eres and estás, es and está side by side. That contrast is the hard part.
- A verb graduates out of the daily drill after three clean, fast runs on different days, then reappears now and then through Review.
- Reuses the verb tables from item 11 and the card engine from item 13. Build it after both.
- Half marks (item 2) apply, but never for the last two letters, since the endings are the point.
- Later: the same drill for French (être, avoir) and Latin (sum, esse).

Decided: the drill is optional in the daily plan, but shown first so it takes under 3 minutes and does not eat into the 45.

## 5. Spot the mistakes in a short paragraph (M)

Problem: drills get repetitive, and Kara loses focus on passive formats.

Plan:
- New exercise type, a cousin of `fix`: a 3 to 4 line paragraph with 2 or 3 errors. Tap the words you think are wrong, then fix them.
- Red-pen marks on the wrong words after checking, as in `fix`.
- Errors drawn from what the chapter has taught. Add a `skill` to each so weak-spot drills pick them up.
- Start with 1 per chapter from chapter 5 onwards, then see how it feels.

## 15. Short graded readings with tap-to-save (M)

Why: reading lots of easy text that is mostly understood is one of the best-supported ways to build vocabulary, and it is active, not audio-only.

Plan:
- A "Reading" section with short texts of 100 to 150 words: stories, dialogues, notes, menus, texts between friends. Spain Spanish and Spain settings.
- Each text uses mostly words from the chapters already done plus a handful of new ones, so it is readable but stretching. Tag each text with the chapter it follows.
- Tap-any-word and save to My words already work. Reuse them.
- Two or three questions after each text, not marked harshly: one on the gist, one on a detail, optionally one where she types a short answer.
- Show an English translation only on request, after the questions, not alongside the text.
- Counts towards active time. Uses no tutor calls.
- Texts are AI-written, so flag anything unusual for checking. Latin gets the same idea later with short graded passages, checked against Whitaker's Words or Wheelock, with macrons throughout. This also fits the reading-first Latin course.

---

# 4. Content checks

## 18. Check the course teaches the most common words first (M)

Why: a few thousand common words cover most everyday Spanish, so teaching them first gives the biggest return.

Plan:
- Compare the words taught so far (chapter phrases, key words, word of the day) against a free frequency list for Spanish. Check the list's licence before using it, and prefer a Spain Spanish or general list.
- Output a short report: common words missing from the course, and rare words taught early. Then adjust the word-of-the-day queue and upcoming chapters.
- Re-run it whenever a batch of chapters is added.
- Frequency is a guide, not a rule. Survival words (hostel, bill, allergy) can outrank it.

## 19. Make sure every taught word comes back (M)

Why: vocabulary research generally finds that a word needs many varied encounters, often around ten or more, before it sticks. One chapter exposure is not enough.

Plan:
- Add a content-checker report: for each word a chapter teaches, count how many times it appears in later exercises, readings and scenarios. List words that never reappear.
- Fix gaps by reusing those words in later chapters' exercises and sentences, not by adding new exercises.
- Varied contexts count more than repeats of the same sentence.
- Check all three courses. Latin should use macrons throughout.

## 20. Check reading difficulty against what has been learned (S, after item 15)

Why: reading research suggests learners understand a text well when they already know about 95 to 98 percent of its words.

Plan:
- When readings exist, the checker works out the share of known words in each text, based on the chapters before it, and flags any text below about 95 percent.
- Words the learner can guess from English or other Romance languages count as known only if the chapter has taught or flagged them.
- Treat the threshold as a guideline, not a hard rule.

---

# 5. Test on the phone first

## 6. Speaking practice (M, check first)

Problem: all practice is reading, typing and tapping.

Step 0, before building anything: test whether the browser's built-in speech recognition works on iPhone Safari with Spanish (es-ES). It is free, but not sure it is reliable. If it is flaky, drop this item.

Plan, if it works:
- Say a key phrase out loud, the app shows what it heard, and marks it with the same close-match rules as item 2.
- Spanish only. Browsers have no Latin voice, so Latin is out.
- Check where the audio goes (the browser may send it to Apple or Google) and tell Kara before it ships.

## 17. Typed dictation (M, test the voice first)

Why: hearing a sentence and typing it trains listening and spelling together, and it is active.

Step 0: test the browser's Spanish (Spain) voice on the iPhone and the PC. Voice quality varies, and a poor voice teaches poor listening. If it is bad, drop this item.

Plan, if the voice is fine:
- Play a sentence from a finished chapter, with a replay button and a slow replay. Kara types what she hears.
- Marking uses the item 2 rules: a one-letter slip is half a mark and an accent slip is a warning.
- Show the red pen on any difference.
- Spanish only. There is no Latin voice in browsers.
- Add the accent buttons from item 13.

---

# Done

## 1. Save my name against my email (S) - DONE 2 Nov 2026

Problem: adding a new language asks for my name again.

Plan:
- Add a small `profiles` table in D1: email, name, updated_at.
- The Worker reads the signed-in email from Cloudflare Access (verify the Access JWT, do not trust the plain header alone).
- On first sign-in the app asks for a name once. Every course, now and later, reads it from there.
- Name can be changed in Settings. It feeds the `{name}` token in chapter text.
- Migration: if a name already exists in current progress, copy it into the profile on first load.

## 2. Partial marks for small spelling slips (M) - DONE 2 Nov 2026

Problem: one wrong letter in a word gives a full fail.

Plan:
- Today `judge()` in logic.js returns ok, accent or no. Add a fourth result, `close`.
- `close` means the answer is one letter away from an accepted answer: one letter wrong, missing, extra, or two swapped.
- Rules to keep it honest:
  - Only for typed answers (translate, gap, fix). Never for multiple choice.
  - Only in the middle of a word. A slip in the last two letters is still a fail, because endings are the grammar (hablas vs habla, amat vs amant).
  - Only for words of 5 letters or more, and only one slip in the whole answer.
  - Never when the typo makes a different real word (pero and perro, ano and año, casa and caza). Check this against the other accepted answers for the exercise, and add a `strict: true` flag for exercises where the spelling is the point.
- Marking: half a mark, shown with the red pen on the wrong letter and the line "Nearly. Check the spelling of X".
- Review deck: a close answer does not move the card up a box, and does not drop it back either.
- Weak spots: log close answers under a separate "spelling" skill so they show up in drills.
- Tests: add cases to tests/unit.js for each rule above, in both Spanish and Latin (macrons stay optional in Latin).

Decided: half a mark counts towards both the chapter pass score and XP.

## 4. Show AI calls left today (S) - DONE 2 Nov 2026

Problem: the tutor stops working when the daily cap is hit (60 per person, 450 in total), with no warning.

Plan:
- The Worker already counts calls. Return the count with each AI reply, and add a small endpoint for the home screen.
- Show "12 tutor calls left today" near the tutor features. Plain text, no colour alarm.
- When the cap is hit, say so and say when it resets. The non-AI checks keep working.
