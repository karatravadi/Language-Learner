/* Español Trainer: front end. Plain JavaScript, no dependencies.
   Content (chapters, words, roadmap) is loaded from public/courses/, so adding a chapter or a whole course
   is a data change, not a code change. Icons: Lucide (ISC licence). */
(function () {
  'use strict';

  const L = window.Logic;
  const PRAISE = ['¡Correcto!', '¡Muy bien!', '¡Eso es!', '¡Perfecto!', '¡Genial!', '¡Exacto!'];
  const NOTE_LABEL = { tip: 'Tip', spain: 'In Spain', warn: 'Careful', culture: 'Culture' };
  const GOALS = [20, 30, 45, 60];

  let COURSE = null; let CHAPTERS = []; let ROADMAP = []; let WORDS = []; let SKILLS = {};
  let KEY = 'espanol-trainer-v1';
  let S = null;

  // ---------- icons (Lucide paths) ----------
  const ICONS = {
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    sound: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
    slow: '<path d="M2 13a6 6 0 1 0 12 0 4 4 0 1 0-8 0 2 2 0 0 0 4 0"/><circle cx="10" cy="13" r="8"/><path d="M2 21h12c4.4 0 8-3.6 8-8V7a2 2 0 1 0-4 0v6"/><path d="M18 3 19.1 5.2"/><path d="M22 3 20.9 5.2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    next: '<path d="m9 18 6-6-6-6"/>',
    hint: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>'
  };
  function icon(name, cls) {
    return h('span', { class: 'ic' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24">' + ICONS[name] + '</svg>' });
  }

  // ---------- tiny DOM helper ----------
  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(k => add(el, k)); return; }
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  // DOM append()/replaceChildren() print "null" as text, so always go through these.
  function push(el, ...kids) { kids.forEach(k => add(el, k)); return el; }
  function put(el, ...kids) { el.replaceChildren(); return push(el, ...kids); }
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(k => {
        const v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(p => el.style.setProperty(p, v[p]));
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value' || k === 'disabled' || k === 'checked' || k === 'selected') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function mount(node) {
    const app = document.getElementById('app');
    app.replaceChildren(node);
    window.scrollTo(0, 0);
  }
  const tone = t => 'tone-' + (t || 'none');

  // ---------- state ----------
  function defaults() {
    return {
      name: 'Kara', fem: true, goalMins: 45, xp: 0, streak: { last: null, count: 0 }, dayXp: { date: '', xp: 0 },
      time: {}, reviewed: {}, done: {}, srs: {}, skills: {}, wotd: { byDate: {}, learned: [], done: {}, answers: {} }
    };
  }
  // A saved state (from storage or an imported file) on top of the defaults, so older saves gain new fields.
  function withDefaults(o) {
    const d = defaults();
    if (!o || typeof o !== 'object' || Array.isArray(o)) return d;
    return Object.assign(d, o, {
      streak: Object.assign(d.streak, o.streak || {}),
      dayXp: Object.assign(d.dayXp, o.dayXp || {}),
      wotd: Object.assign(d.wotd, o.wotd || {})
    });
  }
  // The only code that touches storage. Today it is this browser's localStorage; sync slots in here later.
  const store = {
    read() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw, noProto) : null; } catch (e) { return null; } },
    write(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode etc. */ } }
  };
  // JSON reviver: a saved file must not be able to swap an object's prototype.
  function noProto(k, v) { return k === '__proto__' ? undefined : v; }
  function load() { return withDefaults(store.read()); }
  function save() { store.write(S); if (SYNC.on) schedulePush(); }

  // ---------- export / import progress (a JSON file) ----------
  const EXPORT_APP = 'espanol-trainer';
  function exportProgress() {
    const file = { app: EXPORT_APP, version: 1, course: COURSE.id, exported: new Date().toISOString(), state: S };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' }));
    const a = h('a', { href: url, download: 'espanol-trainer-' + COURSE.id + '-' + L.dayKey() + '.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Reads a file from exportProgress(). Returns an error message, or null once the progress is replaced.
  async function importProgress(f) {
    let o;
    if (f.size > 5e6) return 'That file is too large to be a progress file.';
    try { o = JSON.parse(await f.text(), noProto); } catch (e) { return 'That file is not a progress file from this app.'; }
    if (!o || o.app !== EXPORT_APP || !o.state || typeof o.state !== 'object') return 'That file is not a progress file from this app.';
    if (o.course !== COURSE.id) return 'That file is for a different course (' + String(o.course).slice(0, 20) + ').';
    const when = String(o.exported || '').slice(0, 10) || 'an unknown date';
    if (!confirm('Replace the progress on this device with the file from ' + when + '? This cannot be undone.')) return '';
    S = withDefaults(o.state); pruneTime(); save(); pushReplace();
    return null;
  }

  const T = s => String(s == null ? '' : s).replace(/\{name\}/g, S.name).replace(/\{o\}/g, S.fem ? 'a' : 'o');

  function addXp(n) {
    const t = L.dayKey();
    S.xp += n;
    if (S.dayXp.date !== t) S.dayXp = { date: t, xp: 0 };
    S.dayXp.xp += n;
    S.streak = L.updateStreak(S.streak, t);
    save();
  }
  function recordSkill(skill, ok) {
    if (!skill) return;
    const s = S.skills[skill] || (S.skills[skill] = { r: 0, w: 0 });
    if (ok) s.r++; else s.w++;
  }
  function addCards(list) {
    const now = Date.now();
    list.forEach(c => { if (!S.srs[c.id]) S.srs[c.id] = L.newCard(c, now); });
    save();
  }
  function weakSkills() {
    return Object.keys(S.skills)
      .filter(k => k !== 'mixed' && S.skills[k].w >= 2 && S.skills[k].w / (S.skills[k].r + S.skills[k].w) > 0.3)
      .sort((a, b) => S.skills[b].w - S.skills[a].w);
  }
  const skillName = k => SKILLS[k] || k;

  // ---------- practice time (counts only while you are active on the page) ----------
  let lastActive = Date.now(); let ticks = 0;
  ['pointerdown', 'keydown', 'input', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true, capture: true }));
  const TICK = 5;
  setInterval(() => {
    if (!S || document.visibilityState !== 'visible' || Date.now() - lastActive > 90000) return;
    const t = L.dayKey();
    S.time[t] = (S.time[t] || 0) + TICK;
    if (++ticks % 6 === 0) save();
    const el = document.getElementById('mins-today');
    if (el) el.textContent = String(minsToday());
    const bar = document.getElementById('mins-bar');
    if (bar) bar.style.transform = 'scaleX(' + Math.min(1, minsToday() / S.goalMins) + ')';
  }, TICK * 1000);
  document.addEventListener('visibilitychange', () => { if (S && document.visibilityState === 'hidden') save(); });
  const minsToday = () => Math.floor((S.time[L.dayKey()] || 0) / 60);
  function pruneTime() {
    const keys = Object.keys(S.time).sort();
    while (keys.length > 120) delete S.time[keys.shift()];
  }

  // ---------- speech ----------
  const TTS = { ok: 'speechSynthesis' in window, voice: null };
  function pickVoice() {
    if (!TTS.ok || !COURSE) return;
    const vs = speechSynthesis.getVoices();
    TTS.voice = null;
    for (const pat of COURSE.voice) { const re = new RegExp(pat, 'i'); TTS.voice = vs.find(v => re.test(v.lang)); if (TTS.voice) break; }
  }
  if (TTS.ok) speechSynthesis.onvoiceschanged = pickVoice;
  const hasVoice = () => TTS.ok && !!TTS.voice;
  function say(text, slow) {
    if (!hasVoice()) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/\{.*?\}/g, ''));
    u.lang = TTS.voice.lang || COURSE.lang;
    u.voice = TTS.voice;
    u.rate = slow ? 0.65 : 0.9;
    speechSynthesis.speak(u);
  }
  function speakBtn(text, label) {
    if (!hasVoice()) return null;
    return h('button', { class: 'mini' + (label ? ' lbl' : ''), type: 'button', 'aria-label': 'Listen', onclick: e => { e.stopPropagation(); say(text); } },
      label ? [icon('sound'), ' ', label] : icon('sound'));
  }

  // ---------- AI (optional; the app works without it) ----------
  const AI = { on: false, model: '', provider: '' };
  async function aiStatus() {
    try {
      const r = await fetch('/api/status'); const j = await r.json();
      AI.on = !!j.ai; AI.model = j.model || ''; AI.provider = j.provider || '';
      SYNC.on = j.sync === true && typeof j.user === 'string'; SYNC.user = j.user || '';
    } catch (e) { /* offline server */ }
  }
  async function ai(mode, payload) {
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ mode, course: COURSE.id }, payload)) });
      return await r.json();
    } catch (e) {
      return { ok: false, error: SYNC.on ? 'Could not reach the AI tutor. Check your connection and try again.' : 'Could not reach the trainer. Is the black start window still open?' };
    }
  }

  // ---------- sync (hosted app only: the local server has no accounts, so SYNC.on stays false) ----------
  // This device keeps working from localStorage; the account copy is loaded at start and when the page comes back
  // into view, and every save is sent a moment later. If another device saved first, the two copies are merged
  // (L.mergeState) and sent again, so nothing studied on either device is lost.
  const SYNC = { on: false, user: '', version: 0, busy: false, again: false, replace: false, timer: 0 };
  const metaKey = () => KEY + ':sync';
  function readMeta() { try { return JSON.parse(localStorage.getItem(metaKey())) || {}; } catch (e) { return {}; } }
  function writeMeta() { try { localStorage.setItem(metaKey(), JSON.stringify({ user: SYNC.user, version: SYNC.version })); } catch (e) { /* private mode */ } }
  const hasProgress = s => s.xp > 0 || Object.keys(s.done).length > 0 || Object.keys(s.srs).length > 0;
  async function progressApi(method, body) {
    const r = await fetch('/api/progress' + (method === 'GET' ? '?course=' + encodeURIComponent(COURSE.id) : ''), {
      method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, keepalive: method === 'PUT'
    });
    return { status: r.status, j: await r.json() };
  }
  function adopt(state) { S = withDefaults(state); pruneTime(); store.write(S); }

  // At start: bring this device and the account together.
  async function syncStart() {
    let got;
    try { got = await progressApi('GET'); } catch (e) { return; } // offline: carry on locally, sync later
    if (got.status !== 200) return;
    const meta = readMeta();
    const mine = meta.user === SYNC.user; // this device last synced with this same account
    const local = hasProgress(S);
    SYNC.version = got.j.version || 0;
    if (got.j.state) {
      if (mine) adopt(L.mergeState(S, got.j.state));
      else if (!meta.user && local && confirm('This device has progress that is not in your account yet. Add it to your account?')) adopt(L.mergeState(S, got.j.state));
      else adopt(got.j.state);
    } else if (!(local && (mine || (!meta.user && confirm('Use this device\'s progress for your account? Choose Cancel to start your account from zero.'))))) {
      adopt({});
    }
    writeMeta();
    syncPush();
  }
  // When the page comes back into view: pick up what other devices saved meanwhile.
  async function syncPull() {
    if (!SYNC.on || SYNC.busy) return;
    try {
      const got = await progressApi('GET');
      if (got.status !== 200 || !got.j.state || got.j.version === SYNC.version) return;
      adopt(L.mergeState(S, got.j.state)); SYNC.version = got.j.version; writeMeta(); syncPush();
      if (document.querySelector('.page.home')) home();
    } catch (e) { /* offline */ }
  }
  function schedulePush() { clearTimeout(SYNC.timer); SYNC.timer = setTimeout(syncPush, 1500); }
  async function syncPush() {
    if (!SYNC.on) return;
    if (SYNC.busy) { SYNC.again = true; return; }
    SYNC.busy = true; clearTimeout(SYNC.timer);
    try {
      for (let tries = 0; tries < 4; tries++) {
        const replace = SYNC.replace;
        const r = await progressApi('PUT', { course: COURSE.id, state: S, version: SYNC.version, replace });
        if (r.status === 200) { SYNC.version = r.j.version; if (replace) SYNC.replace = false; writeMeta(); break; }
        if (r.status !== 409) break; // signed out or server trouble: keep the local copy, try again on the next save
        adopt(L.mergeState(S, r.j.state || {})); SYNC.version = r.j.version || 0;
      }
    } catch (e) { /* offline: the next save or coming back online retries */ }
    SYNC.busy = false;
    if (SYNC.again) { SYNC.again = false; syncPush(); }
  }
  // Reset and import replace the account copy instead of merging into it.
  function pushReplace() { if (SYNC.on) { SYNC.replace = true; syncPush(); } }
  window.addEventListener('online', () => { if (SYNC.on) syncPush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncPull(); });

  // ---------- small UI pieces ----------
  function backBar(title, onBack) {
    return h('div', { class: 'lesson-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: onBack }, icon('back', 'lg')),
      h('div', { class: 'lesson-title' }, title), h('span'));
  }
  function modal(content) {
    const overlay = h('div', { class: 'overlay', onclick: e => { if (e.target === overlay) overlay.remove(); } });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, content,
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => overlay.remove() }, 'Close')));
    overlay.append(box);
    document.body.append(overlay);
    return overlay;
  }
  const prettyAns = list => list.map(a => a.charAt(0).toUpperCase() + a.slice(1) + '.').join(' / ');
  // The red pen: your words struck through, the right words written in.
  function pen(wrong, right) {
    return h('div', { class: 'pen' }, wrong ? h('span', { class: 'pen-x' }, wrong) : null, wrong ? h('span', { class: 'pen-arrow', 'aria-hidden': 'true' }, '→') : null, h('span', { class: 'pen-ok' }, right));
  }
  const todayLong = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // ---------- home ----------
  function todaysWord() {
    const today = L.dayKey();
    const id = L.pickWord(S.wotd, WORDS.map(w => w.id), today);
    if (S.wotd.byDate[today] !== id) { S.wotd.byDate[today] = id; save(); }
    return WORDS.find(w => w.id === id);
  }
  function nextChapter() {
    return CHAPTERS.find(c => !S.done[c.n]) || CHAPTERS.slice().sort((a, b) => S.done[a.n].best - S.done[b.n].best)[0];
  }

  function home() {
    const today = L.dayKey();
    const streak = L.liveStreak(S.streak, today);
    const due = L.dueCards(S.srs, Date.now()).length;
    const weak = weakSkills();
    const word = todaysWord();
    const wdone = !!S.wotd.done[today];
    const mins = minsToday();
    const nextCh = nextChapter();
    const chapterToday = CHAPTERS.some(c => S.done[c.n] && S.done[c.n].date === today);
    const reviewedToday = !!S.reviewed[today];
    const lastDone = CHAPTERS.filter(c => S.done[c.n]).pop();

    const planRow = (done, title, sub, m, onclick) => h('button', { class: 'plan-row' + (done ? ' done' : ''), type: 'button', disabled: !onclick, onclick },
      h('span', { class: 'dot' }, done ? icon('check') : null),
      h('span', {}, h('span', { class: 'plan-t' }, title), sub ? h('span', { class: 'plan-s' }, sub) : null),
      h('span', { class: 'plan-m' }, m),
      onclick ? icon('next') : h('span'));

    let practise;
    if (weak.length) practise = planRow(false, 'Weak spots', skillName(weak[0]), '15 min', drillWeak);
    else if (AI.on && lastDone) practise = planRow(false, 'Free chat with ' + lastDone.boss.who, 'Use what you learned in chapter ' + lastDone.n, '15 min', () => chatScreen(lastDone));
    else if (lastDone) practise = planRow(false, 'Replay a chapter', 'Chapter ' + lastDone.n + ': ' + lastDone.title, '15 min', () => chapterFlow(lastDone));
    else practise = planRow(false, 'Practise', 'Opens after your first chapter', '15 min', null);

    const plan = h('div', { class: 'plan' },
      planRow(wdone, 'Word of the day', word.es, '3 min', wotdScreen),
      planRow(reviewedToday && due === 0, 'Review', due ? due + ' cards due' : (reviewedToday ? 'All caught up' : 'Nothing due yet'), '10 min', due ? reviewFlow : null),
      planRow(chapterToday, chapterToday ? 'Chapter done today' : 'Chapter ' + nextCh.n, nextCh.title, nextCh.mins + ' min', () => chapterFlow(nextCh)),
      practise);

    const todayCard = h('section', { class: 'card', 'aria-label': 'Today' },
      h('div', { class: 'today-h' }, h('b', {}, 'Today'), h('span', { class: 'meta' }, todayLong())),
      h('div', { class: 'today-fig' }, h('span', { id: 'mins-today', style: { 'font-size': 'inherit', color: 'inherit', 'font-weight': 'inherit' } }, String(mins)), h('span', {}, ' of ' + S.goalMins + ' min')),
      h('div', { class: 'bar pen' }, h('i', { id: 'mins-bar', style: { transform: 'scaleX(' + Math.min(1, mins / S.goalMins) + ')' } })),
      h('div', { class: 'meta today-meta' }, streak + (streak === 1 ? ' day' : ' days') + ' in a row · ' + S.xp + ' XP'),
      plan);

    const wotd = h('button', { class: 'card wotd', type: 'button', onclick: wotdScreen },
      h('div', { class: 'wotd-k' }, 'Palabra del día'),
      h('div', { class: 'wotd-w' }, word.es),
      h('div', { class: 'wotd-m' }, word.en),
      h('div', { class: 'wotd-ex' }, word.ex.es),
      h('div', { class: 'wotd-go' }, wdone ? 'Done today, see it again' : 'Use it in a sentence', icon('next')));

    const path = CHAPTERS.map(ch => {
      const d = S.done[ch.n];
      const isNext = ch === nextCh && !d;
      return h('button', { class: 'chap' + (d ? ' done' : '') + (isNext ? ' next' : ''), type: 'button', onclick: () => chapterFlow(ch) },
        h('div', { class: 'chap-n' }, d ? icon('check') : String(ch.n)),
        h('div', {}, h('div', { class: 'chap-t' }, ch.title), h('div', { class: 'chap-s' }, ch.can)),
        h('div', { class: 'chap-go' }, d ? 'Best ' + d.best + '%' : (isNext ? 'Start' : ch.mins + ' min'), icon('next')));
    }).concat(ROADMAP.map(r => h('div', { class: 'chap locked', 'aria-disabled': 'true' },
      h('div', { class: 'chap-n' }, String(r.n)),
      h('div', {}, h('div', { class: 'chap-t' }, r.title), h('div', { class: 'chap-s' }, r.can)),
      h('div', { class: 'chap-go' }, 'Later'))));

    const aiLine = h('button', { class: 'status' + (AI.on ? ' on' : ''), type: 'button', onclick: aiHelp }, h('i'),
      AI.on ? 'AI tutor on · ' + AI.provider : 'AI tutor off · Set up');

    mount(h('div', { class: 'page home' },
      h('header', { class: 'top' },
        h('div', { class: 'brand' }, h('div', { class: 'mark', 'aria-hidden': 'true' }, 'ñ'), h('div', { class: 'wordmark' }, 'Español Trainer')),
        h('div', { class: 'top-r' }, h('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: settings }, icon('settings', 'lg')))),
      h('div', { class: 'home-grid' },
        h('div', { class: 'home-side' }, todayCard, wotd),
        h('div', {},
          h('h1', { class: 'page-title' }, COURSE.title), h('p', { class: 'muted' }, COURSE.level + ' · ' + CHAPTERS.length + ' chapters ready, ' + ROADMAP.length + ' to come'),
          h('div', { class: 'path' }, path),
          h('div', { class: 'foot' }, aiLine)))));
  }

  // ---------- settings & AI help ----------
  function settings() {
    const name = h('input', { class: 'text', value: S.name, maxlength: '30', 'aria-label': 'Your name', style: { 'font-family': 'var(--sans)', 'font-size': '16px' } });
    const fem = h('input', { type: 'radio', name: 'g', checked: S.fem, id: 'g-f' });
    const masc = h('input', { type: 'radio', name: 'g', checked: !S.fem, id: 'g-m' });
    const goal = h('select', { class: 'text', 'aria-label': 'Daily goal' }, GOALS.map(g => h('option', { value: String(g), selected: g === S.goalMins }, g + ' minutes')));
    const msg = h('p', { class: 'meta', role: 'status' });
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, 'aria-label': 'Progress file',
      onchange: async () => {
        const f = file.files[0]; file.value = '';
        if (!f) return;
        const err = await importProgress(f);
        if (err === null) { ov.remove(); home(); } else msg.textContent = err;
      } });
    const ov = modal(h('div', {},
      h('h2', {}, 'Settings'),
      h('label', { class: 'field' }, h('span', {}, 'Your name'), name),
      h('div', { class: 'field' }, h('span', {}, 'Endings in examples'),
        h('div', { class: 'radios' }, h('label', {}, fem, 'cansada (-a)'), h('label', {}, masc, 'cansado (-o)'))),
      h('label', { class: 'field' }, h('span', {}, 'Daily goal'), goal),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => { S.name = name.value.trim() || 'Kara'; S.fem = fem.checked; S.goalMins = Number(goal.value) || 45; S.prefsAt = Date.now(); save(); ov.remove(); home(); } }, 'Save'),
        h('button', { class: 'btn quiet danger', onclick: () => { if (confirm(SYNC.on ? 'Erase all progress, review cards and streak, on every device?' : 'Erase all progress, review cards and streak on this device?')) { S = defaults(); save(); pushReplace(); ov.remove(); home(); } } }, 'Reset progress')),
      h('div', { class: 'field', style: { 'margin-top': '16px' } }, h('span', {}, 'Backup'),
        h('div', { class: 'row', style: { 'margin-top': '0' } },
          h('button', { class: 'btn ghost', type: 'button', onclick: exportProgress }, 'Export progress'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => file.click() }, 'Import progress'))),
      file, msg,
      h('p', { class: 'meta', style: { 'margin-top': '16px' } }, SYNC.on
        ? 'Signed in as ' + SYNC.user + '. Progress syncs to your account, so every device you sign in on sees the same streak and review cards. Practice time only counts while you are active on the page.'
        : 'Progress is saved in this browser on this device. Export it to keep a copy or move it to another browser. Practice time only counts while you are active on the page.')));
  }

  function aiHelp() {
    modal(h('div', {},
      h('h2', {}, AI.on ? 'AI tutor is on' : 'Switch on the AI tutor'),
      AI.on
        ? h('div', {},
          h('p', {}, 'Connected to ' + (AI.provider || 'AI') + ' (' + AI.model + '). It corrects your own sentences, checks your word-of-the-day answer and plays the characters in free chat. Everything else works without it.'),
          AI.provider === 'Gemini' ? h('p', { class: 'meta' }, 'This uses Google\'s free Gemini tier. Google says it may use what you type into the AI parts to improve its products, so keep anything private out of them.') : null,
          SYNC.on ? h('p', { class: 'meta' }, 'Each person gets a daily number of AI requests. When they run out, everything else keeps working.') : null)
        : SYNC.on ? h('p', {}, 'The AI tutor is not switched on for this app yet. Everything else works without it.')
        : h('div', {},
          h('p', {}, 'Everything works without AI. The tutor adds sentence correction and free chat. Setup takes about 3 minutes:'),
          h('ol', { class: 'steps-list' },
            h('li', {}, 'Get a free Gemini API key at aistudio.google.com. The free tier has daily limits, and Google says free-tier prompts can be used to improve its products. DeepSeek (platform.deepseek.com) also works: small free credit, then pay as you go.'),
            h('li', {}, 'Open settings.env in the trainer folder with Notepad. Paste the key after GEMINI_API_KEY= (or DEEPSEEK_API_KEY=), set PROVIDER to match, and save.'),
            h('li', {}, 'Close the black window, then double-click start.bat again.')),
          h('p', { class: 'meta' }, 'Your key stays on this computer and is never sent to the page.'))));
  }

  // ---------- lesson shell ----------
  function shell(title, step, labels, onClose, content) {
    const segs = labels.map((l, i) => h('i', { class: i < step ? 'done' : i === step ? 'on' : '' }));
    return h('div', { class: 'page lesson' },
      h('div', { class: 'lesson-top' },
        h('button', { class: 'icon-btn', 'aria-label': 'Close lesson', onclick: onClose }, icon('close', 'lg')),
        h('div', { class: 'lesson-title' }, title),
        h('div', { class: 'lesson-step' }, labels[step])),
      h('div', { class: 'segs' }, segs),
      content);
  }

  // ---------- chapter flow ----------
  function chapterFlow(ch) {
    const stats = { right: 0, total: 0, t0: Date.now() };
    const labels = ['Discover', 'Learn', 'Phrases', 'Practise', 'Write', 'Scenario', 'Done'];
    const builders = [discoverStep, learnStep, phrasesStep, (c, next, st) => exerciseRunner(c.exercises, st, next), writeStep, bossStep, resultStep];
    let i = 0;
    function render() {
      const content = builders[i](ch, () => { i++; render(); }, stats);
      mount(shell('Chapter ' + ch.n + ' · ' + T(ch.title), i, labels, () => {
        if (i === labels.length - 1 || confirm('Leave this chapter? Progress in this lesson will not be kept.')) home();
      }, content));
    }
    render();
  }

  function contBtn(label, onclick) { return h('div', { class: 'row end sticky' }, h('button', { class: 'btn primary big', onclick }, label)); }

  function discoverStep(ch, next) {
    const d = ch.discover;
    const line = ([es, en]) => h('button', { class: 'ex-line', type: 'button', onclick: () => say(T(es)) }, h('span', { class: 'es' }, T(es)), h('span', { class: 'en' }, T(en)));
    const reveal = h('div', { class: 'reveal hidden' });
    const msg = h('p', { class: 'nudge hidden' });
    const opts = d.options.map((o, i) => h('button', {
      class: 'opt', type: 'button', onclick: () => {
        if (i === d.answer) {
          opts.forEach(b => b.classList.add('locked'));
          opts[i].classList.add('good');
          msg.classList.add('hidden');
          reveal.classList.remove('hidden');
          reveal.scrollIntoView({ behavior: 'smooth', block: 'start' });
          addXp(10);
        } else {
          opts[i].classList.add('bad');
          msg.textContent = d.nudge;
          msg.classList.remove('hidden');
        }
      }
    }, T(o)));
    const hookRow = r => h('div', { class: 'hook-row' }, h('div', { class: 'hook-b' }, r[0]),
      h('div', {}, h('div', { class: 'hook-l' }, r[1]), h('div', { class: 'hook-e' }, T(r[2])), h('div', { class: 'hook-t' }, T(r[3]))));
    const hooks = d.hooks || [];
    push(reveal,
      h('p', { class: 'lead' }, T(d.reveal)),
      hooks.length ? h('div', { class: 'cols', style: { '--n': String(hooks.length) } }, hooks.map(hk => h('div', { class: 'hook ' + tone(hk.tone) }, h('h3', {}, hk.title), hk.rows.map(hookRow)))) : null,
      contBtn('Continue', next));
    return h('div', { class: 'step' },
      h('h2', {}, 'Work it out'),
      h('p', { class: 'lead' }, T(d.intro)),
      h('div', { class: 'cols', style: { '--n': String(d.groups.length) } },
        d.groups.map(g => h('div', { class: 'group ' + tone(g.tone) }, h('div', { class: 'group-h' }, g.label), g.lines.map(line)))),
      h('p', { class: 'q' }, T(d.question)),
      h('div', { class: 'opts' }, opts), msg, reveal);
  }

  function learnBlock(b) {
    if (b.type === 'tables') {
      return h('div', { class: 'cols', style: { '--n': String(b.tables.length) } }, b.tables.map(t => h('div', { class: 'conj ' + tone(t.tone) }, h('h3', {}, t.title),
        t.rows.map(([p, f]) => h('button', { class: 'conj-row', type: 'button', onclick: () => say(t.speak === 'form' ? f.replace(/·/g, ',') : p.split(' ')[0].replace(/\/.*/, '') + ' ' + f) },
          h('span', { class: 'pron' }, p), h('span', { class: 'form' }, f))))));
    }
    if (b.type === 'note') return h('div', { class: 'note ' + b.kind }, h('span', { class: 'note-k' }, NOTE_LABEL[b.kind]), h('span', {}, T(b.text)));
    if (b.type === 'twist') {
      return h('div', { class: 'twist' }, h('h3', {}, b.title),
        h('div', { class: 'cols' },
          h('div', { class: 'pair tone-blue' }, h('div', { class: 'es' }, T(b.a[0])), h('div', { class: 'en' }, T(b.a[1]))),
          h('div', { class: 'pair tone-orange' }, h('div', { class: 'es' }, T(b.b[0])), h('div', { class: 'en' }, T(b.b[1])))),
        h('p', {}, T(b.note)));
    }
    if (b.type === 'list') {
      return h('div', { class: 'list-block' }, h('h3', {}, b.title),
        h('div', { class: 'phrases' }, b.rows.map(([es, en]) => h('div', { class: 'phrase' }, h('div', {}, h('div', { class: 'es' }, T(es)), h('div', { class: 'en' }, T(en))), speakBtn(T(es))))));
    }
    return null;
  }

  function learnStep(ch, next) {
    const l = ch.learn;
    return h('div', { class: 'step' },
      h('h2', {}, l.title),
      l.sub && hasVoice() ? h('p', { class: 'muted' }, l.sub) : null,
      l.blocks.map(learnBlock),
      contBtn('Continue to phrases', next));
  }

  function phrasesStep(ch, next) {
    addCards(ch.phrases.map(p => ({ id: p.id, es: p.es, en: p.en, alts: p.alts })));
    return h('div', { class: 'step' },
      h('h2', {}, 'Phrases to keep'),
      h('p', { class: 'muted' }, 'These are now in your review deck, so they come back just before you would forget them.'),
      h('div', { class: 'phrases' }, ch.phrases.map(p => h('div', { class: 'phrase' },
        h('div', {}, h('div', { class: 'es' }, T(p.es)), h('div', { class: 'en' }, T(p.en))),
        speakBtn(T(p.es))))),
      contBtn('Start practising', next));
  }

  // ---------- exercises ----------
  function sentenceEl(q) {
    const parts = T(q).split('___');
    const slot = h('span', { class: 'slot' }, ' ');
    const el = h('div', { class: 'sentence' });
    parts.forEach((p, i) => { if (i) push(el, slot); push(el, p); });
    return { el, slot, hasSlot: parts.length > 1 };
  }

  function optionButtons(options, onPick) {
    const btns = options.map((o, i) => h('button', {
      class: 'opt', type: 'button', onclick: () => { btns.forEach((b, j) => b.classList.toggle('sel', j === i)); onPick(i); }
    }, T(o)));
    return btns;
  }

  const TYPES = {
    mc(ex, api, el) {
      const s = sentenceEl(ex.q);
      let sel = -1;
      const btns = optionButtons(ex.options, i => { sel = i; if (s.hasSlot) s.slot.textContent = T(ex.options[i]); api.enable(); });
      push(el, h('p', { class: 'prompt' }, ex.prompt || 'Choose the right option'), ex.q ? s.el : null, ex.sub ? h('p', { class: 'sub' }, T(ex.sub)) : null, h('div', { class: 'opts' }, btns));
      return {
        check() { if (sel < 0) return null; return { ok: sel === ex.answer, yours: T(ex.options[sel]), answer: T(ex.options[ex.answer]), why: ex.why }; },
        reveal(res) { btns[ex.answer].classList.add('good'); if (!res.ok && sel >= 0) btns[sel].classList.add('bad'); }
      };
    },

    listen(ex, api, el) {
      let sel = -1;
      const btns = optionButtons(ex.options, i => { sel = i; api.enable(); });
      push(el,
        h('p', { class: 'prompt' }, 'Listen, then pick what it means'),
        h('div', { class: 'listen-row' },
          h('button', { class: 'btn ghost big', type: 'button', onclick: () => say(ex.say) }, icon('sound'), 'Play'),
          h('button', { class: 'btn quiet big', type: 'button', onclick: () => say(ex.say, true) }, icon('slow'), 'Slower')),
        h('div', { class: 'opts' }, btns));
      setTimeout(() => say(ex.say), 350);
      return {
        check() { if (sel < 0) return null; return { ok: sel === ex.answer, yours: ex.options[sel], answer: ex.options[ex.answer], show: ex.say, hear: ex.say, why: ex.why }; },
        reveal(res) { btns[ex.answer].classList.add('good'); if (!res.ok && sel >= 0) btns[sel].classList.add('bad'); }
      };
    },

    gap(ex, api, el) { return textType(ex, api, el, true); },
    translate(ex, api, el) { return textType(ex, api, el, false); },

    order(ex, api, el) {
      const items = L.shuffle(ex.words.map((w, i) => ({ w, id: i })));
      let chosen = [];
      const ans = h('div', { class: 'tiles answer', 'aria-label': 'Your sentence' });
      const bank = h('div', { class: 'tiles bank', 'aria-label': 'Word bank' });
      function draw() {
        put(ans, ...chosen.map(it => h('button', { class: 'tile', type: 'button', onclick: () => { chosen = chosen.filter(c => c !== it); draw(); } }, it.w)));
        put(bank, ...items.filter(it => !chosen.includes(it)).map(it => h('button', { class: 'tile', type: 'button', onclick: () => { chosen.push(it); draw(); } }, it.w)));
        api.enable(chosen.length === items.length);
      }
      draw();
      push(el, h('p', { class: 'prompt' }, 'Build the sentence'), h('p', { class: 'sub big-en' }, ex.prompt), ans, bank);
      return {
        check() {
          const got = chosen.map(c => c.w).join(' ');
          const r = L.judge(got, [ex.answer]);
          return { ok: r !== 'no', almost: r === 'accent', yours: r === 'no' ? got : null, answer: ex.answer, hear: ex.answer, why: ex.why };
        }
      };
    },

    fix(ex, api, el) {
      const toks = T(ex.sentence).split(' ');
      let sel = -1;
      const chips = toks.map((t, i) => h('button', { class: 'word', type: 'button', onclick: () => { sel = i; chips.forEach((c, j) => c.classList.toggle('sel', j === i)); api.enable(); } }, t));
      push(el, h('p', { class: 'prompt' }, 'Tap the word that is wrong'), h('div', { class: 'words' }, chips));
      return {
        check() { if (sel < 0) return null; return { ok: sel === ex.wrong, answer: T(ex.fixed), show: T(ex.fixed), hear: T(ex.fixed), why: ex.why, penFrom: toks[ex.wrong], penTo: T(ex.fixed).split(' ')[ex.wrong] }; },
        reveal(res) { chips[ex.wrong].classList.add('good'); if (!res.ok && sel >= 0 && sel !== ex.wrong) chips[sel].classList.add('bad'); }
      };
    },

    match(ex, api, el) {
      api.hideCheck();
      const n = ex.pairs.length;
      const left = L.shuffle(ex.pairs.map((p, i) => ({ t: p[0], i })));
      const right = L.shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
      let sel = null; let matched = 0; let mistakes = 0;
      function click(side, it, btn) {
        if (btn.classList.contains('matched')) return;
        if (!sel) { sel = { side, it, btn }; btn.classList.add('sel'); if (side === 'l') say(it.t); return; }
        if (sel.side === side) { sel.btn.classList.remove('sel'); sel = { side, it, btn }; btn.classList.add('sel'); if (side === 'l') say(it.t); return; }
        const a = sel.btn; const b = btn; const ok = sel.it.i === it.i;
        sel = null; a.classList.remove('sel');
        if (ok) {
          a.classList.add('matched'); b.classList.add('matched'); matched++;
          if (matched === n) api.complete({ ok: mistakes === 0, why: mistakes ? 'A few mismatches, so these will come back.' : 'All matched first time.' });
        } else {
          mistakes++; a.classList.add('shake'); b.classList.add('shake');
          setTimeout(() => { a.classList.remove('shake'); b.classList.remove('shake'); }, 350);
        }
      }
      const col = (arr, side) => h('div', { class: 'mcol' }, arr.map(it => { const b = h('button', { class: 'opt', type: 'button' }, it.t); b.addEventListener('click', () => click(side, it, b)); return b; }));
      push(el, h('p', { class: 'prompt' }, ex.prompt), h('div', { class: 'match' }, col(left, 'l'), col(right, 'r')));
      return {};
    },

    rapid(ex, api, el) {
      api.hideCheck();
      let i = 0; let right = 0;
      const box = h('div', { class: 'rapid' });
      push(el, h('p', { class: 'prompt' }, ex.prompt), box);
      function show() {
        if (i >= ex.items.length) {
          api.complete({ ok: right >= Math.ceil(ex.items.length * 0.75), counted: true, head: 'Rapid fire: ' + right + ' of ' + ex.items.length, why: '' });
          return;
        }
        const it = ex.items[i];
        const s = it.blank ? sentenceEl(it.blank) : { el: h('div', { class: 'sentence' }, T(it.text)), slot: null };
        const fb = h('div', { class: 'rapid-fb', 'aria-live': 'polite' });
        const btns = ex.choices.map(c => h('button', { class: 'btn big ' + (c.tone ? tone(c.tone) : 'ghost'), type: 'button', onclick: () => choose(c.key) }, c.label));
        function choose(key) {
          btns.forEach(b => { b.disabled = true; });
          const ok = key === it.answer;
          api.record(it.skill || ex.skill, ok);
          if (ok) right++;
          fb.className = 'rapid-fb ' + (ok ? 'good' : 'bad');
          put(fb, h('b', {}, (ok ? '' : 'No: ') + T(it.full)), h('span', { class: 'muted' }, ' ' + it.why));
          if (s.slot) s.slot.textContent = it.fill;
          const nextBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => { i++; show(); } }, i + 1 === ex.items.length ? 'Finish' : 'Next');
          fb.append(h('div', { class: 'row end' }, nextBtn));
          nextBtn.focus();
        }
        put(box, h('div', { class: 'rapid-count' }, (i + 1) + ' of ' + ex.items.length), s.el,
          h('div', { class: 'rapid-btns', style: { '--n': String(ex.choices.length) } }, btns), fb);
      }
      show();
      return {};
    }
  };

  function textType(ex, api, el, isGap) {
    const s = isGap ? sentenceEl(ex.q) : null;
    const input = h('input', { class: 'text', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Your answer', placeholder: isGap ? 'Missing word' : 'In Spanish' });
    input.addEventListener('input', () => { api.enable(input.value.trim().length > 0); if (s && s.hasSlot) s.slot.textContent = input.value || ' '; });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); api.submit(); } });
    push(el,
      h('p', { class: 'prompt' }, isGap ? 'Fill the gap' : 'Say it in Spanish'),
      isGap ? s.el : h('div', { class: 'sentence en-q' }, T(ex.q)),
      isGap && ex.hint ? h('p', { class: 'sub' }, (ex.hintLabel || 'Hint') + ' ', h('span', { class: 'hintchip ' + tone(ex.hintTone) }, ex.hint)) : null,
      input);
    setTimeout(() => input.focus(), 50);
    return {
      check() {
        if (!input.value.trim()) return null;
        const r = L.judge(input.value, ex.answer);
        const shown = isGap ? ex.answer[0] : prettyAns(ex.answer.slice(0, 2));
        const res = { ok: r !== 'no', almost: r === 'accent', yours: input.value.trim(), answer: shown, hear: isGap ? null : ex.answer[0], why: ex.why };
        if (!isGap && r === 'no') res.card = { id: 'x-' + ex.q.toLowerCase().replace(/[^a-z]/g, '').slice(0, 24), es: prettyAns([ex.answer[0]]), en: ex.q, alts: ex.answer.slice(1).map(a => prettyAns([a])) };
        return res;
      }
    };
  }

  function exerciseRunner(list, stats, onDone) {
    const usable = list.filter(e => e.type !== 'listen' || hasVoice());
    const queue = usable.map(e => ({ e, retry: false }));
    const total = usable.length;
    let finished = 0;
    const root = h('div', { class: 'runner' });
    const counter = h('div', { class: 'counter' });
    const fill = h('i');
    const body = h('div', { class: 'ex-body' });
    push(root, counter, h('div', { class: 'bar' }, fill), body);

    function nextItem() {
      const item = queue.shift();
      if (!item) { fill.style.transform = 'scaleX(1)'; onDone(); return; }
      renderItem(item);
    }

    function renderItem(item) {
      const ex = item.e;
      if (window.__trainer) window.__trainer.current = ex; // test hook
      counter.textContent = item.retry ? 'Second chance' : Math.min(finished + 1, total) + ' of ' + total;
      fill.style.transform = 'scaleX(' + (finished / Math.max(total, 1)) + ')';
      const holder = h('div', { class: 'ex ex-' + ex.type });
      const fb = h('div', { class: 'feedback hidden', 'aria-live': 'polite' });
      const btn = h('button', { class: 'btn primary big check', type: 'button', disabled: true }, 'Check');
      let checked = false;

      function onKey(e) {
        if (e.key === 'Enter' && !e.repeat && checked && e.target === document.body) { e.preventDefault(); advance(); }
      }
      function advance() { document.removeEventListener('keydown', onKey); nextItem(); }

      const api = {
        enable(on) { if (!checked) btn.disabled = on === false; },
        hideCheck() { btn.classList.add('hidden'); },
        submit() { if (!btn.disabled) btn.click(); },
        record(skill, ok) {
          if (!root.isConnected) return;
          stats.total++; if (ok) { stats.right++; addXp(5); }
          recordSkill(skill, ok); save();
        },
        complete(res) { if (!root.isConnected || checked) return; finish(res); }
      };

      const inst = TYPES[ex.type](ex, api, holder) || {};

      function finish(res) {
        checked = true;
        holder.classList.add('locked');
        if (inst.reveal) inst.reveal(res);
        if (!res.counted) {
          if (!item.retry) { stats.total++; if (res.ok) stats.right++; }
          if (res.ok) addXp(item.retry ? 5 : 10);
          recordSkill(ex.skill, res.ok);
          save();
        }
        if (!item.retry) finished++;
        if (!res.ok && !item.retry && ex.type !== 'rapid') queue.push({ e: ex, retry: true });
        if (!res.ok && res.card) addCards([res.card]);

        const good = res.ok;
        fb.className = 'feedback ' + (good ? (res.almost ? 'warn' : 'good') : 'bad');
        const head = res.head || (good ? (res.almost ? 'Right, but watch the accents' : PRAISE[Math.floor(Math.random() * PRAISE.length)]) : (item.retry ? 'Not quite. Moving on' : 'Not quite'));
        let mark = null;
        if (res.penFrom && !good) mark = pen(res.penFrom, res.penTo);
        else if (!good && res.yours) mark = pen(res.yours, res.answer);
        else if (!good && res.answer) mark = pen(null, res.answer);
        else if (good && res.almost) mark = pen(res.yours, res.answer);
        put(fb,
          h('div', { class: 'fb-head' }, head),
          mark,
          res.show && good && !res.almost ? h('div', { class: 'fb-ans' }, res.show) : null,
          !good && res.penFrom ? h('div', { class: 'fb-ans' }, res.show) : null,
          res.why ? h('div', { class: 'fb-why' }, res.why) : null,
          res.hear ? speakBtn(res.hear, 'Hear it') : null);
        fb.classList.remove('hidden');
        btn.classList.remove('hidden');
        btn.textContent = 'Continue';
        btn.disabled = false;
        btn.focus();
        fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      btn.addEventListener('click', () => {
        if (checked) { advance(); return; }
        const res = inst.check && inst.check();
        if (res) finish(res);
      });
      document.addEventListener('keydown', onKey);
      put(body, holder, fb, h('div', { class: 'row end sticky' }, btn));
    }

    nextItem();
    return root;
  }

  // ---------- free-write (AI) ----------
  function renderCorrection(d, target) {
    const label = { great: 'Excellent', good: 'Nice work', 'keep going': 'Good try, keep going' };
    put(target,
      h('div', { class: 'verdict v-' + d.verdict.replace(' ', '-') }, label[d.verdict] || 'Nice work'),
      d.mistakes.length
        ? h('div', { class: 'mistakes' }, d.mistakes.map(m => h('div', { class: 'mistake' }, pen(m.wrong, m.right), h('div', { class: 'why' }, m.why))))
        : h('p', { class: 'praise' }, 'No mistakes found.'),
      d.corrected ? h('div', { class: 'corrected' }, h('div', { class: 'label' }, 'Polished version'), h('div', { class: 'big' }, d.corrected), speakBtn(d.corrected, 'Hear it')) : null,
      d.praise ? h('p', { class: 'praise' }, h('b', {}, 'What worked: '), d.praise) : null,
      d.tip ? h('p', { class: 'tip' }, h('b', {}, 'Tip: '), d.tip) : null);
  }

  function writeStep(ch, next) {
    const w = ch.write;
    const ta = h('textarea', { class: 'text area', rows: '4', placeholder: T(w.starter), 'aria-label': 'Your sentences' });
    const out = h('div', { class: 'ai-out' });
    let busy = false; let rewarded = false;
    const btn = h('button', { class: 'btn ghost big', type: 'button' }, AI.on ? 'Check with the AI tutor' : 'Show a model answer');
    btn.addEventListener('click', async () => {
      if (busy) return;
      if (!AI.on) {
        put(out,
          h('div', { class: 'corrected' }, h('div', { class: 'label' }, 'Model answer'), h('div', { class: 'big' }, T(w.model)), speakBtn(T(w.model), 'Hear it')),
          h('p', { class: 'muted' }, 'Compare yours with it and tick off:'),
          h('ul', { class: 'check-list' }, w.checklist.map(c => h('li', {}, h('label', {}, h('input', { type: 'checkbox' }), c)))),
          h('p', { class: 'meta' }, 'With the AI tutor on, it corrects your exact sentences and explains why.'));
        return;
      }
      if (!ta.value.trim()) { ta.focus(); return; }
      busy = true; btn.disabled = true; btn.textContent = 'Reading it';
      put(out, h('div', { class: 'spinner', role: 'status' }, 'Your tutor is reading it…'));
      const r = await ai('correct', { task: w.task, sentence: ta.value });
      busy = false; btn.disabled = false; btn.textContent = 'Check again';
      if (r.ok) {
        renderCorrection(r.data, out);
        if (!rewarded) { rewarded = true; addXp(15); }
      } else {
        put(out, h('p', { class: 'error' }, r.error || 'Something went wrong.'), h('p', { class: 'meta' }, 'You can carry on: the rest of the chapter does not need AI.'));
      }
    });
    return h('div', { class: 'step' },
      h('h2', {}, w.title),
      h('p', { class: 'lead' }, T(w.task)),
      ta, h('div', { class: 'row' }, btn), out,
      contBtn('Continue to the scenario', next));
  }

  // ---------- boss level ----------
  function bubble(who, text, en, hearable) {
    const enEl = h('div', { class: 'en hidden' }, en || '');
    return h('div', { class: 'bubble ' + (who ? 'npc' : 'me') },
      who ? h('span', { class: 'who' }, who) : null,
      h('div', { class: 'es' }, text),
      who ? h('div', { class: 'bub-tools' },
        hearable ? speakBtn(text) : null,
        en ? h('button', { class: 'mini lbl', type: 'button', 'aria-label': 'Show English', onclick: () => enEl.classList.toggle('hidden') }, 'EN') : null) : null,
      enEl);
  }

  function bossStep(ch, next, stats) {
    const b = ch.boss;
    let t = 0; let slips = 0; let missedThisTurn = false;
    const log = h('div', { class: 'chat' });
    const choices = h('div', { class: 'choices' });
    const why = h('p', { class: 'nudge hidden' });
    const footer = h('div', { class: 'boss-foot' });
    const wrap = h('div', { class: 'step boss' }, h('h2', {}, T(b.title)), h('p', { class: 'muted' }, 'Pick the right reply. Tap EN on a message for the English.'), log, choices, why, footer);

    function showTurn() {
      const turn = b.turns[t];
      missedThisTurn = false;
      log.append(bubble(b.who, T(turn.npc), T(turn.en), true));
      say(T(turn.npc));
      why.classList.add('hidden');
      const shuffled = L.shuffle(turn.choices);
      put(choices, ...shuffled.map(([text, good, reason]) => {
        const btn = h('button', { class: 'opt', type: 'button' }, T(text));
        btn.addEventListener('click', () => {
          if (good) {
            choices.querySelectorAll('button').forEach(x => { x.disabled = true; });
            btn.classList.add('good');
            log.append(bubble(null, T(text)));
            stats.total++; if (!missedThisTurn) stats.right++;
            addXp(missedThisTurn ? 5 : 10);
            recordSkill(turn.skill || b.skill, !missedThisTurn); save();
            t++;
            setTimeout(() => { if (t < b.turns.length) showTurn(); else finish(); }, 450);
          } else {
            if (!missedThisTurn) { slips++; missedThisTurn = true; }
            btn.classList.add('bad'); btn.disabled = true;
            why.textContent = T(reason);
            why.classList.remove('hidden');
          }
        });
        return btn;
      }));
    }

    function finish() {
      put(choices);
      why.classList.add('hidden');
      log.append(bubble(b.who, T(b.closing), T(b.closingEn), true));
      put(footer,
        h('p', { class: 'lead' }, slips === 0 ? 'No slips.' : slips + (slips === 1 ? ' slip' : ' slips') + ', each one a thing you now know.'),
        AI.on
          ? h('button', { class: 'btn ghost big', type: 'button', onclick: () => aiChat(ch, wrap, next) }, 'Keep chatting with ' + b.who)
          : h('p', { class: 'meta' }, 'With the AI tutor on, you can keep chatting freely with ' + b.who + ' here.'),
        contBtn('Finish chapter', next));
    }

    showTurn();
    return wrap;
  }

  function aiChat(ch, wrap, next) {
    const b = ch.boss;
    const history = [{ role: 'assistant', content: T(b.chatOpening) }];
    const log = h('div', { class: 'chat' });
    let lastHint = ''; let sent = 0; let busy = false;
    const MAX = 14;
    const hintOut = h('p', { class: 'nudge hidden' });
    const input = h('input', { class: 'text', type: 'text', autocomplete: 'off', placeholder: 'Escribe en español', 'aria-label': 'Your message' });
    const sendBtn = h('button', { class: 'btn primary', type: 'button', 'aria-label': 'Send' }, icon('send'), 'Send');
    const hintBtn = h('button', { class: 'btn quiet', type: 'button', onclick: () => { hintOut.textContent = lastHint ? 'Try: ' + lastHint : 'Try answering the question in one short sentence.'; hintOut.classList.remove('hidden'); } }, icon('hint'), 'Hint');
    log.append(bubble(b.who, T(b.chatOpening), T(b.chatOpeningEn), true));

    async function send() {
      const text = input.value.trim();
      if (!text || busy) return;
      busy = true; input.value = ''; sendBtn.disabled = true; hintOut.classList.add('hidden');
      const userBub = bubble(null, text); log.append(userBub);
      const prior = history.slice();
      history.push({ role: 'user', content: text }); sent++;
      const thinking = h('div', { class: 'spinner small' }, b.who + ' is typing…'); log.append(thinking);
      const r = await ai('roleplay', { chapter: ch.n, history: prior, user: text });
      thinking.remove();
      if (r.ok) {
        const d = r.data;
        if (d.correction) userBub.append(h('div', { class: 'corr' }, d.correction));
        history.push({ role: 'assistant', content: d.reply });
        lastHint = d.hint;
        log.append(bubble(b.who, d.reply, d.english, true));
        say(d.reply);
        addXp(5);
      } else {
        log.append(h('p', { class: 'error' }, r.error || 'Something went wrong.'));
      }
      busy = false; sendBtn.disabled = false;
      if (sent >= MAX) { input.disabled = true; sendBtn.disabled = true; log.append(h('p', { class: 'lead' }, '¡Hasta luego! That was a long conversation, well done.')); }
      else input.focus();
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    put(wrap,
      h('h2', {}, 'Free chat with ' + b.who),
      h('p', { class: 'muted' }, 'Say anything. Mistakes are fine: ' + b.who + ' points them out gently. Tap EN for the English.'),
      log, hintOut,
      h('div', { class: 'chat-input' }, input, sendBtn, hintBtn),
      next ? contBtn('Finish chapter', next) : h('div', { class: 'row end sticky' }, h('button', { class: 'btn ghost big', onclick: home }, 'Back to today')));
    input.focus();
  }

  function chatScreen(ch) {
    const wrap = h('div', { class: 'step' });
    mount(h('div', { class: 'page lesson' }, backBar('Free chat · ' + ch.boss.who, home), wrap));
    aiChat(ch, wrap, null);
  }

  // ---------- results ----------
  function resultStep(ch, next, stats) {
    const acc = stats.total ? Math.round(stats.right / stats.total * 100) : 100;
    const first = !S.done[ch.n];
    const prev = S.done[ch.n] || {};
    S.done[ch.n] = { acc, best: Math.max(acc, prev.best || 0), date: L.dayKey() };
    addXp(first ? 30 : 10);
    const due = L.dueCards(S.srs, Date.now()).length;
    const mins = Math.max(1, Math.round((Date.now() - stats.t0) / 60000));
    return h('div', { class: 'step result' },
      h('div', { class: 'result-k' }, 'Capítulo ' + ch.n + ' completado'),
      h('div', { class: 'result-fig' }, acc + '%'),
      h('div', { class: 'result-k' }, 'right first time' + (prev.best != null ? ' · best before ' + prev.best + '%' : '')),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, '+' + (first ? 30 : 10) + ' XP'), h('span', {}, 'chapter bonus')),
        h('div', { class: 'stat' }, h('b', {}, mins + ' min'), h('span', {}, 'in this chapter')),
        h('div', { class: 'stat' }, h('b', {}, String(ch.phrases.length)), h('span', {}, 'phrases in your deck'))),
      h('p', { class: 'lead' }, T(ch.doneText) + ' Your phrases are in the review deck and will come back at the right moment.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary big', onclick: home }, 'Back to today'),
        due ? h('button', { class: 'btn ghost big', onclick: reviewFlow }, 'Review ' + due + ' now') : null));
  }

  // ---------- weak-spot drill ----------
  function drillWeak() {
    const weak = weakSkills();
    const pool = [];
    CHAPTERS.forEach(ch => ch.exercises.forEach(e => { if (e.type !== 'rapid' && weak.includes(e.skill)) pool.push(e); }));
    const list = L.shuffle(pool).slice(0, 10);
    if (!list.length) return home();
    const stats = { right: 0, total: 0, t0: Date.now() };
    const content = exerciseRunner(list, stats, () => {
      mount(h('div', { class: 'page lesson' }, backBar('Weak spots', home), h('div', { class: 'step result' },
        h('div', { class: 'result-k' }, 'Weak spots done'),
        h('div', { class: 'result-fig' }, stats.right + ' of ' + stats.total),
        h('div', { class: 'result-k' }, 'right first time'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary big', onclick: home }, 'Back to today')))));
    });
    mount(h('div', { class: 'page lesson' }, backBar('Weak spots · ' + skillName(weak[0]), home), content));
  }

  // ---------- review (spaced repetition) ----------
  function reviewFlow() {
    const queue = L.dueCards(S.srs, Date.now()).slice(0, 20);
    if (!queue.length) { home(); return; }
    const total = queue.length; let seen = 0; let right = 0;
    const lapsed = new Set(); // missed once this session: a correct re-ask must not promote the card
    const body = h('div', { class: 'step' });
    const wrap = h('div', { class: 'page lesson' }, backBar('Review', home), body);
    mount(wrap);
    S.reviewed[L.dayKey()] = true; save();

    function variants(card) {
      const base = [card.es].concat(card.alts || []);
      const extra = base.map(a => a.replace(/^(el|la|los|las|un|una)\s+/i, '')).concat(base.map(a => a.replace(/\s*\(de\)\s*/i, ' ')));
      return base.concat(extra);
    }
    function next() {
      const card = queue.shift();
      if (!card) { done(); return; }
      let checked = false;
      const input = h('input', { class: 'text', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'In Spanish', 'aria-label': 'Your answer' });
      const fb = h('div', { class: 'feedback hidden' });
      const btn = h('button', { class: 'btn primary big', type: 'button' }, 'Check');
      function check() {
        if (checked) { next(); return; }
        if (!input.value.trim()) return;
        checked = true;
        const r = L.judge(input.value, variants(card));
        const ok = r !== 'no';
        const relearn = lapsed.has(card.id);
        if (ok && relearn) S.srs[card.id] = Object.assign({}, S.srs[card.id], { box: 1, due: Date.now() + L.INTERVALS[1] * L.DAY });
        else S.srs[card.id] = L.srsGrade(S.srs[card.id], ok, Date.now());
        if (ok) { if (!relearn) right++; addXp(relearn ? 2 : 5); }
        else { if (!relearn) queue.push(S.srs[card.id]); lapsed.add(card.id); }
        seen++;
        save();
        fb.className = 'feedback ' + (ok ? (r === 'accent' ? 'warn' : 'good') : 'bad');
        put(fb,
          h('div', { class: 'fb-head' }, ok ? (r === 'accent' ? 'Right, but watch the accents' : PRAISE[Math.floor(Math.random() * PRAISE.length)]) : 'Not quite'),
          ok && r !== 'accent' ? h('div', { class: 'fb-ans' }, card.es) : pen(input.value.trim(), card.es),
          card.alts && card.alts.length ? h('div', { class: 'meta' }, 'Also right: ' + card.alts.join(', ')) : null,
          card.ex ? h('div', { class: 'fb-why' }, card.ex) : null,
          speakBtn(card.es, 'Hear it'));
        fb.classList.remove('hidden');
        btn.textContent = 'Continue';
        input.disabled = true;
        btn.focus();
      }
      btn.addEventListener('click', check);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      put(body,
        h('div', { class: 'counter' }, 'Card ' + Math.min(seen + 1, total) + ' of ' + total),
        h('div', { class: 'bar' }, h('i', { style: { transform: 'scaleX(' + (seen / total) + ')' } })),
        h('p', { class: 'prompt', style: { 'margin-top': '32px' } }, 'How do you say'),
        h('div', { class: 'sentence en-q' }, card.en),
        input, fb, h('div', { class: 'row end sticky' }, btn));
      input.focus();
    }
    function done() {
      put(body,
        h('div', { class: 'result-k' }, 'Review done'),
        h('div', { class: 'result-fig' }, right + ' of ' + total),
        h('div', { class: 'result-k' }, 'right first time'),
        h('p', { class: 'lead', style: { 'margin-top': '24px' } }, 'Cards you knew come back in a few days. Misses come back tomorrow.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary big', onclick: home }, 'Back to today')));
    }
    next();
  }

  // ---------- word of the day ----------
  function wotdScreen() {
    const today = L.dayKey();
    const w = todaysWord();
    const done = !!S.wotd.done[today];
    const ta = h('textarea', { class: 'text area', rows: '3', placeholder: w.starter, 'aria-label': 'Your sentence', value: done ? (S.wotd.answers[today] || '') : '' });
    const out = h('div', { class: 'ai-out' });
    let busy = false;

    function complete(sentence) {
      if (S.wotd.done[today]) return;
      S.wotd.done[today] = true;
      S.wotd.answers[today] = sentence;
      if (!S.wotd.learned.includes(w.id)) S.wotd.learned.push(w.id);
      addCards([{ id: 'w-' + w.id, es: w.es, en: w.en, alts: w.alts || [], ex: w.ex.es + ' (' + w.ex.en + ')' }]);
      addXp(15);
    }

    const btn = h('button', { class: 'btn primary big', type: 'button' }, done ? 'Check again' : 'Check my sentence');
    btn.addEventListener('click', async () => {
      if (busy) return;
      const sentence = ta.value.trim();
      if (!sentence) { ta.focus(); return; }
      const used = L.usedWord(sentence, w.forms);
      busy = true; btn.disabled = true;
      if (AI.on) {
        put(out, h('div', { class: 'spinner', role: 'status' }, 'Reading your sentence…'));
        const r = await ai('wotd', { word: w.es, meaning: w.en, question: w.q, sentence });
        busy = false; btn.disabled = false;
        if (!r.ok) {
          put(out, h('p', { class: 'error' }, r.error || 'Something went wrong.'),
            used ? h('p', { class: 'muted' }, 'You used the word, so it counts. The AI check was not available.') : null);
          if (used) complete(sentence);
          return;
        }
        const d = r.data;
        const fixedDiff = d.corrected && d.corrected.trim() !== sentence;
        put(out,
          h('div', { class: 'verdict ' + (d.used ? (d.correct ? 'v-great' : 'v-good') : 'v-keep-going') },
            d.used ? (d.correct ? '¡Perfecto! You used it well' : 'You used it, nearly there') : 'Try to include "' + w.es + '"'),
          d.used && fixedDiff ? pen(sentence, d.corrected) : null,
          d.feedback ? h('p', {}, d.feedback) : null,
          d.natural ? h('p', { class: 'tip' }, h('b', {}, 'More natural: '), d.natural) : null,
          d.corrected && d.used ? speakBtn(d.corrected, 'Hear it') : null);
        if (d.used || used) complete(sentence);
      } else {
        busy = false; btn.disabled = false;
        put(out,
          h('div', { class: 'verdict ' + (used ? 'v-great' : 'v-keep-going') }, used ? 'You used "' + w.es + '"' : 'I can\'t see "' + w.es + '" in your sentence yet'),
          used ? h('p', { class: 'muted' }, 'Compare with the example above to check the grammar. With the AI tutor on, it checks it for you.') : h('p', { class: 'muted' }, 'Look at the example above and try again.'));
        if (used) complete(sentence);
      }
    });

    const learned = S.wotd.learned.map(id => WORDS.find(x => x.id === id)).filter(Boolean);
    mount(h('div', { class: 'page lesson' }, backBar('Palabra del día', home),
      h('div', { class: 'step' },
        h('div', { class: 'wotd-hero' },
          h('div', { class: 'meta' }, w.pos),
          h('div', { class: 'wotd-big' }, w.es, speakBtn(w.es)),
          h('div', { class: 'wotd-en' }, w.en)),
        h('div', { class: 'example' }, h('div', { class: 'es' }, w.ex.es, ' ', speakBtn(w.ex.es)), h('div', { class: 'en' }, w.ex.en)),
        h('div', { class: 'wq' }, h('div', { class: 'label' }, 'Your turn'), h('p', { class: 'lead' }, w.q)),
        ta, h('div', { class: 'row' }, btn), out,
        done ? h('p', { class: 'meta', style: { 'margin-top': '16px' } }, 'Done for today. A new word arrives tomorrow, and this one is in your review deck.') : null,
        learned.length > 1 ? h('details', { class: 'learned' }, h('summary', {}, 'Your words so far (' + learned.length + ')'),
          h('ul', {}, learned.map(x => h('li', {}, h('b', {}, x.es), ' · ' + x.en)))) : null)));
  }

  // ---------- go ----------
  async function getJson(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' (' + r.status + ')');
    return r.json();
  }
  async function boot() {
    try {
      const idx = await getJson('courses/index.json');
      const entry = idx.courses[0];
      const base = 'courses/' + entry.file.replace(/[^/]+$/, '');
      COURSE = await getJson('courses/' + entry.file);
      CHAPTERS = (await Promise.all(COURSE.chapters.map(f => getJson(base + f)))).sort((a, b) => a.n - b.n);
      WORDS = await getJson(base + COURSE.words);
      ROADMAP = COURSE.roadmap || [];
      SKILLS = Object.assign({}, COURSE.skills, ...CHAPTERS.map(c => c.skills || {}));
      KEY = COURSE.storageKey;
      S = load(); pruneTime(); save();
      pickVoice();
    } catch (e) {
      mount(h('div', { class: 'page' }, h('div', { class: 'top' }, h('div', { class: 'wordmark' }, 'Español Trainer')),
        h('h1', { class: 'page-title' }, 'The lessons could not load'),
        h('p', {}, 'Start the trainer with start.bat and open it at the address it shows (http://localhost:3000). Opening index.html directly does not work.'),
        h('p', { class: 'meta' }, String(e.message || e))));
      return;
    }
    window.__trainer = { state: () => S, home, chapterFlow, reviewFlow, wotdScreen, drillWeak, chatScreen, ai: () => AI, chapters: CHAPTERS, words: WORDS, course: COURSE };
    await aiStatus();
    if (SYNC.on) await syncStart();
    home();
  }
  boot();
})();
