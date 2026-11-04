// End-to-end: plays every chapter through in headless Chrome, plus word of the day, review, weak spots, chat, settings.
// The course comes from the page (BASE can end in ?course=la), so the same run checks Spanish and Latin.
let puppeteer; try { puppeteer = require('puppeteer'); } catch (e) { puppeteer = require('puppeteer-core'); }
const assert = require('assert');
const path = require('path');
const L = require('../public/logic.js');
const SP = path.join(__dirname, '.shots');
const BASE = process.env.BASE || 'http://localhost:3130';
const AI_ON = process.env.AI_ON !== '0';
const W = Number(process.env.W || 1100);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let steps = 0;
const ok = msg => { steps++; console.log('  ✓ ' + msg); };

(async () => {
  require('fs').mkdirSync(SP, { recursive: true });
  const shot = (name) => page.screenshot({ path: path.join(SP, name + (BASE.includes('course=la') ? '-la' : '') + (AI_ON ? '' : '-noai') + '-' + W + '.png') });
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || undefined, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 900 });
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
  page.on('dialog', d => d.accept());

  const JUNK = /\b(null|undefined|NaN)\b|\[object Object\]/;
  const EMOJI = /\p{Extended_Pictographic}/u;
  const text = async () => {
    const t = await page.evaluate(() => document.body.innerText);
    if (JUNK.test(t)) throw new Error('stray junk text: ...' + (t.match(/[\s\S]{0,50}(null|undefined|NaN|\[object Object\])[\s\S]{0,30}/) || [''])[0].replace(/\n/g, ' | '));
    const e = t.match(EMOJI); if (e) throw new Error('emoji left in the interface: ' + e[0]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error('horizontal overflow at width ' + W);
    return t;
  };
  const clickText = async (sel, txt) => {
    const done = await page.evaluate((sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find(e => e.innerText.trim().includes(txt) && !e.disabled);
      if (!el) return false; el.click(); return true;
    }, sel, txt);
    assert.ok(done, `could not click "${txt}" in ${sel}`);
    await sleep(80);
  };
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__trainer.state())));
  const T = s => String(s).replace(/\{name\}/g, 'Sam').replace(/\{o\}/g, 'a');

  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(200);

  // ---------- first use ----------
  let t0 = await text();
  assert.match(t0, /Before you start/); assert.doesNotMatch(t0, /Sam/);
  await clickText('button', 'Start'); assert.match(await text(), /Add the name/);
  await page.type('input.text', 'Sam'); await clickText('button', 'Start'); await sleep(100);
  const s0 = await page.evaluate(() => window.__trainer.state());
  assert.equal(s0.name, 'Sam'); assert.ok(s0.prefsAt > 0);
  ok('first use: asks for a name (none preset), refuses a blank one, then opens today');

  // ---------- home ----------
  let t = await text();
  const meta = await page.evaluate(() => ({ course: window.__trainer.course, ui: window.__trainer.ui, titles: window.__trainer.chapters.map(c => c.title) }));
  const UI = meta.ui; const COURSE = meta.course; const TL = COURSE.lang.split('-')[0];
  const plain = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // an answer typed without accents or macrons
  console.log('  course: ' + COURSE.title);
  assert.doesNotMatch(t, /¡Hola/); assert.match(t, /Today/); assert.ok(t.includes('of ' + (COURSE.goalMins || 45) + ' min')); assert.ok(t.includes(UI.wordOfDay));
  meta.titles.forEach(x => assert.ok(t.includes(x), 'chapter title on home: ' + x));
  assert.ok(t.includes(COURSE.roadmap[0].title)); assert.match(t, AI_ON ? /AI tutor on/ : /AI tutor off/);
  if (COURSE.id === 'es-ES') assert.match(t, /Who you are and where you are/);
  const fonts = await page.evaluate(async () => { await document.fonts.ready; return [document.fonts.check('16px "Instrument Sans"'), document.fonts.check('16px "Newsreader"')]; });
  assert.deepStrictEqual(fonts, [true, true], 'bundled fonts should load');
  ok('home: plan for ' + (COURSE.goalMins || 45) + ' min, ' + meta.titles.length + ' chapters + roadmap, no greeting, no emoji, bundled fonts load');
  await shot('01-home');

  // ---------- word of the day ----------
  const w = await page.evaluate(() => { const S = window.__trainer.state(); const id = Object.values(S.wotd.byDate)[0]; return window.__trainer.words.find(x => x.id === id); });
  await page.click('.wotd'); await sleep(150);
  t = await text();
  assert.ok(t.includes(w.en) && t.includes(w.ex.es) && t.includes(w.q));
  if (!AI_ON) {
    await page.type('textarea', 'Hola amigo'); await clickText('button', 'Check my sentence'); await sleep(100);
    assert.match(await text(), /can't see/); ok('offline: a sentence without the word is not accepted');
    await page.evaluate(() => { document.querySelector('textarea').value = ''; });
  }
  await page.type('textarea', w.ex.es);
  await clickText('button', 'Check'); await sleep(AI_ON ? 400 : 120);
  let s = await state();
  const today = Object.keys(s.wotd.byDate)[0];
  assert.ok(s.wotd.done[today] && s.srs['w-' + w.id] && s.xp >= 15 && s.streak.count === 1);
  if (AI_ON) { t = await text(); assert.ok(/Quedamos mañana/.test(t), 'AI correction should show'); assert.ok(await page.$('.pen .pen-ok'), 'red pen should mark the AI correction'); }
  ok('word of the day: completes, joins review deck, streak starts' + (AI_ON ? ', AI correction in red pen' : ''));
  await shot('02-wotd');
  await page.click('.icon-btn'); await sleep(150);
  assert.ok(await page.$('.plan-row.done'), 'plan should tick the word');
  ok('home plan ticks the word of the day');

  // ---------- play every chapter ----------
  const chapters = await page.evaluate(() => window.__trainer.chapters.map(c => c.n));
  // A spelling slip the app should mark as "Nearly": two letters swapped inside a long word of the answer.
  const GLOSS_KEYS = await page.evaluate(async c => { const r = await fetch('courses/' + c.id + '/' + (c.glossary || 'glossary.json')); return r.ok ? Object.keys((await r.json()).words || {}) : []; }, COURSE);
  const slipOf = (ex) => {
    if (!['gap', 'translate'].includes(ex.type) || ex.strict) return null;
    const a = UI.marksOptional ? plain(ex.answer[0]) : ex.answer[0];
    const opts = { close: true, english: ex.dir === 'toEn', marksOptional: !!UI.marksOptional, known: ex.dir === 'toEn' ? null : GLOSS_KEYS };
    for (const w of a.split(' ')) {
      if (w.length < 6 || w[1] === w[2]) continue;
      const typo = a.replace(w, w[0] + w[2] + w[1] + w.slice(3));
      if (L.judge(typo, ex.answer, opts) === 'close') return typo;
    }
    return null;
  };
  let slipShown = false;
  // A deliberate miss that the chapter's tables can explain ("vives goes with tú…"), when there is one.
  const FORMS = L.tableForms(await page.evaluate(() => window.__trainer.chapters));
  const hintMiss = (ex, n) => {
    if (ex.type !== 'gap') return null;
    const q = T(ex.q); const answers = ex.answer.map(a => q.replace('___', a));
    for (const r of FORMS.filter(f => f.n <= n && ex.answer.some(a => L.stripAcc(L.norm(a)) === f.key))) {
      for (const f of FORMS.filter(x => x.n <= n && x.table === r.table && x.key !== r.key)) {
        if (L.judge(f.form, ex.answer, { marksOptional: !!UI.marksOptional }) !== 'no') continue;
        if (L.formHint(FORMS, q.replace('___', f.form), answers, n, COURSE.personNotes)) return f.form;
      }
    }
    return null;
  };
  let hintShown = false;
  for (const n of chapters) {
    const ch = await page.evaluate(n => window.__trainer.chapters.find(c => c.n === n), n);
    const deliberateMiss = n === 2;
    await page.evaluate(n => window.__trainer.chapterFlow(window.__trainer.chapters.find(c => c.n === n)), n); await sleep(150);
    // discover: wrong option first, then right
    const wrongIdx = ch.discover.answer === 0 ? 1 : 0;
    await page.evaluate(i => document.querySelectorAll('.opts .opt')[i].click(), wrongIdx); await sleep(50);
    assert.ok((await text()).includes(ch.discover.nudge), 'nudge shows');
    await page.evaluate(i => document.querySelectorAll('.opts .opt')[i].click(), ch.discover.answer); await sleep(120);
    assert.ok((await text()).includes(ch.discover.hooks[0].title));
    if (n === 2) await shot('03-discover');
    await clickText('button', 'Continue');
    t = await text(); assert.ok(t.includes(ch.learn.title));
    if (n === 3) await shot('04-learn');
    await clickText('button', 'Continue to phrases');
    t = await text(); assert.ok(t.includes(T(ch.phrases[0].es)));
    await clickText('button', 'Start practising');

    // exercises
    let guard = 0; let missedOne = false;
    while (guard++ < 60) {
      const ex = await page.evaluate(() => document.querySelector('.runner') && window.__trainer.current);
      if (!ex) break;
      const counter = await page.evaluate(() => document.querySelector('.counter').innerText);
      const miss = deliberateMiss && !missedOne && ['gap', 'translate', 'fix', 'mc'].includes(ex.type) && !counter.includes('Second');
      const slip = !slipShown && n === 3 && !counter.includes('Second') ? slipOf(ex) : null;
      switch (ex.type) {
        case 'mc': case 'listen':
          await page.evaluate(i => document.querySelectorAll('.ex .opt')[i].click(), miss ? (ex.answer + 1) % ex.options.length : ex.answer); break;
        case 'gap': case 'translate':
          await page.type('.ex input.text', miss ? (hintMiss(ex, n) || 'xyz') : slip || (UI.marksOptional ? plain(ex.answer[0]) : ex.answer[0])); break;
        case 'order':
          for (const word of ex.words) await page.evaluate(wd => [...document.querySelectorAll('.tiles.bank .tile')].find(b => b.innerText === wd).click(), word);
          break;
        case 'fix':
          await page.evaluate(i => document.querySelectorAll('.ex .word')[i].click(), miss ? (ex.wrong + 1) % 3 : ex.wrong); break;
        case 'match':
          for (const [l, r] of ex.pairs) {
            await page.evaluate(x => [...document.querySelectorAll('.mcol')[0].querySelectorAll('.opt')].find(b => b.innerText === x).click(), l);
            await page.evaluate(x => [...document.querySelectorAll('.mcol')[1].querySelectorAll('.opt')].find(b => b.innerText === x).click(), r);
          }
          break;
        case 'rapid':
          for (const it of ex.items) {
            const label = ex.choices.find(c => c.key === it.answer).label;
            await page.evaluate(lb => [...document.querySelectorAll('.rapid-btns button')].find(b => b.innerText === lb).click(), label);
            await page.evaluate(() => { const b = [...document.querySelectorAll('.rapid-fb button')].pop(); if (b) b.click(); });
          }
          assert.equal(await page.evaluate(() => document.querySelectorAll('.rapid-fb button').length), 0, 'rapid fire ends with one button (Continue), no Finish');
          if (n === 4) await shot('05-rapid-done');
          break;
        default: throw new Error('unknown type ' + ex.type);
      }
      await sleep(40);
      const checkBtn = await page.$('.btn.check:not(.hidden)');
      if (checkBtn && !['match', 'rapid'].includes(ex.type)) {
        const label = await page.evaluate(b => b.innerText, checkBtn);
        if (label === 'Check') { await checkBtn.click(); await sleep(60); }
      }
      if (UI.marksOptional && ['gap', 'translate'].includes(ex.type) && !miss) assert.doesNotMatch(await text(), /watch the accents/, 'missing macrons are not a mistake');
      if (slip) {
        slipShown = true;
        t = await text();
        assert.match(t, /Nearly\. Check the spelling of/, 'a one-letter slip gets half a mark: ' + slip);
        assert.ok(await page.$('.feedback .pen.slip .pen-x'), 'the red pen marks the slipped letters');
        await shot('06-slip');
        ok('chapter 3: a spelling slip ("' + slip + '") is marked "Nearly" with the red pen on the letters, no second chance');
      }
      const mcHint = miss && ex.type === 'mc' && ex.q && !(ex.wrong && ex.wrong[(ex.answer + 1) % ex.options.length])
        ? L.formHint(FORMS, T(ex.q).replace('___', T(ex.options[(ex.answer + 1) % ex.options.length])), [T(ex.q).replace('___', T(ex.options[ex.answer]))], n, COURSE.personNotes) : null;
      if (miss && ((ex.type === 'gap' && hintMiss(ex, n)) || mcHint)) {
        const hint = await page.evaluate(() => (document.querySelector('.feedback .fb-hint') || {}).innerText);
        assert.ok(hint, 'a wrong form from the tables gets a plain-words hint');
        hintShown = true;
        if (mcHint) assert.equal(hint, mcHint);
        ok('chapter 2: a wrong form is explained from the tables ("' + hint + '")');
      }
      if (miss) {
        missedOne = true;
        t = await text();
        assert.match(t, /Not quite/);
        assert.ok(await page.$('.feedback .pen-ok'), 'red pen should show the right answer');
        await shot('06-redpen');
        ok('chapter 2: a wrong answer gets the red-pen correction and comes back as a second chance');
      }
      await page.evaluate(() => { const b = document.querySelector('.btn.check'); if (b && !b.classList.contains('hidden')) b.click(); });
      await sleep(60);
    }
    // write
    t = await text(); assert.ok(t.includes(T(ch.write.task)), 'write step for chapter ' + n);
    await page.type('textarea', T(ch.write.model));
    await clickText('button', AI_ON ? 'Check with the AI tutor' : 'Show a model answer'); await sleep(AI_ON ? 400 : 100);
    t = await text();
    if (AI_ON) { assert.match(t, /Polished version/); assert.ok(await page.$('.mistake .pen-x')); }
    else assert.ok(t.includes(T(ch.write.model)));
    await clickText('button', 'Continue to the scenario');
    // boss
    for (const turn of ch.boss.turns) {
      await sleep(80);
      const wrong = turn.choices.find(c => c[1] === false);
      if (n === 1) { await page.evaluate(x => [...document.querySelectorAll('.choices .opt')].find(b => b.innerText === x).click(), T(wrong[0])); await sleep(30); assert.ok((await text()).includes(T(wrong[2]))); }
      const right = turn.choices.find(c => c[1] === true);
      await page.evaluate(x => [...document.querySelectorAll('.choices .opt')].find(b => b.innerText === x).click(), T(right[0]));
      await sleep(520);
    }
    t = await text(); assert.ok(t.includes(T(ch.boss.closing)), 'boss closing for chapter ' + n);
    if (n === 1) await shot('07-boss');
    if (AI_ON && n === 3) {
      await clickText('button', 'Keep chatting with');
      await page.type('.chat-input input', 'Sí, por favor'); await clickText('button', 'Send'); await sleep(400);
      assert.match(await text(), /un mapa de la ciudad/);
      ok('chapter 3: free chat with ' + ch.boss.who + ' works through the AI');
      await shot('08-chat');
    }
    await clickText('button', 'Finish chapter'); await sleep(150);
    t = await text();
    assert.ok(t.includes(UI.chapterDone.replace('{n}', n)));
    s = await state();
    assert.ok(s.done[n], 'chapter ' + n + ' recorded');
    // A spelling slip in chapter 3 is half a mark, so that chapter lands just under 100%, and above a full miss.
    const slipAcc = n === 3 && slipShown;
    const expectAcc = deliberateMiss ? s.done[n].acc < 100 : slipAcc ? s.done[n].acc < 100 && s.done[n].acc >= 90 : s.done[n].acc === (n === 1 ? s.done[n].acc : 100);
    if (slipAcc) assert.ok(!s.lessons[n] || s.lessons[n].off, 'a finished chapter keeps no place to resume');
    assert.ok(expectAcc, 'chapter ' + n + ' accuracy ' + s.done[n].acc);
    assert.ok(ch.phrases.every(p => s.srs[p.id]), 'phrases join the deck');
    if (n === 4) await shot('09-result');
    ok('chapter ' + n + ' "' + ch.title + '" plays through: ' + s.done[n].acc + '% first try, ' + ch.phrases.length + ' phrases added');
    await clickText('button', 'Back to today'); await sleep(100);
  }

  // ---------- home after chapters ----------
  t = await text();
  assert.match(t, /Chapter done today/); assert.match(t, /Best 100%/);
  ok('home shows chapters done and best scores');

  // ---------- review ----------
  await page.evaluate(() => { const S = window.__trainer.state(); Object.values(S.srs).slice(0, 4).forEach(c => { c.due = Date.now() - 1000; }); window.__trainer.home(); });
  await sleep(100);
  await page.evaluate(() => window.__trainer.reviewFlow()); await sleep(100);
  for (let i = 0; i < 4; i++) {
    const card = await page.evaluate(() => { const en = document.querySelector('.sentence.en-q').innerText; return Object.values(window.__trainer.state().srs).find(c => c.en === en); });
    await page.type('input.text', i === 0 ? 'no sé' : card.es); await page.keyboard.press('Enter'); await sleep(50);
    if (i === 0) { assert.ok(await page.$('.feedback .pen-x')); await shot('10-review-miss'); }
    await page.keyboard.press('Enter'); await sleep(50);
  }
  // the missed card is asked again
  const again = await page.evaluate(() => document.querySelector('.sentence.en-q') && document.querySelector('.sentence.en-q').innerText);
  assert.ok(again, 'missed card comes back in the same session');
  const card0 = await page.evaluate(en => Object.values(window.__trainer.state().srs).find(c => c.en === en), again);
  await page.type('input.text', card0.es); await page.keyboard.press('Enter'); await sleep(50); await page.keyboard.press('Enter'); await sleep(80);
  t = await text(); assert.match(t, /Review done/); assert.match(t, /3 of 4/);
  s = await state(); assert.strictEqual(s.srs[card0.id].box, 1, 'missed card stays in box 1');
  ok('review: 4 cards, a miss is struck through in red pen, re-asked, and stays in box 1');

  // ---------- weak spots ----------
  const weakKey = await page.evaluate(() => { const c = window.__trainer.chapters[2]; const k = c.exercises.find(e => e.type !== 'rapid').skill; const S = window.__trainer.state(); S.skills[k] = { r: 1, w: 40 }; window.__trainer.home(); return k; });
  const weakName = await page.evaluate(k => Object.assign({}, window.__trainer.course.skills, ...window.__trainer.chapters.map(c => c.skills))[k], weakKey);
  await sleep(80);
  t = await text(); assert.match(t, /Weak spots/); assert.ok(t.includes(weakName));
  await clickText('.plan-row', 'Weak spots'); await sleep(100);
  assert.ok((await text()).includes('Weak spots · ' + weakName));
  ok('weak spots: skill names come from the course files and the drill opens');
  await page.evaluate(() => window.__trainer.home()); await sleep(80);

  // ---------- settings ----------
  await page.click('button[aria-label="Settings"]'); await sleep(80);
  await page.select('select', '30'); await clickText('button', 'Save'); await sleep(80);
  assert.match(await text(), /of 30 min/);
  ok('settings: daily goal changes to 30 minutes');

  // ---------- practice timer ----------
  const before = L.daySecs((await state()).time[today]);
  for (let i = 0; i < 3; i++) { await page.mouse.move(100 + i * 10, 100); await page.mouse.down(); await page.mouse.up(); await sleep(2200); }
  const st0 = await state(); const after = L.daySecs(st0.time[today]);
  assert.ok(after > before, 'active time should be counted');
  assert.equal(typeof st0.time[today], 'object', 'time is kept per device');
  // Reading without touching anything still counts (the old 90-second cutoff stopped it): 100s idle is fine now.
  await page.evaluate(() => window.__trainer.idleFor(100000)); await sleep(5600);
  const reading = L.daySecs((await state()).time[today]);
  assert.ok(reading > after, 'reading for 100 seconds without a tap still counts');
  ok('practice timer counts active time per device (' + Math.round(before) + 's → ' + Math.round(reading) + 's), including a long read');

  // ---------- chapters: resume, no skipping the writing check, back ----------
  // Every chapter is finished by now. Its tick and best score stay on show while it is practised again (bug 7).
  const ch1 = await page.evaluate(() => window.__trainer.chapters[0]);
  const ch2 = await page.evaluate(() => window.__trainer.chapters[1]);
  const doneBefore = JSON.stringify((await state()).done);
  await page.evaluate(() => { const S = window.__trainer.state(); S.lessons[1] = { step: 4, ex: 0, stats: { right: 5, total: 6 }, at: Date.now() }; window.__trainer.home(); });
  await sleep(80);
  t = await text();
  assert.match(t, /Best \d+% · Resume/, 'a finished chapter being practised shows its score and Resume');
  assert.match(t, /Best \d+% · Practise again/, 'other finished chapters show Practise again');
  assert.doesNotMatch(t, /Carry on/);
  assert.doesNotMatch(t, /Resume chapter 1/, 'Today does not suggest a finished chapter');
  await clickText('.chap', ch1.title); await sleep(120);
  assert.ok((await text()).includes(ch1.write.title));
  const locked = await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.includes('Continue to the scenario')).disabled);
  assert.equal(locked, true, 'the writing step cannot be skipped before checking');
  await page.click('button[aria-label="Patterns"]'); await sleep(120);
  assert.ok((await text()).includes('Patterns · ' + T(ch1.sub))); assert.ok((await text()).includes(ch1.learn.blocks.find(b => b.type === 'tables').tables[0].title));
  await clickText('.modal button', 'Close'); await sleep(80);
  await page.click('button[aria-label="Back"]'); await sleep(120);
  assert.match(await text(), /1 of \d+/); assert.equal((await state()).lessons[1].step, 3);
  await page.click('button[aria-label="Close lesson"]'); await sleep(80);
  assert.match(await text(), /Best \d+% · Resume/);
  // Opening another chapter never touches chapter 1's place (bug 12), and results are never changed by reopening.
  await clickText('.chap', ch2.title); await sleep(120);
  await page.click('button[aria-label="Close lesson"]'); await sleep(80);
  let st = await state();
  assert.equal(st.lessons[1].step, 3, 'chapter 1 keeps its place after chapter 2 is opened');
  assert.ok(!st.lessons[2] || st.lessons[2].off, 'just opening a chapter saves no place');
  assert.equal(JSON.stringify(st.done), doneBefore, 'reopening chapters never changes their saved results');
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(200);
  st = await state();
  assert.equal(st.lessons[1].step, 3, 'the place survives a reload');
  await clickText('.chap', ch1.title); await sleep(120);
  assert.match(await text(), /1 of \d+/, 'resumes at practice');
  await page.click('button[aria-label="Close lesson"]'); await sleep(80);
  await page.evaluate(() => { window.__trainer.state().lessons = {}; window.__trainer.home(); }); await sleep(80);
  ok('chapters: each keeps its own place (opening another never wipes it, a reload keeps it), finished ones keep score and tick, the writing check cannot be skipped, patterns open mid-lesson, back returns to practice');

  // ---------- tap a word, My words ----------
  await page.evaluate(() => window.__trainer.wotdScreen()); await sleep(120);
  const target = await page.evaluate(() => { const w = [...document.querySelectorAll('.example .w')].find(x => x.textContent.length > 2); w.click(); return w.textContent.toLowerCase(); });
  await sleep(80);
  assert.ok(await page.$('.wcard'), 'tapping a word opens its meaning');
  await clickText('.wcard button', 'Add to my words'); await sleep(60);
  let sv = await state();
  assert.ok(sv.vocab[target] && !sv.vocab[target].off && sv.srs['v-' + target], 'saved word joins the review deck');
  await page.evaluate(tl => { const s = document.createElement('div'); s.lang = tl; s.id = 'probe'; s.textContent = 'zzpalabra'; document.querySelector('.step').append(s); }, TL);
  await sleep(60);
  await page.click('#probe .w'); await sleep(60);
  assert.match(await text(), /Not in the glossary yet/);
  if (AI_ON) { await clickText('.wcard button', 'Ask the AI tutor'); await sleep(300); assert.match(await text(), /pirate/); }
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__trainer.wordsScreen()); await sleep(80);
  assert.match(await text(), new RegExp(target));
  await clickText('button', 'Remove'); await sleep(60);
  sv = await state();
  assert.ok(sv.vocab[target].off && sv.srs['v-' + target].off, 'removed word leaves the review deck');
  assert.match(await text(), /No words yet/);
  await page.evaluate(() => window.__trainer.home()); await sleep(60);
  ok('words: tap for a meaning, save to My words and review, AI for unknown words, remove');

  // ---------- export / import progress ----------
  const fs = require('fs'); const os = require('os');
  const dl = fs.mkdtempSync(path.join(os.tmpdir(), 'trainer-dl-'));
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  const saved = await state();
  await page.click('button[aria-label="Settings"]'); await sleep(80);
  await clickText('button', 'Export progress');
  let exported = null;
  for (let i = 0; i < 40 && !exported; i++) { await sleep(100); exported = fs.readdirSync(dl).find(f => f.endsWith('.json')); }
  assert.ok(exported, 'export should download a .json file');
  const bad = path.join(dl, 'not-progress.json'); fs.writeFileSync(bad, '{"hello":1}');
  await (await page.$('input[type=file]')).uploadFile(bad); await sleep(150);
  assert.match(await text(), /not a progress file/);
  await clickText('button', 'Reset progress'); await sleep(80);
  assert.equal(Object.keys((await state()).done).length, 0, 'reset should clear chapters');
  assert.doesNotMatch(await text(), /Before you start/, 'after a reset, the name is kept (it lives in the profile)');
  assert.equal((await state()).name, 'Sam', 'reset keeps the name');
  await page.click('button[aria-label="Settings"]'); await sleep(80);
  await (await page.$('input[type=file]')).uploadFile(path.join(dl, exported)); await sleep(200);
  const restored = await state();
  assert.deepStrictEqual(Object.keys(restored.done), Object.keys(saved.done));
  assert.equal(Object.keys(restored.srs).length, Object.keys(saved.srs).length);
  assert.equal(restored.goalMins, 30); assert.equal(restored.xp, saved.xp);
  assert.match(await text(), /of 30 min/);
  fs.rmSync(dl, { recursive: true, force: true });
  ok('export / import: a downloaded file restores chapters, review cards and settings after a reset; a wrong file is refused');

  // ---------- offline: the service worker keeps the app and every course on the device ----------
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(200);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 10000 });
  const cached = await page.evaluate(async () => {
    const c = await caches.open('stilus-v1');
    for (let i = 0; i < 40; i++) { const keys = (await c.keys()).map(r => new URL(r.url).pathname); if (keys.some(k => k.includes('/chapters/'))) return keys; await new Promise(r => setTimeout(r, 250)); }
    return (await c.keys()).map(r => new URL(r.url).pathname);
  });
  const chapterFiles = await page.evaluate(() => window.__trainer.course.chapters.length);
  assert.ok(cached.filter(k => k.includes('/' + COURSE.id + '/chapters/')).length >= chapterFiles, 'every chapter of this course is kept for offline use');
  assert.ok(cached.some(k => k.endsWith('/app.js')) && cached.some(k => k.endsWith('.woff2')), 'the app and its fonts are kept');
  const seen = problems.length;
  await page.evaluate(() => localStorage.setItem('stilus-account', 'learner@example.com')); // as if signed in on the hosted app
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(900);
  t = await text();
  assert.ok(t.includes(COURSE.title), 'the app opens offline');
  assert.match(t, /Offline · lessons still work/);
  const ch1off = await page.evaluate(() => window.__trainer.chapters[0]);
  await clickText('.chap', ch1off.title); await sleep(150);
  assert.ok((await text()).includes(T(ch1off.discover.intro)), 'a chapter opens offline');
  await page.click('button[aria-label="Close lesson"]'); await sleep(80);
  await page.setOfflineMode(false);
  problems.splice(seen).filter(p => !/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::/.test(p)).forEach(p => problems.push(p));
  await page.evaluate(() => localStorage.removeItem('stilus-account'));
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(200);
  ok('offline: the app and all ' + chapterFiles + ' chapters are kept on the device, and it opens and runs a chapter with no connection');

  // ---------- course switch: each course keeps its own progress ----------
  const others = await page.evaluate(() => [...document.querySelectorAll('.switch-b:not(.on)')].map(b => b.innerText));
  if (others.length) {
    const mine = await page.evaluate(() => document.querySelector('.switch-b.on').innerText);
    const doneHere = Object.keys((await state()).done).length;
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), clickText('.switch-b', others[0])]); await sleep(200);
    const other = await page.evaluate(() => window.__trainer.course);
    t = await text();
    // The name is never asked again. A course with gendered endings asks for those once, with the name filled in.
    if (other.genderedExamples !== false && COURSE.genderedExamples === false) {
      assert.match(t, /Before you start/, 'endings not chosen yet, so they are asked');
      assert.equal(await page.evaluate(() => document.querySelector('input.text').value), 'Sam', 'the name from the profile is filled in');
      await clickText('button', 'Start'); await sleep(150);
    } else assert.doesNotMatch(t, /Before you start/, 'the name comes from the profile, not asked again');
    assert.equal((await state()).name, 'Sam', 'the other course uses the profile name');
    t = await text(); assert.ok(t.includes(other.title)); assert.ok(t.includes('of ' + (other.goalMins || 45) + ' min'));
    assert.equal(Object.keys((await state()).done).length, 0, 'the other course has its own progress');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), clickText('.switch-b', mine)]); await sleep(200);
    assert.equal(Object.keys((await state()).done).length, doneHere, 'switching back keeps this course\'s progress');
    assert.ok((await text()).includes(COURSE.title));
    ok('course switch: ' + mine + ' → ' + others[0] + ' starts fresh without asking the name again, and back again keeps the progress');
  }

  if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
  console.log('\n' + steps + ' checks passed, no console errors.');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
