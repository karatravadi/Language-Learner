# Stilus backlog

Last updated 2 Nov 2026. Newest at the bottom. Sizes: S under an hour of work, M a session, L several sessions.

## 1. Save my name against my email (S)
Done and deployed 2 Nov 2026.
Problem: adding a new language asks for my name again.

Plan:
- Add a small `profiles` table in D1: email, name, updated_at.
- The Worker reads the signed-in email from Cloudflare Access (verify the Access JWT, do not trust the plain header alone).
- On first sign-in the app asks for a name once. Every course, now and later, reads it from there.
- Name can be changed in Settings. It feeds the `{name}` token in chapter text.
- Migration: if a name already exists in current progress, copy it into the profile on first load.

Answer: it was stored per course, inside each course's progress (S.name), so a new course started blank.

## 2. Partial marks for small spelling slips (M)
Done and deployed 2 Nov 2026.
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

## 3. Say why an answer is wrong (M)
Problem: the app says an answer is wrong but not why, which is hard for a complete beginner.

Plan:
- Add an optional `why` note to exercises, shown after a wrong answer in plain English. Example: "vives goes with tú.
  For usted, use vive".
- Only use grammar words the chapter has already taught.
- Start with the known gaps: ustedes as the formal plural, usted vs tú, and verb endings.
- Written by AI, so flag anything uncertain for Kara to check. Latin notes get checked against Whitaker's Words or Wheelock.
- This is the first step on the open "clearer explanations for absolute beginners" item in HANDOVER.md.

## 4. Show AI calls left today (S)
Done and deployed 2 Nov 2026.
Problem: the tutor stops working when the daily cap is hit (60 per person, 450 in total), with no warning.

Plan:
- The Worker already counts calls. Return the count with each AI reply, and add a small endpoint for the home screen.
- Show "12 tutor calls left today" near the tutor features. Plain text, no colour alarm.
- When the cap is hit, say so and say when it resets. The non-AI checks keep working.

## 5. Spot the mistakes in a short paragraph (M)
Problem: drills get repetitive, and Kara loses focus on passive formats.

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
- Check where the audio goes (the browser may send it to Apple or Google) and tell Kara before it ships.
