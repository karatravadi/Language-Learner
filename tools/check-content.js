#!/usr/bin/env node
/* Content checker: validates every course, chapter and word file before you use them.
   Run:  node tools/check-content.js        (exit code 1 if anything is wrong)
   It catches the mistakes that are easy to make when writing chapters by hand:
   answers that are not in the options, word tiles that don't build the answer,
   duplicate review-card ids, boss turns without exactly one right reply, unknown skills. */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../public/logic.js');

const PUBLIC = path.join(__dirname, '..', 'public');
const COURSES = path.join(PUBLIC, 'courses');
const TONES = new Set(['blue', 'orange', 'green']);
const NOTE_KINDS = new Set(['tip', 'spain', 'warn', 'culture', 'roots']);
const COLOUR_WORD = /\b(blue|orange|green|red|purple|yellow)\b/i;
// The label the app puts on each kind of note (NOTE_LABEL in app.js). The text must not start with it again.
const NOTE_REPEAT = { warn: /^careful\b/i, tip: /^tip\b/i, spain: /^in spain\s*[:,.]/i, culture: /^culture\b/i, roots: /^roots?\b/i };
const TOKEN = /\{(?!name\}|o\})[^}]*\}/; // only {name} and {o} are allowed

function check(dir = COURSES) {
  const errors = [];
  const warnings = [];
  const where = [];
  const err = msg => errors.push(where.join(' › ') + ': ' + msg);
  const warn = msg => warnings.push(where.join(' › ') + ': ' + msg);
  const isStr = v => typeof v === 'string' && v.trim().length > 0;
  const pair = v => Array.isArray(v) && v.length === 2 && v.every(isStr);
  const readJson = file => {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { err('cannot read ' + path.relative(PUBLIC, file) + ' (' + e.message + ')'); return null; }
  };
  function tokens(obj) {
    const walk = v => {
      if (typeof v === 'string') { if (TOKEN.test(v)) err('unknown {token} in "' + v + '"'); }
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(obj);
  }

  const index = readJson(path.join(dir, 'index.json'));
  if (!index) return { errors, warnings };
  if (!Array.isArray(index.courses) || !index.courses.length) err('index.json has no courses');
  const courseIds = new Set();

  for (const entry of index.courses || []) {
    where.length = 0; where.push('course ' + entry.id);
    if (courseIds.has(entry.id)) err('duplicate course id');
    if (!isStr(entry.label)) err('index.json entry needs a short label for the course switch');
    courseIds.add(entry.id);
    const course = readJson(path.join(dir, entry.file));
    if (!course) continue;
    if (course.id !== entry.id) err('course.json id "' + course.id + '" does not match index.json');
    for (const k of ['title', 'level', 'lang', 'storageKey', 'tutor', 'words']) if (!isStr(course[k])) err('missing ' + k);
    if (!Array.isArray(course.voice) || !course.voice.length) err('voice must be a list of patterns');
    if (course.goalMins != null && typeof course.goalMins !== 'number') err('goalMins must be a number');
    if (course.plan != null && (typeof course.plan !== 'object' || Object.values(course.plan).some(v => typeof v !== 'number'))) err('plan must give minutes as numbers: {word, review, practise}');
    if (course.ui && course.ui.praise && (!Array.isArray(course.ui.praise) || !course.ui.praise.length)) err('ui.praise must be a list');
    if (course.scenarioReplies != null && course.scenarioReplies !== 'en') err('scenarioReplies can only be "en" (scenario replies in English); leave it out for replies in the course language');
    const base = path.dirname(path.join(dir, entry.file));
    const skillNames = Object.assign({}, course.skills || {});
    const cardIds = new Set();
    const nums = new Set();
    const usedSkills = [];

    // ---- words ----
    where.push('words');
    const words = readJson(path.join(base, course.words)) || [];
    const wordIds = new Set();
    words.forEach((w, i) => {
      where.push('#' + (i + 1) + ' ' + (w && w.id));
      for (const k of ['id', 'es', 'en', 'pos', 'q', 'starter']) if (!isStr(w[k])) err('missing ' + k);
      if (!w.ex || !isStr(w.ex.es) || !isStr(w.ex.en)) err('example needs es and en');
      if (!Array.isArray(w.forms) || !w.forms.length) err('forms must list at least one form');
      else if (w.ex && !L.usedWord(w.ex.es, w.forms)) warn('the example sentence does not contain any of its forms');
      if (wordIds.has(w.id)) err('duplicate word id');
      wordIds.add(w.id);
      if (cardIds.has('w-' + w.id)) err('review card id clash');
      cardIds.add('w-' + w.id);
      where.pop();
    });
    where.pop();

    // ---- chapters ----
    for (const file of course.chapters || []) {
      where.length = 1; where.push(file);
      const ch = readJson(path.join(base, file));
      if (!ch) continue;
      tokens(ch);
      if (!Number.isInteger(ch.n) || ch.n < 1) err('n must be a positive whole number');
      if (nums.has(ch.n)) err('duplicate chapter number ' + ch.n);
      nums.add(ch.n);
      for (const k of ['title', 'sub', 'can', 'doneText']) if (!isStr(ch[k])) err('missing ' + k);
      if (typeof ch.mins !== 'number') err('mins must be a number');
      Object.assign(skillNames, ch.skills || {});

      // discover
      where.push('discover');
      const d = ch.discover || {};
      if (!isStr(d.intro) || !isStr(d.question) || !isStr(d.reveal) || !isStr(d.nudge)) err('needs intro, question, nudge and reveal');
      if (!Array.isArray(d.groups) || d.groups.length < 1) err('needs at least one group');
      (d.groups || []).forEach(g => {
        if (!isStr(g.label)) err('group needs a label');
        // The label says what the examples share. The colour is decoration and never the meaning on its own.
        else if (COLOUR_WORD.test(g.label)) err('group label "' + g.label + '" names a colour: say what the examples have in common instead (e.g. "With ser")');
        if (g.tone && !TONES.has(g.tone)) err('unknown tone ' + g.tone);
        if (!Array.isArray(g.lines) || !g.lines.length || !g.lines.every(pair)) err('group "' + g.label + '" lines must be [spanish, english] pairs');
      });
      optionsCheck(d.options, d.answer, 'discover');
      (d.hooks || []).forEach(hk => {
        if (!isStr(hk.title)) err('hook needs a title');
        if (hk.tone && !TONES.has(hk.tone)) err('unknown tone ' + hk.tone);
        if (!Array.isArray(hk.rows) || !hk.rows.every(r => Array.isArray(r) && r.length === 4 && r.every(isStr))) err('hook "' + hk.title + '" rows must be [badge, label, spanish, english]');
      });
      where.pop();

      // learn
      where.push('learn');
      const l = ch.learn || {};
      if (!isStr(l.title)) err('needs a title');
      if (!Array.isArray(l.blocks) || !l.blocks.length) err('needs blocks');
      (l.blocks || []).forEach((b, i) => {
        where.push('block ' + (i + 1));
        if (b.type === 'tables') {
          if (!Array.isArray(b.tables) || !b.tables.length || b.tables.length > 3) err('1 to 3 tables');
          (b.tables || []).forEach(t => {
            if (!isStr(t.title)) err('table needs a title');
            if (t.tone && !TONES.has(t.tone)) err('unknown tone ' + t.tone);
            if (t.speak && !['form', 'both'].includes(t.speak)) err('speak must be form or both');
            if (!Array.isArray(t.rows) || !t.rows.length || !t.rows.every(pair)) err('table "' + t.title + '" rows must be pairs');
          });
        } else if (b.type === 'note') {
          if (!NOTE_KINDS.has(b.kind)) err('note kind must be one of ' + [...NOTE_KINDS].join(', '));
          if (!isStr(b.text)) err('note needs text');
          else if (NOTE_REPEAT[b.kind] && NOTE_REPEAT[b.kind].test(b.text)) err('note text repeats its own label ("' + b.text.slice(0, 24) + '…"): the label already says it');
        } else if (b.type === 'twist') {
          if (!isStr(b.title) || !pair(b.a) || !pair(b.b) || !isStr(b.note)) err('twist needs title, a, b and note');
        } else if (b.type === 'list') {
          if (!isStr(b.title) || !Array.isArray(b.rows) || !b.rows.every(pair)) err('list needs a title and [spanish, english] rows');
        } else err('unknown block type ' + b.type);
        where.pop();
      });
      where.pop();

      // phrases
      where.push('phrases');
      if (!Array.isArray(ch.phrases) || ch.phrases.length < 4) err('at least 4 phrases');
      (ch.phrases || []).forEach(p => {
        if (!isStr(p.id) || !isStr(p.es) || !isStr(p.en)) err('phrase needs id, es and en');
        if (cardIds.has(p.id)) err('duplicate review card id ' + p.id);
        cardIds.add(p.id);
        if (p.alts && !Array.isArray(p.alts)) err(p.id + ': alts must be a list');
      });
      where.pop();

      // exercises
      (ch.exercises || []).forEach((e, i) => {
        where.push('exercise ' + (i + 1) + ' (' + e.type + ')');
        if (!isStr(e.skill)) err('missing skill'); else usedSkills.push([where.slice(), e.skill]);
        // strict: true turns off half marks for spelling slips, for exercises where the spelling is the point
        if ('strict' in e && (typeof e.strict !== 'boolean' || !['gap', 'translate'].includes(e.type))) err('strict must be true or false, on gap or translate only');
        switch (e.type) {
          case 'mc':
            if (typeof e.q !== 'string') err('q must be a string (can be empty with a prompt)');
            if (!isStr(e.q) && !isStr(e.prompt)) err('needs a q or a prompt');
            optionsCheck(e.options, e.answer, 'mc'); need(e, 'why'); break;
          case 'listen':
            need(e, 'say'); optionsCheck(e.options, e.answer, 'listen'); need(e, 'why'); break;
          case 'gap':
            if (!isStr(e.q) || e.q.split('___').length !== 2) err('q needs exactly one ___');
            answers(e.answer); need(e, 'why');
            if (e.hintTone && !TONES.has(e.hintTone)) err('unknown hintTone');
            break;
          case 'translate':
            need(e, 'q'); answers(e.answer); need(e, 'why');
            if (e.dir != null && e.dir !== 'toEn') err('dir can only be "toEn" (translate into English); leave it out for into the course language');
            (e.answer || []).forEach(a => { if (/[¿?¡!.,]/.test(a)) warn('answer "' + a + '" has punctuation (ignored when checking, but keep answers plain)'); });
            // who: one label per answer (tú, usted, said by a woman…), shown in the feedback; "" for none
            if (e.who !== undefined && (!Array.isArray(e.who) || e.who.length !== (e.answer || []).length || e.who.some(x => typeof x !== 'string'))) err('"who" needs one label (or "") per answer');
            break;
          case 'order': {
            need(e, 'prompt'); need(e, 'answer');
            if (!Array.isArray(e.words) || e.words.length < 2) err('needs at least 2 word tiles');
            else if (L.judge(e.words.join(' '), [e.answer]) !== 'ok') err('tiles in the given order do not build the answer "' + e.answer + '"');
            if (e.promptStyle != null && e.promptStyle !== 'target') err('promptStyle can only be "target" (prompt in the course language, build the English)');
            if (e.alts != null && (!Array.isArray(e.alts) || !e.alts.every(isStr))) err('alts must be a list of other right answers');
            break;
          }
          case 'fix': {
            const toks = String(e.sentence || '').split(' ');
            if (!isStr(e.sentence)) err('needs a sentence');
            if (!Number.isInteger(e.wrong) || e.wrong < 0 || e.wrong >= toks.length) err('wrong must point at a word in the sentence');
            need(e, 'fixed'); need(e, 'why');
            if (isStr(e.fixed) && L.judge(e.fixed, [e.sentence]) === 'ok') err('fixed sentence is the same as the wrong one');
            break;
          }
          case 'match': {
            if (!Array.isArray(e.pairs) || e.pairs.length < 3 || !e.pairs.every(pair)) err('needs at least 3 [left, right] pairs');
            const l2 = (e.pairs || []).map(p => p[0]); const r2 = (e.pairs || []).map(p => p[1]);
            if (new Set(l2).size !== l2.length || new Set(r2).size !== r2.length) err('match sides must not repeat');
            break;
          }
          case 'rapid': {
            const keys = new Set((e.choices || []).map(c => c.key));
            if (!Array.isArray(e.choices) || e.choices.length < 2 || e.choices.length > 4) err('2 to 4 choices');
            (e.choices || []).forEach(c => { if (!isStr(c.key) || !isStr(c.label)) err('choice needs key and label'); if (c.tone && !TONES.has(c.tone)) err('unknown tone'); });
            if (!Array.isArray(e.items) || e.items.length < 4) err('at least 4 items');
            (e.items || []).forEach((it, j) => {
              if (!keys.has(it.answer)) err('item ' + (j + 1) + ' answer "' + it.answer + '" is not one of the choices');
              if (!isStr(it.blank) && !isStr(it.text)) err('item ' + (j + 1) + ' needs blank or text');
              if (isStr(it.blank) && it.blank.split('___').length !== 2) err('item ' + (j + 1) + ' blank needs exactly one ___');
              if (isStr(it.blank) && !isStr(it.fill)) err('item ' + (j + 1) + ' needs fill (the word shown in the gap)');
              if (!isStr(it.full) || !isStr(it.why)) err('item ' + (j + 1) + ' needs full and why');
              if (isStr(it.skill)) usedSkills.push([where.concat('item ' + (j + 1)), it.skill]);
            });
            break;
          }
          default: err('unknown exercise type');
        }
        where.pop();
      });
      if ((ch.exercises || []).length < 10) { where.push('exercises'); warn('fewer than 10 exercises'); where.pop(); }

      // write
      where.push('write');
      const w = ch.write || {};
      for (const k of ['title', 'task', 'starter', 'model']) if (!isStr(w[k])) err('missing ' + k);
      if (!Array.isArray(w.checklist) || !w.checklist.length) err('needs a checklist');
      where.pop();

      // boss
      where.push('boss');
      const b = ch.boss || {};
      for (const k of ['title', 'who', 'persona', 'closing', 'closingEn', 'chatOpening', 'chatOpeningEn', 'skill']) if (!isStr(b[k])) err('missing ' + k);
      if (isStr(b.skill)) usedSkills.push([where.slice(), b.skill]);
      if (!Array.isArray(b.turns) || b.turns.length < 2) err('at least 2 turns');
      (b.turns || []).forEach((t, j) => {
        if (!isStr(t.npc) || !isStr(t.en)) err('turn ' + (j + 1) + ' needs npc and en');
        if (!Array.isArray(t.choices) || t.choices.length < 2) err('turn ' + (j + 1) + ' needs choices');
        const right = (t.choices || []).filter(c => c[1] === true).length;
        if (right !== 1) err('turn ' + (j + 1) + ' must have exactly one right reply (has ' + right + ')');
        (t.choices || []).forEach(c => { if (c[1] === false && !isStr(c[2])) err('turn ' + (j + 1) + ': wrong reply "' + c[0] + '" needs a reason'); });
        if (isStr(t.skill)) usedSkills.push([where.concat('turn ' + (j + 1)), t.skill]);
      });
      where.pop();
    }

    // roadmap
    where.length = 1; where.push('roadmap');
    (course.roadmap || []).forEach(r => {
      if (nums.has(r.n)) err('chapter ' + r.n + ' is built, so remove it from the roadmap');
      if (!Number.isInteger(r.n) || !isStr(r.title) || !isStr(r.can)) err('roadmap entries need n, title and can');
    });

    // skills used must have names
    for (const [w2, s] of usedSkills) if (!skillNames[s]) errors.push(w2.join(' › ') + ': skill "' + s + '" has no name in the chapter or course skills');
  }

  function need(e, k) { if (!isStr(e[k])) err('missing ' + k); }
  function answers(a) { if (!Array.isArray(a) || !a.length || !a.every(isStr)) err('answer must be a non-empty list of strings'); }
  function optionsCheck(opts, ans, label) {
    if (!Array.isArray(opts) || opts.length < 2 || !opts.every(isStr)) err(label + ' needs at least 2 options');
    else if (!Number.isInteger(ans) || ans < 0 || ans >= opts.length) err(label + ' answer index is outside the options');
    else if (new Set(opts).size !== opts.length) err(label + ' options repeat');
  }

  // Glossary: every word a course shows in its language must have a meaning, so tapping a word always answers.
  for (const entry of (index.courses || [])) {
    const file = path.join(dir, entry.file); const course = readJson(file);
    if (!course || !course.glossary) continue;
    const g = readJson(path.join(path.dirname(file), course.glossary));
    if (!g || !g.words) { errors.push(course.id + ': glossary ' + course.glossary + ' is missing or has no "words"'); continue; }
    for (const [w, v] of Object.entries(g.words)) if (!Array.isArray(v) || !v.length || v.length > 2 || v.some(x => typeof x !== 'string' || !x)) errors.push(course.id + ' › glossary › ' + w + ': must be [meaning] or [meaning, note]');
    for (const [w, where] of require('./spanish-text.js').missing(path.dirname(file), course, g)) errors.push(course.id + ' › glossary: no meaning for "' + w + '" (' + where + ')');
  }
  return { errors, warnings };
}

if (require.main === module) {
  const { errors, warnings } = check();
  warnings.forEach(w => console.log('  warning  ' + w));
  errors.forEach(e => console.log('  ERROR    ' + e));
  console.log(errors.length ? '\n' + errors.length + ' error(s). Fix these before using the content.' : '\nContent OK' + (warnings.length ? ' (' + warnings.length + ' warning(s))' : '') + '.');
  process.exit(errors.length ? 1 : 0);
}
module.exports = { check };
