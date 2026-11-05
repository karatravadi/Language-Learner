// The course-language text a learner sees (Spanish, Latin): every field the app shows in that language, and so lets
// you tap for a meaning. English answers (translate "dir": "toEn", order "promptStyle": "target") and English
// scenario replies (course "scenarioReplies": "en") are left out.
// Used by the content checker (every word needs a glossary entry) and to list words still missing a gloss:
//   node tools/spanish-text.js            words missing from the glossary, with an example of where each appears
const fs = require('fs');
const path = require('path');

// A word (any letters, so Latin macrons count); letters straight after a slash are an ending (nosotros/as).
// Same pattern as WORD_RE in public/app.js.
const WORD = /(?<![\/\p{L}])\p{L}+/gu;
const key = w => w.toLowerCase();
const fill = s => String(s || '').replace(/\{name\}/g, '').replace(/\{o\}/g, 'o').replace(/___/g, ' ');

// Returns [{ text, where }] for one chapter.
function chapterSpanish(ch, course) {
  const englishReplies = !!course && course.scenarioReplies === 'en';
  const out = []; const add = (text, where) => { if (text) out.push({ text: fill(text), where: 'ch' + ch.n + ' ' + where }); };
  const d = ch.discover || {};
  (d.groups || []).forEach(g => (g.lines || []).forEach(l => add(l[0], 'discover')));
  (d.hooks || []).forEach(hk => (hk.rows || []).forEach(r => add(r[2], 'discover hook')));
  ((ch.learn || {}).blocks || []).forEach(b => {
    if (b.type === 'tables') b.tables.forEach(t => t.rows.forEach(([, f]) => add(f.replace(/·/g, ' '), 'table')));
    if (b.type === 'twist') { add(b.a[0], 'twist'); add(b.b[0], 'twist'); }
    if (b.type === 'list') b.rows.forEach(r => add(r[0], 'list'));
  });
  (ch.phrases || []).forEach(p => add(p.es, 'phrases'));
  (ch.exercises || []).forEach((e, i) => {
    const w = 'ex' + (i + 1) + ' ' + e.type;
    if (e.type === 'mc') add(e.q, w);
    // A gap can be a whole word or an ending (Puell___ sunt): check the sentence with the answer written in.
    if (e.type === 'gap') e.answer.forEach(a => add(e.q.replace('___', a), w));
    if (e.type === 'rapid') e.items.forEach(it => { add(it.blank ? it.full : it.text, w); });
    if (e.type === 'translate') { if (e.dir === 'toEn') add(e.q, w); else e.answer.forEach(a => add(a, w)); }
    if (e.type === 'listen') add(e.say, w);
    if (e.type === 'order') add(e.promptStyle === 'target' ? e.prompt : e.answer, w);
    if (e.type === 'fix') add(e.fixed, w);
    if (e.type === 'match') e.pairs.forEach(p => add(p[0], w));
  });
  const wr = ch.write || {}; add(wr.model, 'write');
  const b = ch.boss || {};
  (b.turns || []).forEach(t => { add(t.npc, 'scenario'); if (!englishReplies) (t.choices || []).forEach(c => add(c[0], 'scenario')); });
  add(b.closing, 'scenario'); add(b.chatOpening, 'scenario');
  return out;
}

function courseSpanish(dir, course) {
  const out = [];
  for (const f of course.chapters) out.push(...chapterSpanish(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), course));
  if (course.drills) JSON.parse(fs.readFileSync(path.join(dir, course.drills), 'utf8')).sentences.forEach((d, i) => d.answer.forEach(a => out.push({ text: fill(d.q.replace('___', a)), where: 'drill ' + (i + 1) })));
  if (course.words) JSON.parse(fs.readFileSync(path.join(dir, course.words), 'utf8')).forEach(w => { out.push({ text: w.es, where: 'word ' + w.id }); out.push({ text: w.ex.es, where: 'word ' + w.id }); });
  return out;
}

// Words in the course with no glossary entry: Map(word -> first place it appears).
function missing(dir, course, glossary) {
  const have = new Set(Object.keys((glossary && glossary.words) || {}));
  const miss = new Map();
  for (const { text, where } of courseSpanish(dir, course)) for (const m of text.match(WORD) || []) { const k = key(m); if (!have.has(k) && !miss.has(k)) miss.set(k, where + ': ' + text.slice(0, 60)); }
  return miss;
}

module.exports = { WORD, key, chapterSpanish, courseSpanish, missing };

if (require.main === module) {
  const root = path.join(__dirname, '..', 'public', 'courses');
  for (const entry of JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8')).courses) {
    const file = path.join(root, entry.file); const dir = path.dirname(file); const course = JSON.parse(fs.readFileSync(file, 'utf8'));
    const gfile = course.glossary && path.join(dir, course.glossary);
    const g = gfile && fs.existsSync(gfile) ? JSON.parse(fs.readFileSync(gfile, 'utf8')) : null;
    const m = missing(dir, course, g);
    console.log(course.id + ': ' + m.size + ' words without a gloss');
    for (const [w, where] of m) console.log('  ' + w + '  (' + where + ')');
  }
}
