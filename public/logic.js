/* Pure logic (no DOM) so it can be unit-tested in Node and reused in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Logic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY = 86400000;
  const PRON = new Set(['yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes']);

  // Keep ñ distinct from n when removing accents (año is not ano).
  // French œ and æ count as oe and ae, so "soeur" is right apart from the ligature (an accent slip, like é for e).
  const stripAcc = s => String(s).replace(/ñ/g, '\u0001').replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
  // An apostrophe inside a word is kept, and a curly one (what an iPhone types) is the same as a straight one,
  // so j’ai and j'ai match. Apostrophes at the edge of a word are quote marks and are dropped.
  const clean = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[¿?¡!.,;:"“”«»()…]/g, ' ')
    .replace(/(^|\s)'+/g, ' ').replace(/'+(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  function dropPron(s) {
    const w = s.split(' ');
    if (w.length > 1 && PRON.has(w[0])) w.shift();
    return w.join(' ');
  }
  const norm = s => dropPron(clean(s));

  // English answers (Latin → English translation): contractions and articles don't matter,
  // because Latin has no "the" or "a" and "I'm" is as good as "I am".
  const CONTRACT = [[/\b(can)['’]t\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon['’]t\b/g, 'will not'], [/n['’]t\b/g, ' not'],
    [/\bi['’]m\b/g, 'i am'], [/['’]re\b/g, ' are'], [/\b(he|she|it|that|there|what|who)['’]s\b/g, '$1 is'], [/['’]ve\b/g, ' have'], [/['’]ll\b/g, ' will']];
  function english(s) {
    let t = String(s).toLowerCase();
    CONTRACT.forEach(([re, rep]) => { t = t.replace(re, rep); });
    return clean(t).split(' ').filter(w => w !== 'the' && w !== 'a' && w !== 'an').join(' ');
  }

  // 'ok' exact, 'accent' = right apart from accents, 'close' = one small spelling slip (see nearMiss), 'no' = wrong.
  // opts.english: compare as English (see above). opts.marksOptional: accents and macrons never count (Latin).
  // opts.close: allow 'close' (typed answers only); opts.strict: never (spelling is the point); opts.known: real words.
  function judge(input, answers, opts) {
    opts = opts || {};
    const r = judgeRaw(input, answers, opts);
    if (r === 'accent' && opts.marksOptional) return 'ok';
    if (r === 'no' && opts.close && !opts.strict && nearMiss(input, answers, opts)) return 'close';
    return r;
  }

  // One letter wrong, missing, extra, or two letters swapped (Damerau distance 1).
  function oneEdit(a, b) {
    if (a === b) return false;
    const la = a.length; const lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) {
      if (a.slice(i + 1) === b.slice(i + 1)) return true; // one letter wrong
      return i + 1 < la && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // swapped
    }
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1); // extra / missing
  }
  // A small spelling slip that still earns half a mark. All of these must hold:
  // - the answer matches an accepted one word for word, except for one word with one slip;
  // - that word has 5 or more letters, and its first letter and last two letters are right
  //   (endings are the grammar: hablas vs habla, amat vs amant);
  // - what was typed is not itself a real word (pero / perro): not a word of any accepted answer, nor in opts.known.
  // Returns { answer, typed, right } for the accepted answer it nearly matched, or null.
  function nearMiss(input, answers, opts) {
    opts = opts || {};
    if (opts.strict) return null;
    const raw = (Array.isArray(answers) ? answers : [answers]);
    const prep = opts.english ? english : (opts.marksOptional ? s => stripAcc(norm(s)) : norm);
    const words = s => prep(s).split(' ').filter(Boolean);
    const flat = w => stripAcc(w);
    const got = words(input);
    if (!got.length) return null;
    const real = new Set();
    raw.forEach(a => words(a).forEach(w => real.add(flat(w))));
    if (opts.known) for (const w of opts.known) real.add(flat(String(w).toLowerCase()));
    for (const a of raw) {
      const want = words(a);
      if (want.length !== got.length) continue;
      const diff = [];
      for (let k = 0; k < want.length; k++) if (want[k] !== got[k]) diff.push(k);
      if (diff.length !== 1) continue;
      const right = want[diff[0]]; const typed = got[diff[0]];
      const R = Array.from(right); const Y = Array.from(typed);
      if (R.length < 5 || Y.length < 4) continue;
      if (R[0] !== Y[0] || R.slice(-2).join('') !== Y.slice(-2).join('')) continue;
      if (!oneEdit(Y.slice(1, -2).join(''), R.slice(1, -2).join(''))) continue;
      if (real.has(flat(typed))) continue;
      return { answer: a, typed, right };
    }
    return null;
  }
  function judgeRaw(input, answers, opts) {
    const raw = (Array.isArray(answers) ? answers : [answers]);
    if (opts.english) {
      const i = english(input);
      if (!i) return 'no';
      return raw.some(a => english(a) === i) ? 'ok' : 'no';
    }
    const i = norm(input);
    if (!i) return 'no';
    const list = raw.map(norm);
    if (list.includes(i)) return 'ok';
    const ia = stripAcc(i);
    if (list.some(a => stripAcc(a) === ia)) return 'accent';
    // Pronouns kept on both sides: "El es médico" vs "Él es médico" is an accent slip, not a wrong answer.
    const full = stripAcc(clean(input));
    if (raw.some(a => stripAcc(clean(a)) === full)) return 'accent';
    return 'no';
  }

  // ----- why your answer is wrong: the chapters' own tables -----
  // Every form in a chapter's tables (verbs by person, nouns by case, articles by gender), with what it is for.
  function tableForms(chapters) {
    const out = [];
    (chapters || []).forEach(ch => ((ch.learn && ch.learn.blocks) || []).forEach(b => (b.type === 'tables' ? b.tables : []).forEach(t => t.rows.forEach(([label, cell]) =>
      String(cell).split('·').map(f => f.trim()).filter(Boolean).forEach(form => out.push({ n: ch.n, table: t.title, tense: t.tense || '', rows: t.rows.length, label, form, key: stripAcc(norm(form)) }))))));
    return out;
  }
  // "él / ella / usted" → "él, ella or usted", with a note for each "you" where the course gives one.
  function who(label, notes) {
    const parts = String(label).split('/').map(x => x.trim()).filter(x => x && !/^(as|os)$/.test(x));
    const said = parts.map(x => (notes && notes[x] ? x + ' (' + notes[x] + ')' : x));
    return said.length > 1 ? said.slice(0, -1).join(', ') + ' or ' + said[said.length - 1] : said[0] || label;
  }
  const verbOf = title => String(title).split(/[,:(]/)[0].trim();
  const padded = s => ' ' + s + ' ';
  // When a wrong answer is an accepted one with a single form swapped for another form from the same table, say
  // what the typed form is for and which one was needed: "vives goes with tú. For usted, use vive."
  // n: only tables from chapter n and earlier (what has been taught). Returns a sentence, or null.
  // short: a hint for a second try that doesn't give the answer away ("hablas goes with tú. Which form goes with yo?").
  function formHint(forms, input, answers, n, notes, short) {
    const got = stripAcc(norm(input));
    if (!got) return null;
    const pool = (forms || []).filter(f => n == null || f.n <= n);
    for (const a of (Array.isArray(answers) ? answers : [answers])) {
      const want = padded(stripAcc(norm(a)));
      for (const r of pool) {
        if (!want.includes(padded(r.key))) continue;
        for (const t of pool) {
          if (t.key === r.key) continue;
          const sameTable = t.table === r.table && t.tense === r.tense;
          // Another verb in the same person (estoy for soy), only between verb tables, which have six persons.
          const otherVerb = !sameTable && t.label === r.label && t.rows === 6 && r.rows === 6;
          if (!sameTable && !otherVerb) continue;
          if (want.replace(padded(r.key), padded(t.key)).trim() !== got) continue;
          // A form that is also right for the wanted person (je prends, tu prends) is not the mistake.
          if (sameTable && pool.some(x => x.table === t.table && x.tense === t.tense && x.key === t.key && x.label === r.label)) continue;
          const verb = r.rows === 6;
          // The same person in another tense (como for comí): say which tense each is. A table with no tense is the present.
          if (otherVerb && t.tense !== r.tense) {
            const tn = x => x.tense || 'present';
            const of = verbOf(t.table) === verbOf(r.table) ? ' of ' + verbOf(t.table) : '';
            return t.form + ' is the ' + tn(t) + of + '. This one needs the ' + tn(r) + (short ? '.' : ': ' + r.form + '.');
          }
          if (short) {
            if (otherVerb) return t.form + ' is a form of ' + verbOf(t.table) + '. This one needs ' + verbOf(r.table) + '.';
            if (notes) return t.form + (verb ? ' goes with ' : ' is for ') + who(t.label) + '. Which form ' + (verb ? 'goes with ' : 'is for ') + who(r.label) + '?';
            return t.form + ' is the form for "' + who(t.label) + '". Which one is for "' + who(r.label) + '"?';
          }
          if (otherVerb) return t.form + ' is a form of ' + verbOf(t.table) + '. This one needs ' + verbOf(r.table) + ': ' + r.form + '.';
          // Courses whose tables are labelled with pronouns (yo, tú; je, tu) say "goes with". Where the labels are
          // English (Latin: "I am", "receiver"), quote them.
          if (notes) return t.form + (verb ? ' goes with ' : ' is for ') + who(t.label, verb ? notes : null) + '. For ' + who(r.label, verb ? notes : null) + ', use ' + r.form + '.';
          return t.form + ' is the form for "' + who(t.label) + '". Here you need the one for "' + who(r.label) + '": ' + r.form + '.';
        }
      }
    }
    return null;
  }

  // ----- the daily verb drill (backlog 14) -----
  // The verbs being drilled: the first two in order that haven't graduated (ser and estar first, side by side).
  function drillActive(order, rec) {
    const verbs = (rec && rec.verbs) || {};
    return (order || []).filter(v => !(verbs[v] && verbs[v].grad)).slice(0, 2);
  }
  // A run on a day: a clean one (all right first time, fast) counts towards graduating, which takes 3 different days.
  function drillRecord(v, day, clean) {
    const r = { days: ((v && v.days) || []).slice(), grad: (v && v.grad) || '' };
    if (clean && !r.days.includes(day)) r.days.push(day);
    if (!r.grad && r.days.length >= 3) r.grad = day;
    return r;
  }

  // ----- flashcards (backlog 13) -----
  // The English answers a card accepts, from its meaning: "to speak, to talk" gives to speak, to talk, speak, talk.
  // Notes in brackets are dropped ("you all go to bed (with os)"), and a / or ; separates meanings too.
  function englishAnswers(en) {
    const out = new Set();
    const base = String(en || '').replace(/\([^)]*\)/g, ' ');
    const parts = base.split(/[,;\/]| or /).map(x => x.trim()).filter(Boolean);
    for (const p of parts.length ? parts : [base.trim()]) { out.add(p); const bare = p.replace(/^to\s+/i, ''); if (bare && bare !== p) out.add(bare); }
    if (parts.length > 1) out.add(base.trim()); // the whole meaning typed out is right too
    return Array.from(out).filter(Boolean);
  }
  // Flashcards into English: the same words in another order mean the same ("For me, the set lunch" and "The set lunch
  // for me"). Only for English meanings, never for the course language, where word order can be the point.
  function sameWordsEnglish(input, answers) {
    const bag = x => english(x).split(' ').filter(Boolean).sort().join(' ');
    const got = bag(input);
    return !!got && (Array.isArray(answers) ? answers : [answers]).some(a => bag(a) === got);
  }
  // n items, without repeats, more likely the heavier their weight.
  function weightedPick(items, weights, n, rnd) {
    rnd = rnd || Math.random;
    const pool = items.map((it, i) => ({ it, w: Math.max(0.01, weights[i] || 0) }));
    const out = [];
    while (out.length < n && pool.length) {
      let r = rnd() * pool.reduce((s, x) => s + x.w, 0); let k = 0;
      while (k < pool.length - 1 && (r -= pool[k].w) > 0) k++;
      out.push(pool.splice(k, 1)[0].it);
    }
    return out;
  }
  // A card's weight for a session: cards often missed in a direction come up more, well-known ones less.
  function flashWeight(rec, dir) {
    const d = (rec && rec[dir]) || {};
    return Math.max(0.3, 1 + 2 * (d.w || 0) - 0.5 * (d.r || 0));
  }

  // ----- a hint before the answer (backlog 21) -----
  // For a wrong typed answer that differs from an accepted one in a single word: point at that word without
  // giving the answer. Same start, different ending: "Check the ending of habla". Otherwise "Look again at libro".
  function tryHint(input, answers, opts) {
    opts = opts || {};
    const prep = opts.english ? english : norm;
    const got = prep(input).split(' ').filter(Boolean);
    if (!got.length) return null;
    for (const a of (Array.isArray(answers) ? answers : [answers])) {
      const want = prep(a).split(' ').filter(Boolean);
      if (want.length !== got.length) continue;
      const diff = want.map((w, k) => (stripAcc(w) === stripAcc(got[k]) ? -1 : k)).filter(k => k >= 0);
      if (diff.length !== 1) continue;
      const k = diff[0]; const y = got[k]; const w = want[k];
      const shared = (() => { let i = 0; while (i < y.length && i < w.length && y[i] === w[i]) i++; return i; })();
      return shared >= 3 && shared >= Math.min(y.length, w.length) - 3 ? 'Check the ending of ' + y + '.' : 'Look again at ' + y + '.';
    }
    return null;
  }

  // ----- mixed review -----
  // Up to n items drawn from several groups (one group per finished chapter), taking one from each group in turn
  // (groups in random order, items shuffled within each), so the mix moves between chapters instead of staying on one.
  function mixedPick(groups, n, rnd) {
    const lists = shuffle((groups || []).filter(g => g && g.length).map(g => shuffle(g, rnd)), rnd);
    const out = [];
    while (out.length < n && lists.some(l => l.length)) {
      for (const l of lists) { if (l.length && out.length < n) out.push(l.shift()); }
    }
    return out;
  }

  // ----- try these again (end of a chapter) -----
  // missed: the skills missed on the first try, with repeats (the most missed comes first). pool: { key, skill }
  // for every exercise that may be asked. avoid: keys of the exercises missed, so the retry is never the same
  // question from memory. Up to perSkill per skill, max in all; a skill with nothing else to ask is left out.
  function retryPick(missed, pool, avoid, opts) {
    opts = opts || {};
    const per = opts.perSkill || 2; const max = opts.max || 6;
    const count = {};
    (missed || []).forEach(k => { if (k) count[k] = (count[k] || 0) + 1; });
    const skills = Object.keys(count).sort((a, b) => count[b] - count[a]);
    const skip = new Set(avoid || []);
    const out = [];
    for (const sk of skills) {
      const cands = shuffle((pool || []).filter(p => p.skill === sk && !skip.has(p.key) && !out.includes(p.key)), opts.rnd);
      for (const c of cands.slice(0, per)) if (out.length < max) out.push(c.key);
    }
    return shuffle(out, opts.rnd);
  }

  // ----- level check (where a learner who knows some already should start) -----
  // chapters: chapter numbers in course order. answers: [{ n, ok }] so far. One question per chapter; a miss gets a
  // second question from the same chapter, and a second miss there means start at that chapter. Returns
  // { ask: n } for the next question, or { start: n }. Knowing everything still starts at the last chapter.
  function levelNext(chapters, answers) {
    chapters = chapters || [];
    for (const n of chapters) {
      const a = (answers || []).filter(x => x.n === n);
      if (!a.length) return { ask: n };
      if (a[0].ok) continue;
      if (a.length === 1) return { ask: n };
      if (a[1].ok) continue;
      return { start: n };
    }
    return { start: chapters.length ? chapters[chapters.length - 1] : null };
  }

  // ----- whole verbs (My words) -----
  // Every present-tense form of the course's verbs (and the infinitive itself) → the infinitive. A reflexive form
  // (me levanto) is found from its verb (levanto). Accents are kept, since está is a verb and esta is not.
  function verbIndex(doc) {
    const out = new Map();
    if (!doc || !doc.verbs) return out;
    const skip = new Set((doc.skipForms || []).map(w => String(w).toLowerCase()));
    for (const [inf, v] of Object.entries(doc.verbs)) {
      const keys = [inf, inf.replace(/se$/, '')].concat((v.forms || []).map(f => String(f).toLowerCase().split(' ').pop()));
      for (const k of keys) if (k && !skip.has(k) && !out.has(k)) out.set(k, inf);
    }
    return out;
  }
  // Which form a verb card asks for: one person at random, and one of its pronouns (usted as well as él and ella).
  function verbAsk(doc, inf, rnd) {
    rnd = rnd || Math.random;
    const v = doc && doc.verbs && doc.verbs[inf];
    if (!v) return null;
    const i = Math.floor(rnd() * v.forms.length);
    const names = (doc.persons && doc.persons[i]) || [''];
    return { i, who: names[Math.floor(rnd() * names.length)], answer: v.forms[i] };
  }

  // Did the sentence include one of the word's forms? (accent-insensitive substring match)
  function usedWord(sentence, forms) {
    const s = stripAcc(clean(sentence));
    return (forms || []).some(f => s.includes(stripAcc(clean(f))));
  }

  // ----- dates / streaks -----
  function dayKey(d) {
    d = d || new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  function daysBetween(a, b) {
    const pa = a.split('-').map(Number); const pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / DAY);
  }
  function updateStreak(streak, today) {
    const s = { last: streak && streak.last || null, count: streak && streak.count || 0 };
    if (s.last === today) return s;
    if (s.last && daysBetween(s.last, today) === 1) s.count += 1;
    else s.count = 1;
    s.last = today;
    return s;
  }
  // A streak is only "alive" if you studied today or yesterday.
  function liveStreak(streak, today) {
    if (!streak || !streak.last) return 0;
    return daysBetween(streak.last, today) <= 1 ? streak.count : 0;
  }

  // ----- spaced repetition (Leitner boxes) -----
  const INTERVALS = [0, 1, 3, 7, 14, 30]; // days until next review, by box 1..5
  function newCard(c, now) {
    return Object.assign({ alts: [], box: 1, due: now + INTERVALS[1] * DAY }, c);
  }
  // ok: true moves the card up a box, false drops it to box 1, 'close' (a small spelling slip) keeps its box.
  function srsGrade(card, ok, now) {
    const c = Object.assign({}, card, { seen: now }); // seen: when last reviewed, so sync keeps the latest grading
    if (ok === 'close') {
      c.box = c.box || 1;
      c.due = now + INTERVALS[c.box] * DAY;
    } else if (ok) {
      c.box = Math.min((c.box || 1) + 1, 5);
      c.due = now + INTERVALS[c.box] * DAY;
    } else {
      c.box = 1;
      c.due = now + 10 * 60000;
    }
    return c;
  }
  function dueCards(srs, now) {
    return Object.keys(srs).map(k => srs[k]).filter(c => !c.off && c.due <= now).sort((a, b) => a.due - b.due);
  }

  // ----- word of the day -----
  // Each day gets one word; unseen words come first, then the one assigned longest ago.
  function pickWord(w, ids, today) {
    if (w.byDate[today]) return w.byDate[today];
    const assigned = new Set(Object.values(w.byDate));
    const learned = new Set(w.learned || []);
    const unseen = ids.filter(id => !assigned.has(id) && !learned.has(id));
    if (unseen.length) return unseen[0];
    let best = ids[0]; let bestDate = '9999-99-99';
    for (const id of ids) {
      let last = '0000-00-00';
      for (const d of Object.keys(w.byDate)) if (w.byDate[d] === id && d > last) last = d;
      if (last < bestDate) { bestDate = last; best = id; }
    }
    return best;
  }

  function shuffle(arr, rnd) {
    rnd = rnd || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ----- sync: merge two copies of one person's progress (this device's and the server's) -----
  // Nothing studied on either device is lost. Rules are per field; see HANDOVER.md, Step 3.
  const TIME_DAYS = 120;
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  // Union of two maps, with pick(x, y) deciding when both have a key.
  function unionBy(a, b, pick) {
    const out = Object.assign({}, obj(a));
    for (const [k, v] of Object.entries(obj(b))) out[k] = k in out ? pick(out[k], v) : v;
    return out;
  }
  const later = (x, y, key) => (String(obj(y)[key] || '') > String(obj(x)[key] || '') ? y : x);
  // The record with the later day; on the same day, the larger count.
  function recent(x, y, day, count) {
    x = obj(x); y = obj(y);
    if (x[day] !== y[day]) return Object.assign({}, later(x, y, day));
    return Object.assign({}, x, { [count]: Math.max(x[count] || 0, y[count] || 0) });
  }
  const perDevice = v => (typeof v === 'number' ? { _: v } : obj(v));
  // Seconds practised on a day, from either shape.
  const daySecs = v => (typeof v === 'number' ? v : Object.values(obj(v)).reduce((n, x) => n + (Number(x) || 0), 0));
  function mergeState(a, b) {
    a = obj(a); b = obj(b);
    const out = Object.assign({}, b, a);

    // chapters: best score ever; date and last score from the latest attempt
    out.done = unionBy(a.done, b.done, (x, y) => {
      // a chapter skipped by the level check gives way to one actually played, on either copy
      if (obj(x).placed && !obj(y).placed) return y;
      if (obj(y).placed && !obj(x).placed) return x;
      const r = Object.assign({}, later(x, y, 'date'), { best: Math.max(x.best || 0, y.best || 0) });
      const first = x.first != null ? x.first : y.first; // the first run's score never changes
      if (first != null) r.first = first;
      return r;
    });
    // place in each chapter: the one saved last (a finished run leaves { off: true } so the other copy can't revive it)
    if (a.lessons || b.lessons) out.lessons = unionBy(a.lessons, b.lessons, (x, y) => ((obj(y).at || 0) > (obj(x).at || 0) ? y : x));
    delete out.lesson;
    // review cards: the one graded most recently (cards never graded have no seen)
    out.srs = unionBy(a.srs, b.srs, (x, y) => ((y.seen || 0) > (x.seen || 0) ? y : x));
    // practice seconds per day, per device ({ deviceId: secs }): each device's larger count, so a copy synced twice
    // never double-counts, and a day spent on two devices adds up. A plain number is from before Nov 2026 (device "_").
    const time = unionBy(a.time, b.time, (x, y) => {
      if (typeof x === 'number' && typeof y === 'number') return Math.max(x, y);
      return unionBy(perDevice(x), perDevice(y), (p, q) => Math.max(p || 0, q || 0));
    });
    out.time = {};
    Object.keys(time).sort().slice(-TIME_DAYS).forEach(k => { out.time[k] = time[k]; });
    out.reviewed = unionBy(a.reviewed, b.reviewed, (x, y) => x || y);
    out.skills = unionBy(a.skills, b.skills, (x, y) => ({ r: Math.max(x.r || 0, y.r || 0), w: Math.max(x.w || 0, y.w || 0) }));
    // verb drill: clean days per verb (a union), graduated if either copy says so
    if (a.drill || b.drill) {
      const da = obj(a.drill); const db = obj(b.drill);
      out.drill = { lastDay: String(da.lastDay || '') > String(db.lastDay || '') ? da.lastDay : (db.lastDay || da.lastDay || ''),
        verbs: unionBy(da.verbs, db.verbs, (x, y) => ({ days: Array.from(new Set([].concat(obj(x).days || [], obj(y).days || []))).sort(), grad: obj(x).grad || obj(y).grad || '' })) };
    }
    // readings: the latest result per text
    if (a.reads || b.reads) out.reads = unionBy(a.reads, b.reads, (x, y) => ((obj(y).at || 0) > (obj(x).at || 0) ? y : x));
    // flashcard results per card and direction: the more recent record wins
    if (a.flash || b.flash) out.flash = unionBy(a.flash, b.flash, (x, y) => ((obj(y).at || 0) > (obj(x).at || 0) ? y : x));
    // exercises answered with a spelling slip (for the spelling drill): the latest change wins
    if (a.slips || b.slips) out.slips = unionBy(a.slips, b.slips, (x, y) => ((obj(y).at || 0) > (obj(x).at || 0) ? y : x));
    // saved words: the latest change (added or removed) wins
    if (a.vocab || b.vocab) out.vocab = unionBy(a.vocab, b.vocab, (x, y) => ((y.at || 0) > (x.at || 0) ? y : x));
    out.xp = Math.max(a.xp || 0, b.xp || 0);
    // streak and today's XP: the more recent record, the larger count when both are from the same day
    out.streak = recent(a.streak, b.streak, 'last', 'count');
    out.dayXp = recent(a.dayXp, b.dayXp, 'date', 'xp');
    // word of the day: unions; this device's choice wins if the two picked different words for one day
    const wa = obj(a.wotd); const wb = obj(b.wotd);
    out.wotd = Object.assign({}, wb, wa, {
      byDate: unionBy(wa.byDate, wb.byDate, x => x),
      done: unionBy(wa.done, wb.done, (x, y) => x || y),
      answers: unionBy(wa.answers, wb.answers, x => x),
      learned: Array.from(new Set([].concat(wa.learned || [], wb.learned || [])))
    });
    // name, endings and daily goal: whichever device saved Settings last
    const prefs = (b.prefsAt || 0) > (a.prefsAt || 0) ? b : a;
    for (const k of ['name', 'fem', 'goalMins', 'prefsAt']) if (k in prefs) out[k] = prefs[k];
    return out;
  }

  return { retryPick, levelNext, sameWordsEnglish, drillActive, drillRecord, englishAnswers, weightedPick, flashWeight, tryHint, mixedPick, verbIndex, verbAsk, daySecs, judge, nearMiss, tableForms, formHint, norm, stripAcc, usedWord, dayKey, daysBetween, updateStreak, liveStreak, INTERVALS, newCard, srsGrade, dueCards, pickWord, shuffle, mergeState, DAY };
});
