# Stilus backlog

Last updated 3 Nov 2026. Newest at the bottom. Sizes: S under an hour of work, M a session, L several sessions.

## 1. Save my name against my email (S) - DONE 2 Nov 2026
Problem: adding a new language asks for my name again.

Plan:
- Add a small `profiles` table in D1: email, name, updated_at.
- The Worker reads the signed-in email from Cloudflare Access (verify the Access JWT, do not trust the plain header alone).
- On first sign-in the app asks for a name once. Every course, now and later, reads it from there.
- Name can be changed in Settings. It feeds the `{name}` token in chapter text.
- Migration: if a name already exists in current progress, copy it into the profile on first load.

Answer: it was stored per course, inside each course's progress (S.name), so a new course started blank.

## 2. Partial marks for small spelling slips (M) - DONE 2 Nov 2026
Problem: one wrong letter in a word gives a full fail.

Plan:
- Today `judge()` in logic.js returns ok, accent or no. Add a fourth result, `close`.
- `close` means the answer is one letter away from an accepted answer: one letter wrong, missing, extra, or two swapped.
- Rules to keep it honest:
  - Only for typed answers (translate, gap, fix). Never for multiple choice.
  - Only in the middle of a word. A slip in the last two letters is still a fail, because endings are the grammar
    (hablas vs habla, amat vs amant).
  - Only for words of 5 letters or more, and only one slip in the whole answer.
  - Never when the typo makes a different real word (pero and perro, ano and año, casa and caza). Check this against
    the other accepted answers for the exercise, and add a `strict: true` flag for exercises where the spelling is the point.
- Marking: half a mark, shown with the red pen on the wrong letter and the line "Nearly. Check the spelling of X".
- Review deck: a close answer does not move the card up a box, and does not drop it back either.
- Weak spots: log close answers under a separate "spelling" skill so they show up in drills.
- Tests: add cases to tests/unit.js for each rule above, in both Spanish and Latin (macrons stay optional in Latin).

Decided: half a mark counts towards both the chapter pass score and XP.

## 3. Say why an answer is wrong (M) - DONE 4 Nov 2026 (hints from the chapters' tables; "Four ways to say you" in Spanish chapter 1)
Problem: the app says an answer is wrong but not why, which is hard for a complete beginner.

Plan:
- Add an optional `why` note to exercises, shown after a wrong answer in plain English. Example: "vives goes with tú.
  For usted, use vive".
- Only use grammar words the chapter has already taught.
- Start with the known gaps: ustedes as the formal plural, usted vs tú, and verb endings.
- Written by AI, so flag anything uncertain for checking. Latin notes get checked against Whitaker's Words or Wheelock.
- This is the first step on the open "clearer explanations for absolute beginners" item in HANDOVER.md.

## 4. Show AI calls left today (S) - DONE 2 Nov 2026
Problem: the tutor stops working when the daily cap is hit (60 per person, 450 in total), with no warning.

Plan:
- The Worker already counts calls. Return the count with each AI reply, and add a small endpoint for the home screen.
- Show "12 tutor calls left today" near the tutor features. Plain text, no colour alarm.
- When the cap is hit, say so and say when it resets. The non-AI checks keep working.

## 5. Spot the mistakes in a short paragraph (M)
Problem: drills get repetitive, and passive formats are easy to lose focus on.

Plan:
- New exercise type, a cousin of `fix`: a 3 to 4 line paragraph with 2 or 3 errors. Tap the words you think are wrong,
  then fix them.
- Red-pen marks on the wrong words after checking, as in `fix`.
- Errors drawn from what the chapter has taught. Add a `skill` to each so weak-spot drills pick them up.
- Start with 1 per chapter from chapter 5 onwards, then see how it feels.

## 6. Speaking practice (M, check first)
Problem: all practice is reading, typing and tapping.

Step 0, before building anything: test whether the browser's built-in speech recognition works on iPhone Safari with
Spanish (es-ES). It is free, but not sure it is reliable. If it is flaky, drop this item.

Plan, if it works:
- Say a key phrase out loud, the app shows what it heard, and marks it with the same close-match rules as item 2.
- Spanish only. Browsers have no Latin voice, so Latin is out.
- Check where the audio goes (the browser may send it to Apple or Google) and say so in the app before it ships.

# Bugs (found 3 Nov 2026)

## 7. The most recently clicked chapter hides its saved score and ticks (S) - FIXED 4 Nov 2026
Seen: chapter 1 shows a tick on the course list, but its button says "Carry on". Clicking it resets the chapter's
progress in the left-hand Today checklist and the score from the first run is no longer shown. The Today plan also lists
"Carry on: chapter 1" after the chapter was finished.

Plan:
- Treat a finished chapter as finished for good. Keep the completed flag, the first score and the best score.
- Reopening starts a fresh practice run that is stored separately. It never overwrites the first score or clears today's ticks.
- Change the button on finished chapters from "Carry on" to "Practise again", and show the score next to it.
- The Today plan should not suggest a chapter that is already finished.
- Check the same for Latin and French, and check the synced D1 copy as well as the local one.
- Test: finish a chapter, reopen it, quit halfway, and confirm the score, tick and Today checklist are unchanged.

