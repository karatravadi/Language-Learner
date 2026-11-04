// How many words in each saved Spanish passage have no entry in the course glossary.
// Run from the repo root after scripts/process.py:  node data/hf/scripts/glossary-gaps.js
// Writes data/hf/out/spanish_glossary_gaps.json (not committed) and prints a summary.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', '..');
const WORD = /(?<![\/\p{L}])\p{L}+/gu;           // same pattern as tools/spanish-text.js
const have = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'public/courses/es-ES/glossary.json'), 'utf8')).words));
const src = path.join(__dirname, '..', 'out', 'spanish_a2_b1_20-80.jsonl');
const rows = fs.readFileSync(src, 'utf8').trim().split('\n').map(JSON.parse);

const all = new Map();                             // missing word -> passages it appears in
const per = rows.map((r, i) => {
  const words = (r.text.match(WORD) || []).map(w => w.toLowerCase());
  const miss = [...new Set(words.filter(w => !have.has(w)))];
  miss.forEach(w => all.set(w, (all.get(w) || 0) + 1));
  return { i, level: r.level, words: r.words, distinct: new Set(words).size, missing: miss.length, share: miss.length / new Set(words).size, missingWords: miss };
});
const byCost = [...per].sort((a, b) => a.missing - b.missing || a.words - b.words);
const pick = byCost.filter(p => p.level === 'A2').slice(0, 20);
const pickMiss = new Set(pick.flatMap(p => p.missingWords));
const q = (a, f) => { const s = a.map(f).sort((x, y) => x - y); return [s[0], s[Math.floor(s.length / 2)], s[s.length - 1]]; };

console.log(`Glossary: ${have.size} words. Passages: ${rows.length} (A2 ${per.filter(p => p.level === 'A2').length}, B1 ${per.filter(p => p.level === 'B1').length}).`);
for (const lv of ['A2', 'B1']) {
  const s = per.filter(p => p.level === lv);
  const [lo, med, hi] = q(s, p => p.missing); const [, shareMed] = q(s, p => p.share);
  console.log(`${lv}: missing words per passage min ${lo}, median ${med}, max ${hi}; median share of a passage's words missing ${(shareMed * 100).toFixed(0)}%.`);
}
console.log(`Distinct missing words across all passages: ${all.size}. Seen in 3+ passages: ${[...all.values()].filter(n => n >= 3).length}.`);
console.log(`The 20 easiest A2 passages need ${pickMiss.size} new glossary entries (per passage ${q(pick, p => p.missing).join(' / ')} min/median/max).`);
fs.writeFileSync(path.join(__dirname, '..', 'out', 'spanish_glossary_gaps.json'),
  JSON.stringify({ glossaryWords: have.size, easiestA2: pick.map(p => p.i), newEntriesForEasiestA2: [...pickMiss].sort(), passages: per }, null, 1));
