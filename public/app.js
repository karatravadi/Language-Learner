/* Español Trainer: front end. Plain JavaScript, no dependencies. */
(function () {
  'use strict';

  const L = window.Logic;
  const WORDS = window.WORDS;
  const CHAPTERS = window.CHAPTERS;
  const ROADMAP = window.ROADMAP;
  const KEY = 'espanol-trainer-v1';
  const DAILY_GOAL = 50;

  const SKILL_NAMES = {
    'ser-id': 'SER: identity, origin, job', 'estar-loc': 'ESTAR: location', 'estar-state': 'ESTAR: feelings & states',
    'conj-ser': 'Forms of SER', 'conj-estar': 'Forms of ESTAR', twist: 'Ser/estar meaning twists',
    phrases: 'Everyday phrases', mixed: 'Ser or estar?'
  };
  const PRAISE = ['¡Correcto!', '¡Muy bien!', '¡Eso es!', '¡Perfecto!', '¡Genial!', '¡Exacto!'];

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
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value' || k === 'disabled' || k === 'checked') el[k] = v;
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

  // ---------- state ----------
  function defaults() {
    return {
      name: 'Kara', fem: true, xp: 0, streak: { last: null, count: 0 }, dayXp: { date: '', xp: 0 },
      done: {}, srs: {}, skills: {}, wotd: { byDate: {}, learned: [], done: {}, answers: {} }
    };
  }
  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        return Object.assign(d, o, {
          streak: Object.assign(d.streak, o.streak || {}),
          dayXp: Object.assign(d.dayXp, o.dayXp || {}),
          wotd: Object.assign(d.wotd, o.wotd || {})
        });
      }
    } catch (e) { /* start fresh */ }
    return d;
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode etc. */ } }

  const T = s => String(s == null ? '' : s).replace(/\{name\}/g, S.name).replace(/\{o\}/g, S.fem ? 'a' : 'o');

  function addXp(n) {
    const t = L.dayKey();
    S.xp += n;
    if (S.dayXp.date !== t) S.dayXp = { date: t, xp: 0 };
    S.dayXp.xp += n;
    S.streak = L.updateStreak(S.streak, t);
    save();
  }
  const dayXpToday = () => (S.dayXp.date === L.dayKey() ? S.dayXp.xp : 0);
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

  // ---------- speech ----------
  const TTS = { ok: 'speechSynthesis' in window, voice: null };
  function pickVoice() {
    if (!TTS.ok) return;
    const vs = speechSynthesis.getVoices();
    TTS.voice = vs.find(v => /^es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
  }
  if (TTS.ok) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  const hasSpanishVoice = () => TTS.ok && !!TTS.voice;
  function say(text, slow) {
    if (!hasSpanishVoice()) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/\{.*?\}/g, ''));
    u.lang = TTS.voice.lang || 'es-ES';
    u.voice = TTS.voice;
    u.rate = slow ? 0.65 : 0.9;
    speechSynthesis.speak(u);
  }
  function speakBtn(text, label) {
    if (!hasSpanishVoice()) return null;
    return h('button', { class: 'mini', type: 'button', 'aria-label': 'Listen', onclick: e => { e.stopPropagation(); say(text); } }, label || '🔊');
  }

  // ---------- AI (optional; the app works without it) ----------
  const AI = { on: false, model: '', provider: '' };
  async function aiStatus() {
    try { const r = await fetch('/api/status'); const j = await r.json(); AI.on = !!j.ai; AI.model = j.model || ''; AI.provider = j.provider || ''; } catch (e) { /* offline server */ }
  }
  async function ai(mode, payload) {
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ mode }, payload)) });
      return await r.json();
    } catch (e) {
      return { ok: false, error: 'Could not reach the trainer. Is the black start window still open?' };
    }
  }

  // ---------- small UI pieces ----------
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bits = ['🎉', '✨', '🌟', '💃', '🎊'];
    const wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (let i = 0; i < 28; i++) {
      wrap.append(h('span', { style: { left: Math.random() * 100 + '%', animationDelay: Math.random() * 0.8 + 's', fontSize: (16 + Math.random() * 16) + 'px' } }, bits[i % bits.length]));
    }
    document.body.append(wrap);
    setTimeout(() => wrap.remove(), 3600);
  }
  function chip(icon, value, label) {
    return h('div', { class: 'chip', title: label }, h('span', {}, icon), h('b', {}, String(value)));
  }
  function backBar(title, onBack) {
    return h('div', { class: 'lesson-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: onBack }, '←'),
      h('div', { class: 'lesson-title' }, title));
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

  // ---------- home ----------
  function todaysWord() {
    const today = L.dayKey();
    const id = L.pickWord(S.wotd, WORDS.map(w => w.id), today);
    if (S.wotd.byDate[today] !== id) { S.wotd.byDate[today] = id; save(); }
    return WORDS.find(w => w.id === id);
  }

  function home() {
    const today = L.dayKey();
    const streak = L.liveStreak(S.streak, today);
    const due = L.dueCards(S.srs, Date.now()).length;
    const weak = weakSkills();
    const gx = Math.min(dayXpToday(), DAILY_GOAL);
    const word = todaysWord();
    const wdone = !!S.wotd.done[today];

    const wotd = h('button', { class: 'wotd' + (wdone ? ' done' : ''), onclick: wotdScreen },
      h('div', { class: 'wotd-k' }, 'Palabra del día'),
      h('div', { class: 'wotd-w' }, word.es),
      h('div', { class: 'wotd-m' }, wdone ? '✓ Done today: ' + word.en : 'Learn it, then use it in a sentence · 2 min'),
      h('span', { class: 'wotd-go' }, wdone ? 'See it again' : 'Start'));

    const reviewTile = h('button', { class: 'tile2', disabled: due === 0, onclick: reviewFlow },
      h('div', { class: 'tile2-n' }, String(due)),
      h('div', { class: 'tile2-t' }, 'Review'),
      h('div', { class: 'tile2-s' }, due ? 'cards ready · ~' + Math.max(1, Math.round(due * 0.4)) + ' min' : 'nothing due yet'));
    const weakTile = h('button', { class: 'tile2', disabled: weak.length === 0, onclick: drillWeak },
      h('div', { class: 'tile2-n' }, String(weak.length)),
      h('div', { class: 'tile2-t' }, 'Weak spots'),
      h('div', { class: 'tile2-s' }, weak.length ? SKILL_NAMES[weak[0]] || weak[0] : 'none yet, nice'));

    const path = CHAPTERS.map(ch => {
      const d = S.done[ch.id];
      return h('button', { class: 'chap' + (d ? ' done' : ''), onclick: () => chapterFlow(ch) },
        h('div', { class: 'chap-n' }, d ? '✓' : String(ch.id)),
        h('div', { class: 'chap-b' },
          h('div', { class: 'chap-t' }, ch.emoji + ' ' + ch.title),
          h('div', { class: 'chap-s' }, ch.sub + ' · ' + ch.mins + ' min'),
          h('div', { class: 'chap-c' }, 'You will be able to: ' + ch.can.charAt(0).toLowerCase() + ch.can.slice(1))),
        h('span', { class: 'chap-go' }, d ? 'Replay · best ' + d.best + '%' : 'Start'));
    }).concat(ROADMAP.map(r => h('div', { class: 'chap locked', 'aria-disabled': 'true' },
      h('div', { class: 'chap-n' }, String(r.n)),
      h('div', { class: 'chap-b' },
        h('div', { class: 'chap-t' }, r.emoji + ' ' + r.title),
        h('div', { class: 'chap-c' }, r.can)),
      h('span', { class: 'chap-go' }, 'Coming next'))));

    const aiChip = h('button', { class: 'ai-chip ' + (AI.on ? 'on' : 'off'), onclick: aiHelp },
      AI.on ? '🤖 AI tutor is on' : '🤖 AI tutor is off · tap to set up');

    mount(h('div', { class: 'page home' },
      h('header', { class: 'top' },
        h('div', { class: 'brand' }, h('div', { class: 'logo' }, '¡Hola, ' + S.name + '!'), h('div', { class: 'tag' }, 'Spanish from Spain · A1 → A2')),
        h('div', { class: 'chips' }, chip('🔥', streak, 'day streak'), chip('⭐', S.xp, 'total XP'),
          h('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: settings }, '⚙️'))),
      h('div', { class: 'goal' },
        h('div', { class: 'goal-row' }, h('span', {}, 'Today'), h('b', {}, gx + ' / ' + DAILY_GOAL + ' XP')),
        h('div', { class: 'bar' }, h('i', { style: { width: (gx / DAILY_GOAL * 100) + '%' } }))),
      wotd,
      h('div', { class: 'tiles2' }, reviewTile, weakTile),
      h('h2', { class: 'sec' }, 'Your path'),
      h('div', { class: 'path' }, path),
      h('div', { class: 'foot' }, aiChip, h('p', { class: 'muted small' }, 'A good day: your word, a review, and one chapter (about 20 minutes).'))));
  }

  // ---------- settings & AI help ----------
  function settings() {
    const name = h('input', { class: 'text', value: S.name, maxlength: '30', 'aria-label': 'Your name' });
    const fem = h('input', { type: 'radio', name: 'g', checked: S.fem, id: 'g-f' });
    const masc = h('input', { type: 'radio', name: 'g', checked: !S.fem, id: 'g-m' });
    const ov = modal(h('div', {},
      h('h2', {}, 'Settings'),
      h('label', { class: 'field' }, h('span', {}, 'What should I call you?'), name),
      h('div', { class: 'field' }, h('span', {}, 'Endings in examples (cansada / cansado)'),
        h('div', { class: 'radios' }, h('label', {}, fem, ' -a (cansada)'), h('label', {}, masc, ' -o (cansado)'))),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => { S.name = name.value.trim() || 'Kara'; S.fem = fem.checked; save(); ov.remove(); home(); } }, 'Save'),
        h('button', { class: 'btn ghost danger', onclick: () => { if (confirm('Erase all progress, review cards and streak on this device?')) { S = defaults(); save(); ov.remove(); home(); } } }, 'Reset progress')),
      h('p', { class: 'muted small' }, 'Your progress is saved in this browser on this computer. Use the same browser each time.')));
  }

  function aiHelp() {
    modal(h('div', {},
      h('h2', {}, AI.on ? 'AI tutor: on' : 'Switch on the AI tutor'),
      AI.on
        ? h('p', {}, 'Connected (' + (AI.provider || 'AI') + ', model: ' + AI.model + '). It corrects your free-written sentences, checks your word-of-the-day sentence and chats with Lucía. Everything else works without it.')
        : h('div', {},
          h('p', {}, 'Everything works without AI. The tutor adds sentence correction and free chat. To switch it on (about 3 minutes):'),
          h('ol', { class: 'steps-list' },
            h('li', {}, 'Free option first: get a Gemini API key at aistudio.google.com. The free tier has daily limits, and Google says free-tier prompts can be used to improve its products. (Alternative: DeepSeek at platform.deepseek.com, small free credit then pay-as-you-go.) Check their pricing pages for the latest.'),
            h('li', {}, 'Open the file settings.env (in the trainer folder) in Notepad. Paste the key after GEMINI_API_KEY= (or DEEPSEEK_API_KEY=), set PROVIDER to match, and save.'),
            h('li', {}, 'Close the black window, then double-click start.bat again.')),
          h('p', { class: 'muted small' }, 'Your key stays on this computer. It is never sent to the browser page.'))));
  }

  // ---------- lesson shell ----------
  function shell(title, step, labels, onClose, content) {
    const segs = labels.map((l, i) => h('i', { class: i < step ? 'done' : i === step ? 'on' : '' }));
    return h('div', { class: 'page lesson' },
      h('div', { class: 'lesson-top' },
        h('button', { class: 'icon-btn', 'aria-label': 'Close lesson', onclick: onClose }, '✕'),
        h('div', { class: 'lesson-title' }, title),
        h('div', { class: 'lesson-step' }, labels[step])),
      h('div', { class: 'segs' }, segs),
      content);
  }

  // ---------- chapter flow ----------
  function chapterFlow(ch) {
    const stats = { right: 0, total: 0, t0: Date.now() };
    const labels = ['Discover', 'Learn', 'Phrases', 'Practise', 'Write', 'Boss', 'Done'];
    const builders = [discoverStep, learnStep, phrasesStep, (c, next, st) => exerciseRunner(c.exercises, st, next), writeStep, bossStep, resultStep];
    let i = 0;
    function render() {
      const content = builders[i](ch, () => { i++; render(); }, stats);
      mount(shell(T(ch.title), i, labels, () => {
        if (i === labels.length - 1 || confirm('Leave this chapter? Progress in this lesson will not be kept.')) home();
      }, content));
    }
    render();
  }

  function contBtn(label, onclick) { return h('div', { class: 'row end sticky' }, h('button', { class: 'btn primary big', onclick }, label)); }

  function discoverStep(ch, next) {
    const d = ch.discover;
    const line = ([es, en]) => h('button', { class: 'ex-line', onclick: () => say(T(es)) }, h('span', { class: 'es' }, T(es)), h('span', { class: 'en' }, T(en)));
    const reveal = h('div', { class: 'reveal hidden' });
    const msg = h('p', { class: 'nudge hidden' });
    const opts = d.options.map((o, i) => h('button', {
      class: 'opt', onclick: () => {
        if (i === d.answer) {
          opts.forEach(b => b.classList.add('locked'));
          opts[i].classList.add('good');
          msg.classList.add('hidden');
          reveal.classList.remove('hidden');
          reveal.scrollIntoView({ behavior: 'smooth', block: 'start' });
          addXp(10);
        } else {
          opts[i].classList.add('bad');
          msg.textContent = 'Not quite. Look at the verbs in each colour again (soy/es/somos vs estoy/estamos/está), then try another.';
          msg.classList.remove('hidden');
        }
      }
    }, o));
    const row = r => h('div', { class: 'rowcard' }, h('b', { class: 'badge' }, r[0]), h('div', {}, h('div', { class: 'rc-l' }, r[1]), h('div', { class: 'rc-e' }, T(r[2])), h('div', { class: 'rc-t' }, T(r[3]))));
    push(reveal, 
      h('p', { class: 'lead' }, d.reveal),
      h('div', { class: 'twocol' },
        h('div', { class: 'mnem ser' }, h('h3', {}, 'SER = DOCTOR'), ch.doctor.map(row)),
        h('div', { class: 'mnem estar' }, h('h3', {}, 'ESTAR = PLACE'), ch.place.map(row))),
      contBtn('Got it, show me the verbs →', next));
    return h('div', { class: 'step' },
      h('h2', {}, 'Crack the code 🔍'),
      h('p', { class: 'lead' }, d.intro),
      h('div', { class: 'twocol' },
        h('div', { class: 'col ser' }, h('div', { class: 'col-h' }, 'Blue'), d.ser.map(line)),
        h('div', { class: 'col estar' }, h('div', { class: 'col-h' }, 'Orange'), d.estar.map(line))),
      h('p', { class: 'q' }, d.question),
      h('div', { class: 'opts' }, opts), msg, reveal);
  }

  function learnStep(ch, next) {
    const l = ch.learn;
    const table = (cls, title, rows) => h('div', { class: 'conj ' + cls }, h('h3', {}, title),
      rows.map(([p, f]) => h('button', { class: 'conj-row', onclick: () => say(p.split(' ')[0] + ' ' + f) }, h('span', { class: 'pron' }, p), h('b', { class: 'form' }, f))));
    return h('div', { class: 'step' },
      h('h2', {}, 'The verbs 🧩'),
      h('p', { class: 'muted' }, 'Tap any row to hear it.'),
      h('div', { class: 'twocol' }, table('ser', 'SER', l.ser), table('estar', 'ESTAR', l.estar)),
      h('p', { class: 'note' }, '🇪🇸 ' + l.spain.replace(/^/, '')),
      h('div', { class: 'twist' },
        h('h3', {}, l.twist.title),
        h('div', { class: 'twocol' },
          h('div', { class: 'pair ser' }, h('div', { class: 'es' }, T(l.twist.a[0])), h('div', { class: 'en' }, l.twist.a[1])),
          h('div', { class: 'pair estar' }, h('div', { class: 'es' }, T(l.twist.b[0])), h('div', { class: 'en' }, l.twist.b[1]))),
        h('p', {}, l.twist.note)),
      h('p', { class: 'note' }, '⚠️ ' + l.tener),
      contBtn('Next: phrases →', next));
  }

  function phrasesStep(ch, next) {
    addCards(ch.phrases.map(p => ({ id: p.id, es: p.es, en: p.en, alts: p.alts })));
    return h('div', { class: 'step' },
      h('h2', {}, 'Phrases you will actually use 💬'),
      h('p', { class: 'muted' }, 'These are now in your review deck, so they come back right when you are about to forget them.'),
      h('div', { class: 'phrases' }, ch.phrases.map(p => h('div', { class: 'phrase' },
        h('div', {}, h('div', { class: 'es' }, T(p.es)), h('div', { class: 'en' }, T(p.en))),
        speakBtn(T(p.es))))),
      contBtn("Let's practise →", next));
  }

  // ---------- exercises ----------
  function sentenceEl(q) {
    const parts = T(q).split('___');
    const slot = h('span', { class: 'slot' }, ' ');
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
      push(el, h('p', { class: 'prompt' }, ex.prompt || 'Choose the right option'), s.el, ex.sub ? h('p', { class: 'sub' }, T(ex.sub)) : null, h('div', { class: 'opts' }, btns));
      return {
        check() { if (sel < 0) return null; return { ok: sel === ex.answer, answer: T(ex.options[ex.answer]), why: ex.why }; },
        reveal(res) { btns[ex.answer].classList.add('good'); if (!res.ok && sel >= 0) btns[sel].classList.add('bad'); }
      };
    },

    listen(ex, api, el) {
      let sel = -1;
      const btns = optionButtons(ex.options, i => { sel = i; api.enable(); });
      push(el, 
        h('p', { class: 'prompt' }, 'Listen, then pick what it means'),
        h('div', { class: 'listen-row' },
          h('button', { class: 'btn big play', type: 'button', onclick: () => say(ex.say) }, '🔊 Play'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => say(ex.say, true) }, '🐢 Slow')),
        h('div', { class: 'opts' }, btns));
      setTimeout(() => say(ex.say), 350);
      return {
        check() { if (sel < 0) return null; return { ok: sel === ex.answer, answer: ex.options[ex.answer], show: ex.say, hear: ex.say, why: ex.why }; },
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
          return { ok: r !== 'no', almost: r === 'accent', answer: ex.answer, hear: ex.answer, why: ex.why };
        }
      };
    },

    fix(ex, api, el) {
      const toks = ex.sentence.split(' ');
      let sel = -1;
      const chips = toks.map((t, i) => h('button', { class: 'word', type: 'button', onclick: () => { sel = i; chips.forEach((c, j) => c.classList.toggle('sel', j === i)); api.enable(); } }, t));
      push(el, h('p', { class: 'prompt' }, ex.prompt || 'Tap the word that is wrong'), h('div', { class: 'words' }, chips));
      return {
        check() { if (sel < 0) return null; return { ok: sel === ex.wrong, answer: ex.fixed, show: ex.fixed, hear: ex.fixed, why: ex.why }; },
        reveal(res) { chips[ex.wrong].classList.add('good'); if (!res.ok && sel >= 0) chips[sel].classList.add('bad'); }
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
          if (matched === n) api.complete({ ok: mistakes === 0, why: mistakes ? 'A few mismatches, so we will see these again.' : 'All matched.' });
        } else {
          mistakes++; a.classList.add('shake'); b.classList.add('shake');
          setTimeout(() => { a.classList.remove('shake'); b.classList.remove('shake'); }, 450);
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
          api.complete({ ok: right >= Math.ceil(ex.items.length * 0.75), counted: true, head: 'Rapid fire: ' + right + ' / ' + ex.items.length, why: '' });
          return;
        }
        const it = ex.items[i];
        const s = sentenceEl(it.blank);
        const fb = h('div', { class: 'rapid-fb' });
        const mk = (label, key, cls) => h('button', { class: 'btn big ' + cls, type: 'button', onclick: () => choose(key) }, label);
        const b1 = mk('SER', 'ser', 'ser'); const b2 = mk('ESTAR', 'estar', 'estar');
        function choose(key) {
          b1.disabled = true; b2.disabled = true;
          const ok = key === it.answer;
          api.record(it.skill, ok);
          if (ok) right++;
          fb.className = 'rapid-fb ' + (ok ? 'good' : 'bad');
          put(fb, h('b', {}, (ok ? '✓ ' : '✗ ') + it.full), h('span', {}, ' ' + it.why));
          s.slot.textContent = it.full.split(' ').find(w => /^(soy|eres|es|somos|sois|son|estoy|estás|está|estamos|estáis|están)$/i.test(w.replace(/[¿?¡!.,]/g, ''))) || '…';
          const nextBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => { i++; show(); } }, i + 1 === ex.items.length ? 'Finish' : 'Next');
          fb.append(h('div', { class: 'row end' }, nextBtn));
          nextBtn.focus();
        }
        put(box, h('div', { class: 'rapid-count' }, (i + 1) + ' / ' + ex.items.length), s.el, h('div', { class: 'rapid-btns' }, b1, b2), fb);
      }
      show();
      return {};
    }
  };

  function textType(ex, api, el, isGap) {
    const s = isGap ? sentenceEl(ex.q) : null;
    const input = h('input', { class: 'text', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Your answer', placeholder: isGap ? 'type the missing word' : 'type it in Spanish' });
    input.addEventListener('input', () => { api.enable(input.value.trim().length > 0); if (s && s.hasSlot) s.slot.textContent = input.value || ' '; });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); api.submit(); } });
    push(el, 
      h('p', { class: 'prompt' }, isGap ? 'Fill the gap' : 'Translate into Spanish'),
      isGap ? s.el : h('div', { class: 'sentence en-q' }, T(ex.q)),
      isGap && ex.hint ? h('p', { class: 'sub' }, 'Verb: ', h('span', { class: 'verbchip ' + ex.hint }, ex.hint.toUpperCase())) : null,
      input);
    setTimeout(() => input.focus(), 50);
    return {
      check() {
        if (!input.value.trim()) return null;
        const r = L.judge(input.value, ex.answer);
        const shown = isGap ? ex.answer[0] : prettyAns(ex.answer);
        const res = { ok: r !== 'no', almost: r === 'accent', answer: shown, hear: isGap ? null : ex.answer[0], why: ex.why };
        if (!isGap && r === 'no') res.card = { id: 'x-' + ex.q.toLowerCase().replace(/[^a-z]/g, '').slice(0, 24), es: prettyAns([ex.answer[0]]), en: ex.q, alts: ex.answer.slice(1).map(a => prettyAns([a])) };
        return res;
      }
    };
  }

  function exerciseRunner(list, stats, onDone, opts) {
    opts = opts || {};
    const usable = list.filter(e => e.type !== 'listen' || hasSpanishVoice());
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
      if (!item) { fill.style.width = '100%'; onDone(); return; }
      renderItem(item);
    }

    function renderItem(item) {
      const ex = item.e;
      counter.textContent = item.retry ? 'Second chance' : Math.min(finished + 1, total) + ' / ' + total;
      fill.style.width = (finished / Math.max(total, 1) * 100) + '%';
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
        const head = res.head || (good ? (res.almost ? 'Right! Watch the accents.' : PRAISE[Math.floor(Math.random() * PRAISE.length)]) : (item.retry ? 'Not quite. We will move on.' : 'Not quite.'));
        put(fb, 
          h('div', { class: 'fb-head' }, head),
          res.answer && (!good || res.almost) ? h('div', { class: 'fb-ans' }, 'Answer: ', h('b', {}, res.answer)) : null,
          res.show && good && !res.almost ? h('div', { class: 'fb-ans' }, 'Correct sentence: ', h('b', {}, res.show)) : null,
          res.why ? h('div', { class: 'fb-why' }, res.why) : null,
          res.hear ? speakBtn(res.hear, '🔊 Hear it') : null);
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
    const label = { great: 'Excellent!', good: 'Nice work', 'keep going': 'Good try, keep going' };
    put(target, 
      h('div', { class: 'verdict v-' + d.verdict.replace(' ', '-') }, label[d.verdict] || 'Nice work'),
      d.praise ? h('p', { class: 'praise' }, '👏 ' + d.praise) : null,
      d.corrected ? h('div', { class: 'corrected' }, h('div', { class: 'label' }, 'Polished version'), h('div', { class: 'big' }, d.corrected), speakBtn(d.corrected, '🔊 Hear it')) : null,
      d.mistakes.length
        ? h('div', { class: 'mistakes' }, d.mistakes.map(m => h('div', { class: 'mistake' },
          h('div', { class: 'mrow' }, h('s', {}, m.wrong), ' → ', h('b', {}, m.right)), h('div', { class: 'why' }, m.why))))
        : h('p', { class: 'nomist' }, 'No mistakes found. 🎉'),
      d.tip ? h('p', { class: 'tip' }, '💡 ' + d.tip) : null);
  }

  function writeStep(ch, next) {
    const w = ch.write;
    const ta = h('textarea', { class: 'text area', rows: '4', placeholder: w.starter, 'aria-label': 'Your sentences' });
    const out = h('div', { class: 'ai-out' });
    let busy = false; let rewarded = false;
    const btn = h('button', { class: 'btn primary big', type: 'button' }, AI.on ? 'Check with my AI tutor' : 'Show me a model answer');
    btn.addEventListener('click', async () => {
      if (busy) return;
      if (!AI.on) {
        put(out, 
          h('div', { class: 'corrected' }, h('div', { class: 'label' }, 'Model answer'), h('div', { class: 'big' }, T(w.model)), speakBtn(T(w.model), '🔊 Hear it')),
          h('p', { class: 'muted' }, 'Compare yours with this. Tick off:'),
          h('ul', { class: 'check-list' }, w.checklist.map(c => h('li', {}, h('label', {}, h('input', { type: 'checkbox' }), ' ' + c)))),
          h('p', { class: 'muted small' }, 'Turn on the AI tutor (the 🤖 chip on the home screen) and it will correct your exact sentences and explain why.'));
        return;
      }
      if (!ta.value.trim()) { ta.focus(); return; }
      busy = true; btn.disabled = true; btn.textContent = 'Thinking…';
      put(out, h('div', { class: 'spinner', role: 'status' }, 'Your tutor is reading it…'));
      const r = await ai('correct', { task: w.task, sentence: ta.value });
      busy = false; btn.disabled = false; btn.textContent = 'Check again';
      if (r.ok) {
        renderCorrection(r.data, out);
        if (!rewarded) { rewarded = true; addXp(15); }
      } else {
        put(out, h('p', { class: 'error' }, r.error || 'Something went wrong.'), h('p', { class: 'muted small' }, 'You can still carry on: the rest of the chapter does not need AI.'));
      }
    });
    return h('div', { class: 'step' },
      h('h2', {}, w.title + ' ✍️'),
      h('p', { class: 'lead' }, w.task),
      ta, h('div', { class: 'row' }, btn), out,
      contBtn('Next: boss level →', next));
  }

  // ---------- boss level ----------
  function bubble(who, text, en, hearable) {
    const enEl = h('div', { class: 'en hidden' }, en || '');
    return h('div', { class: 'bubble ' + (who ? 'npc' : 'me') },
      who ? h('b', { class: 'who' }, who) : null,
      h('div', { class: 'es' }, text),
      who ? h('div', { class: 'bub-tools' },
        hearable ? speakBtn(text) : null,
        en ? h('button', { class: 'mini', type: 'button', onclick: () => enEl.classList.toggle('hidden') }, 'EN') : null) : null,
      enEl);
  }

  function bossStep(ch, next, stats) {
    const b = ch.boss;
    let t = 0; let slips = 0; let missedThisTurn = false;
    const log = h('div', { class: 'chat' });
    const choices = h('div', { class: 'choices' });
    const why = h('p', { class: 'nudge hidden' });
    const footer = h('div', { class: 'boss-foot' });
    const wrap = h('div', { class: 'step boss' }, h('h2', {}, b.title + ' 🛎️'), h('p', { class: 'muted' }, 'Tap the right reply. Tap EN on a bubble if you need the English.'), log, choices, why, footer);

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
            recordSkill(turn.skill || 'ser-id', !missedThisTurn); save();
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
      put(choices, );
      why.classList.add('hidden');
      log.append(bubble(b.who, T(b.closing), T(b.closingEn), true));
      put(footer, 
        h('p', { class: 'lead' }, slips === 0 ? 'Flawless check-in! 🏆' : 'Checked in, with ' + slips + ' slip' + (slips === 1 ? '' : 's') + '. That is how it is learned.'),
        AI.on
          ? h('button', { class: 'btn ghost big', type: 'button', onclick: () => aiChat(b, wrap, next) }, '💬 Keep chatting with ' + b.who + ' (AI)')
          : h('p', { class: 'muted small' }, 'With the AI tutor on, you can keep chatting freely with ' + b.who + ' here.'),
        contBtn('Finish chapter →', next));
    }

    showTurn();
    return wrap;
  }

  function aiChat(b, wrap, next) {
    const history = [{ role: 'assistant', content: T(b.chatOpening) }];
    const log = h('div', { class: 'chat' });
    let lastHint = ''; let sent = 0; let busy = false;
    const MAX = 14;
    const hintOut = h('p', { class: 'nudge hidden' });
    const input = h('input', { class: 'text', type: 'text', autocomplete: 'off', placeholder: 'Escribe en español…', 'aria-label': 'Your message' });
    const sendBtn = h('button', { class: 'btn primary', type: 'button' }, 'Send');
    const hintBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => { hintOut.textContent = lastHint ? '💡 Try: ' + lastHint : '💡 Try answering the question in a short sentence.'; hintOut.classList.remove('hidden'); } }, '💡 Hint');
    log.append(bubble(b.who, T(b.chatOpening), T(b.chatOpeningEn), true));

    async function send() {
      const text = input.value.trim();
      if (!text || busy) return;
      busy = true; input.value = ''; sendBtn.disabled = true; hintOut.classList.add('hidden');
      const userBub = bubble(null, text); log.append(userBub);
      const prior = history.slice();
      history.push({ role: 'user', content: text }); sent++;
      const thinking = h('div', { class: 'spinner small' }, b.who + ' is typing…'); log.append(thinking);
      const r = await ai('roleplay', { scenario: b.scenario, history: prior, user: text });
      thinking.remove();
      if (r.ok) {
        const d = r.data;
        if (d.correction) userBub.append(h('div', { class: 'corr' }, '✏️ ' + d.correction));
        history.push({ role: 'assistant', content: d.reply });
        lastHint = d.hint;
        log.append(bubble(b.who, d.reply, d.english, true));
        say(d.reply);
        addXp(5);
      } else {
        log.append(h('p', { class: 'error' }, r.error || 'Something went wrong.'));
      }
      busy = false; sendBtn.disabled = false;
      if (sent >= MAX) { input.disabled = true; sendBtn.disabled = true; log.append(h('p', { class: 'lead' }, '¡Hasta luego! That was a long chat, great work. 🎉')); }
      else input.focus();
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    put(wrap, 
      h('h2', {}, 'Free chat with ' + b.who + ' 💬'),
      h('p', { class: 'muted' }, 'Anything goes. Mistakes are fine: she will point them out gently. Tap EN for a translation.'),
      log, hintOut,
      h('div', { class: 'chat-input' }, input, sendBtn, hintBtn),
      contBtn('Finish chapter →', next));
    input.focus();
  }

  // ---------- results ----------
  function resultStep(ch, next, stats) {
    const acc = stats.total ? Math.round(stats.right / stats.total * 100) : 100;
    const first = !S.done[ch.id];
    const prev = S.done[ch.id] || {};
    S.done[ch.id] = { acc, best: Math.max(acc, prev.best || 0), date: L.dayKey() };
    addXp(first ? 30 : 10);
    const stars = acc >= 90 ? 3 : acc >= 75 ? 2 : 1;
    const due = L.dueCards(S.srs, Date.now()).length;
    setTimeout(confetti, 150);
    const mins = Math.max(1, Math.round((Date.now() - stats.t0) / 60000));
    return h('div', { class: 'step result' },
      h('div', { class: 'stars' }, '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('h2', {}, '¡Capítulo ' + ch.id + ' completado!'),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, acc + '%'), h('span', {}, 'first-try accuracy')),
        h('div', { class: 'stat' }, h('b', {}, '+' + (first ? 30 : 10)), h('span', {}, 'bonus XP')),
        h('div', { class: 'stat' }, h('b', {}, mins + ' min'), h('span', {}, 'time'))),
      h('p', { class: 'lead' }, 'You can now say who you are, where you are from and how you feel. Your phrases are in the review deck and will come back at the right moment.'),
      h('div', { class: 'row center' },
        h('button', { class: 'btn primary big', onclick: home }, 'Back to the map'),
        due ? h('button', { class: 'btn ghost big', onclick: reviewFlow }, 'Review ' + due + ' now') : null));
  }

  // ---------- weak-spot drill ----------
  function drillWeak() {
    const weak = weakSkills();
    const pool = [];
    CHAPTERS.forEach(ch => ch.exercises.forEach(e => { if (e.type !== 'rapid' && weak.includes(e.skill)) pool.push(e); }));
    const list = L.shuffle(pool).slice(0, 8);
    if (!list.length) return home();
    const stats = { right: 0, total: 0, t0: Date.now() };
    const content = exerciseRunner(list, stats, () => {
      mount(h('div', { class: 'page lesson' }, h('div', { class: 'step result' },
        h('h2', {}, 'Weak spots: done 💪'),
        h('p', { class: 'lead' }, stats.right + ' of ' + stats.total + ' right first time.'),
        h('div', { class: 'row center' }, h('button', { class: 'btn primary big', onclick: home }, 'Back to the map')))));
    });
    mount(h('div', { class: 'page lesson' }, backBar('Weak spots', home), content));
  }

  // ---------- review (spaced repetition) ----------
  function reviewFlow() {
    const queue = L.dueCards(S.srs, Date.now()).slice(0, 15);
    if (!queue.length) { home(); return; }
    const total = queue.length; let seen = 0; let right = 0;
    const lapsed = new Set(); // missed once this session: a correct re-ask must not promote the card
    const body = h('div', { class: 'step' });
    const wrap = h('div', { class: 'page lesson' }, backBar('Review', home), body);
    mount(wrap);

    function variants(card) {
      const base = [card.es].concat(card.alts || []);
      const extra = base.map(a => a.replace(/^(el|la|los|las|un|una)\s+/i, '')).concat(base.map(a => a.replace(/\s*\(de\)\s*/i, ' ')));
      return base.concat(extra);
    }
    function next() {
      const card = queue.shift();
      if (!card) { done(); return; }
      let checked = false; let retry = false;
      const input = h('input', { class: 'text', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'type it in Spanish', 'aria-label': 'Your answer' });
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
          h('div', { class: 'fb-head' }, ok ? (r === 'accent' ? 'Right! Watch the accents.' : PRAISE[Math.floor(Math.random() * PRAISE.length)]) : 'Not quite.'),
          h('div', { class: 'fb-ans' }, 'Answer: ', h('b', {}, card.es), card.alts && card.alts.length ? h('span', { class: 'muted' }, '  (also: ' + card.alts.join(', ') + ')') : null),
          card.ex ? h('div', { class: 'fb-why' }, card.ex) : null,
          speakBtn(card.es, '🔊 Hear it'));
        fb.classList.remove('hidden');
        btn.textContent = 'Continue';
        input.disabled = true;
        btn.focus();
      }
      btn.addEventListener('click', check);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      put(body, 
        h('div', { class: 'counter' }, 'Card ' + Math.min(seen + 1, total) + ' of ' + total),
        h('div', { class: 'bar' }, h('i', { style: { width: (seen / total * 100) + '%' } })),
        h('p', { class: 'prompt' }, 'How do you say…'),
        h('div', { class: 'sentence en-q' }, card.en),
        input, fb, h('div', { class: 'row end sticky' }, btn));
      input.focus();
    }
    function done() {
      put(body, 
        h('div', { class: 'stars' }, '🧠'),
        h('h2', {}, 'Review done'),
        h('p', { class: 'lead' }, right + ' of ' + total + ' right first time. Cards you knew come back in a few days; misses come back tomorrow.'),
        h('div', { class: 'row center' }, h('button', { class: 'btn primary big', onclick: home }, 'Back to the map')));
      setTimeout(confetti, 100);
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
      confetti();
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
            used ? h('p', { class: 'muted' }, 'I can see you used the word, so I will count it. The AI check just was not available.') : null);
          if (used) complete(sentence);
          return;
        }
        const d = r.data;
        put(out, 
          h('div', { class: 'verdict ' + (d.used ? (d.correct ? 'v-great' : 'v-good') : 'v-keep-going') },
            d.used ? (d.correct ? '¡Perfecto! You used it well.' : 'You used it. Nearly there!') : 'Try to include "' + w.es + '" in your answer'),
          d.feedback ? h('p', {}, d.feedback) : null,
          d.corrected && d.used ? h('div', { class: 'corrected' }, h('div', { class: 'label' }, 'Polished'), h('div', { class: 'big' }, d.corrected), speakBtn(d.corrected, '🔊 Hear it')) : null,
          d.natural ? h('p', { class: 'tip' }, '🗣️ A more natural way to say it: ' + d.natural) : null);
        if (d.used || used) complete(sentence);
      } else {
        busy = false; btn.disabled = false;
        put(out, 
          h('div', { class: 'verdict ' + (used ? 'v-great' : 'v-keep-going') }, used ? '✓ You used "' + w.es + '"!' : 'I cannot see "' + w.es + '" in your sentence yet'),
          used ? h('p', { class: 'muted' }, 'Compare with the example above to check the grammar yourself. (Turn on the AI tutor and it will check it for you.)') : h('p', { class: 'muted' }, 'Peek at the example above and try again.'));
        if (used) complete(sentence);
      }
    });

    const learned = S.wotd.learned.map(id => WORDS.find(x => x.id === id)).filter(Boolean);
    mount(h('div', { class: 'page lesson' }, backBar('Word of the day', home),
      h('div', { class: 'step' },
        h('div', { class: 'wotd-hero' },
          h('div', { class: 'wotd-k' }, w.pos),
          h('div', { class: 'wotd-big' }, w.es, ' ', speakBtn(w.es)),
          h('div', { class: 'wotd-en' }, w.en)),
        h('div', { class: 'example' }, h('div', { class: 'es' }, w.ex.es, ' ', speakBtn(w.ex.es)), h('div', { class: 'en' }, w.ex.en)),
        h('div', { class: 'wq' }, h('div', { class: 'label' }, 'Your turn'), h('p', { class: 'lead' }, w.q)),
        ta, h('div', { class: 'row' }, btn), out,
        done ? h('p', { class: 'muted' }, '✓ Done for today. A new word arrives tomorrow, and this one is now in your review deck.') : null,
        learned.length > 1 ? h('details', { class: 'learned' }, h('summary', {}, 'Your words so far (' + learned.length + ')'),
          h('ul', {}, learned.map(x => h('li', {}, h('b', {}, x.es), ' · ' + x.en)))) : null)));
  }

  // ---------- go ----------
  window.__trainer = { state: () => S, home, chapterFlow, reviewFlow, wotdScreen, ai: () => AI, chapters: CHAPTERS, words: WORDS };
  aiStatus().then(home, home);
})();
