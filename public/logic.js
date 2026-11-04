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
      String(cell).split('·').map(f => f.trim()).filter(Boolean).forEach(form => out.push({ n: ch.n, table: t.title, rows: t.rows.length, label, form, key: stripAcc(norm(form)) }))))));
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
  function formHint(forms, input, answers, n, notes) {
    const got = stripAcc(norm(input));
    if (!got) return null;
    const pool = (forms || []).filter(f => n == null || f.n <= n);
    for (const a of (Array.isArray(answers) ? answers : [answers])) {
      const want = padded(stripAcc(norm(a)));
      for (const r of pool) {
        if (!want.includes(padded(r.key))) continue;
        for (const t of pool) {
          if (t.key === r.key) continue;
          const sameTable = t.table === r.table;
          // Another verb in the same person (estoy for soy), only between verb tables, which have six persons.
          const otherVerb = !sameTable && t.label === r.label && t.rows === 6 && r.rows === 6;
          if (!sameTable && !otherVerb) continue;
          if (want.replace(padded(r.key), padded(t.key)).trim() !== got) continue;
          // A form that is also right for the wanted person (je prends, tu prends) is not the mistake.
          if (sameTable && pool.some(x => x.table === t.table && x.key === t.key && x.label === r.label)) continue;
          const verb = r.rows === 6;
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
  function mergeState(a, b) {
    a = obj(a); b = obj(b);
    const out = Object.assign({}, b, a);

    // chapters: best score ever; date and last score from the latest attempt
    out.done = unionBy(a.done, b.done, (x, y) => {
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
    // practice seconds per day: the larger number, since two devices on one day would otherwise double-count
    const time = unionBy(a.time, b.time, (x, y) => Math.max(x || 0, y || 0));
    out.time = {};
    Object.keys(time).sort().slice(-TIME_DAYS).forEach(k => { out.time[k] = time[k]; });
    out.reviewed = unionBy(a.reviewed, b.reviewed, (x, y) => x || y);
    out.skills = unionBy(a.skills, b.skills, (x, y) => ({ r: Math.max(x.r || 0, y.r || 0), w: Math.max(x.w || 0, y.w || 0) }));
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

  return { judge, nearMiss, tableForms, formHint, norm, stripAcc, usedWord, dayKey, daysBetween, updateStreak, liveStreak, INTERVALS, newCard, srsGrade, dueCards, pickWord, shuffle, mergeState, DAY };
});
