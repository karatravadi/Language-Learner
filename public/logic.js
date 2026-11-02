/* Pure logic (no DOM) so it can be unit-tested in Node and reused in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Logic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY = 86400000;
  const PRON = new Set(['yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes']);

  // Keep ñ distinct from n when removing accents (año is not ano).
  const stripAcc = s => String(s).replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const clean = s => String(s).toLowerCase().replace(/[¿?¡!.,;:"“”‘’()…]/g, ' ').replace(/\s+/g, ' ').trim();
  function dropPron(s) {
    const w = s.split(' ');
    if (w.length > 1 && PRON.has(w[0])) w.shift();
    return w.join(' ');
  }
  const norm = s => dropPron(clean(s));

  // 'ok' exact, 'accent' = right apart from accents, 'no' = wrong.
  function judge(input, answers) {
    const i = norm(input);
    if (!i) return 'no';
    const list = (Array.isArray(answers) ? answers : [answers]).map(norm);
    if (list.includes(i)) return 'ok';
    const ia = stripAcc(i);
    if (list.some(a => stripAcc(a) === ia)) return 'accent';
    // Pronouns kept on both sides: "El es médico" vs "Él es médico" is an accent slip, not a wrong answer.
    const full = stripAcc(clean(input));
    const raw = (Array.isArray(answers) ? answers : [answers]);
    if (raw.some(a => stripAcc(clean(a)) === full)) return 'accent';
    return 'no';
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
  function srsGrade(card, ok, now) {
    const c = Object.assign({}, card, { seen: now }); // seen: when last reviewed, so sync keeps the latest grading
    if (ok) {
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
    out.done = unionBy(a.done, b.done, (x, y) => Object.assign({}, later(x, y, 'date'), { best: Math.max(x.best || 0, y.best || 0) }));
    // review cards: the one graded most recently (cards never graded have no seen)
    out.srs = unionBy(a.srs, b.srs, (x, y) => ((y.seen || 0) > (x.seen || 0) ? y : x));
    // practice seconds per day: the larger number, since two devices on one day would otherwise double-count
    const time = unionBy(a.time, b.time, (x, y) => Math.max(x || 0, y || 0));
    out.time = {};
    Object.keys(time).sort().slice(-TIME_DAYS).forEach(k => { out.time[k] = time[k]; });
    out.reviewed = unionBy(a.reviewed, b.reviewed, (x, y) => x || y);
    out.skills = unionBy(a.skills, b.skills, (x, y) => ({ r: Math.max(x.r || 0, y.r || 0), w: Math.max(x.w || 0, y.w || 0) }));
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

  return { judge, norm, stripAcc, usedWord, dayKey, daysBetween, updateStreak, liveStreak, INTERVALS, newCard, srsGrade, dueCards, pickWord, shuffle, mergeState, DAY };
});