Confirmed: it happens the moment the chapter is reopened, before any answer is given. Update the same evening:
after opening the next chapter, chapter 1 goes back to showing the original score. So the score is probably not lost. It
looks like the app treats the reopened chapter as the "current" one and hides its saved result and ticks until another
chapter becomes current. That makes it a display and state bug, not data loss. Confirmed: the percentage shows
for every chapter except the most recently clicked one. So the fix is in how the course list and Today plan render the
"last clicked" chapter: it should show its saved score and ticks like any other. First check that the first score is
still in D1 while the chapter is reopened.

## 8. Rapid fire ends with Finish and Continue, and Finish goes nowhere (S) - FIXED 4 Nov 2026
Seen: after the last rapid fire question (score "7 of 8") two buttons show. Finish does nothing visible.

Plan:
- Show one button after the final question. Keep Continue, remove Finish.
- If Finish was meant to end a round early, give it a real destination or take it out.
- Check the other exercise types that end a block for the same duplicate.

## 9. "Careful" appears twice in warning notes (S) - FIXED 4 Nov 2026
Seen: in chapter 1 the note has the label "Careful" and the text starts with "Careful:" again (about sleepy, hungry,
thirsty and age using tener).

Plan:
- Remove the leading "Careful:" from the text. The label already says it.
- Search all chapters (Spanish, French, Latin) for notes whose text starts with the same word as their label
  (Careful, Tip, Spain, Culture) and fix them.
- Add a rule to the content checker so a note that repeats its own label is rejected from now on.

## 10. Discover boxes are titled by colour, not by meaning (S) - FIXED 4 Nov 2026
Seen: the first page of a chapter ("Work it out") shows two coloured boxes headed "Blue" and "Orange". In chapter 2 they
should say what the group is, for example "I" and "we". It looks like every chapter.

Plan:
- Give each box a title that says what its examples have in common, in plain English. Chapter 2: "One person (I)" and
  "A group (we)". Chapter 1: ser and estar.
- The colour stays as decoration, matching the colour coding used later in the chapter. It never carries the meaning on its own.
- Add a `label` field to each group in the chapter JSON, and make the content checker reject a group with no label or a
  label that is only a colour name. Fix all Spanish, French and Latin chapters in one pass.
- Accessibility: colour-only headings fail for colour-blind users, so this also fixes that.

## 11. Save a whole verb, with its conjugation, to My words (M)
Problem: tapping a verb saves one form (for example "vivo"), so learning a verb means saving six forms by hand.

Plan:
- When the tapped word is a verb, offer "Save verb" next to the normal save. It saves the infinitive (vivir) with the
  full present-tense table: yo, tú, él/ella/usted, nosotros, vosotros, ellos/ellas/ustedes. European Spanish, so vosotros
  is always included.
- One card per verb in My words, showing the table. Not six separate cards.
- Review: the card asks for one form at a time, picked at random ("vosotros, vivir"), which suits active practice over
  reading a table. Missing a form keeps the whole verb due sooner.
- Source of the tables: ship them in the content, not from live AI calls, so it costs no tutor calls and works offline.
  Mark irregular verbs (ser, estar, tener, ir, hacer) and have each table checked, since the content is AI-written.
- Later tenses: when the past tense chapter arrives, the same card gains a tense switch.
- Latin and French: same idea, with Latin showing the verb's endings by person and macrons throughout. Do Spanish first.

Open question: should review ask for one form at a time (recommended) or the whole table at once?

## 12. Starting a new chapter erases progress in an unfinished one (M, fix first) - FIXED 4 Nov 2026
Seen: halfway through chapter 2, opening chapter 3 lost the chapter 2 progress.

Likely cause, to verify: this probably shares a root cause with item 7. The app seems to keep one "current chapter"
slot, so opening any chapter overwrites whatever the last one held. In item 7 only the display was affected. Here the
half-finished position may really be lost, which is worse. Fix both together.

Plan:
- Store progress per chapter, keyed by chapter id: step reached, answers so far and score so far. Opening a chapter must
  never write to another chapter's record.
- Save after every exercise, locally and to D1, so a closed tab or a crash loses at most one answer.
- A chapter that is part-done shows "Resume" and where you are (for example "exercise 6 of 15"), not "Carry on" with no position.
- Cover all three courses.
- Test: get halfway through chapter 2, open chapter 3, leave it, go back to chapter 2, and confirm it resumes at the
  same exercise with the same score. Repeat after a page reload and on a second device.

Confirmed: going back to chapter 2 started it again from the very first step, so the position really is lost,
not just hidden. Still to check: whether the answers and score from the first attempt were also dropped or only the position.

# Done outside the numbered list
- Phone polish (HANDOVER Step 5), 4 Nov 2026: Add to Home Screen icon and manifest, lessons offline (sw.js),
  layout checked at 360, 390 and 430px (the course switch no longer pushes the settings button off a small phone).
