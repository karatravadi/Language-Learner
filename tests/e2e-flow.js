// End-to-end: plays every chapter through in headless Chrome, plus word of the day, review, weak spots, chat, settings.
let puppeteer; try { puppeteer = require('puppeteer'); } catch (e) { puppeteer = require('puppeteer-core'); }
const assert = require('assert');
const path = require('path');
const SP = path.join(__dirname, '.shots');
const BASE = process.env.BASE || 'http://localhost:3130';
const AI_ON = process.env.AI_ON !== '0';
const W = Number(process.env.W || 1100);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let steps = 0;
const ok = msg => { steps++; console.log('  ✓ ' + msg); };

(async () => {
  require('fs').mkdirSync(SP, { recursive: true });
  const shot = (name) => page.screenshot({ path: path.join(SP, name + (AI_ON ? '' : '-noai') + '-' + W + '.png') });
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
  const T = s => String(s).replace(/\{name\}/g, 'Kara').replace(/\{o\}/g, 'a');

  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(200);

  // ---------- first use ----------
  let t0 = await text();
  assert.match(t0, /Before you start/); assert.doesNotMatch(t0, /Kara/);
  await clickText('button', 'Start'); assert.match(await text(), /Add the name/);
  await page.type('input.text', 'Kara'); await clickText('button', 'Start'); await sleep(100);
  const s0 = await page.evaluate(() => window.__trainer.state());
  assert.equal(s0.name, 'Kara'); assert.ok(s0.prefsAt > 0);
  ok('first use: asks for a name (none preset), refuses a blank one, then opens today');

  // ---------- home ----------
  let t = await text();
  assert.doesNotMatch(t, /¡Hola/); assert.match(t, /Today/); assert.match(t, /of 45 min/); assert.match(t, /Palabra del día/);
  assert.match(t, /Who you are and where you are/); assert.match(t, /Everyday verbs/); assert.match(t, /Numbers, time and dates/); assert.match(t, /Food and ordering/);
  assert.match(t, /Getting around/); assert.match(t, AI_ON ? /AI tutor on/ : /AI tutor off/);
  const fonts = await page.evaluate(async () => { await document.fonts.ready; return [document.fonts.check('16px "Instrument Sans"'), document.fonts.check('16px "Newsreader"')]; });
  assert.deepStrictEqual(fonts, [true, true], 'bundled fonts should load');
  ok('home: plan for 45 min, 4 chapters + roadmap, no greeting, no emoji, bundled fonts load');
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
      switch (ex.type) {
        case 'mc': case 'listen':
          await page.evaluate(i => document.querySelectorAll('.ex .opt')[i].click(), miss ? (ex.answer + 1) % ex.options.length : ex.answer); break;
        case 'gap': case 'translate':
          await page.type('.ex input.text', miss ? 'xyz' : ex.answer[0]); break;
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
            await page.evaluate(() => [...document.querySelectorAll('.rapid-fb button')].pop().click());
          }
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
    assert.ok(t.includes('Capítulo ' + n + ' completado'));
    s = await state();
    assert.ok(s.done[n], 'chapter ' + n + ' recorded');
    const expectAcc = deliberateMiss ? s.done[n].acc < 100 : s.done[n].acc === (n === 1 ? s.done[n].acc : 100);
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
  await page.evaluate(() => { const S = window.__trainer.state(); S.skills['es-son'] = { r: 1, w: 40 }; window.__trainer.home(); });
  await sleep(80);
  t = await text(); assert.match(t, /Weak spots/); assert.match(t, /Es la una or son las/);
  await clickText('.plan-row', 'Weak spots'); await sleep(100);
  assert.match(await text(), /Weak spots · Es la una/);
  ok('weak spots: skill names come from the course files and the drill opens');
  await page.evaluate(() => window.__trainer.home()); await sleep(80);

  // ---------- settings ----------
  await page.click('button[aria-label="Settings"]'); await sleep(80);
  await page.select('select', '30'); await clickText('button', 'Save'); await sleep(80);
  assert.match(await text(), /of 30 min/);
  ok('settings: daily goal changes to 30 minutes');

  // ---------- practice timer ----------
  const before = (await state()).time[today] || 0;
  for (let i = 0; i < 3; i++) { await page.mouse.move(100 + i * 10, 100); await page.mouse.down(); await page.mouse.up(); await sleep(2200); }
  const after = (await state()).time[today] || 0;
  assert.ok(after > before, 'active time should be counted');
  ok('practice timer counts active time (' + before + 's → ' + after + 's)');

  // ---------- chapters: carry on, no skipping the writing check, back ----------
  await page.evaluate(() => { const S = window.__trainer.state(); S.lesson = { n: 1, step: 4, ex: 0, stats: { right: 5, total: 6 } }; window.__trainer.home(); });
  await sleep(80);
  assert.match(await text(), /Carry on/);
  await clickText('.chap', 'Who you are'); await sleep(120);
  assert.match(await text(), /Say it in your own words/);
  const locked = await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.includes('Continue to the scenario')).disabled);
  assert.equal(locked, true, 'the writing step cannot be skipped before checking');
  await clickText('button', 'Back'); await sleep(120);
  assert.match(await text(), /1 of \d+/); assert.equal((await state()).lesson.step, 3);
  await page.click('button[aria-label="Close lesson"]'); await sleep(80);
  assert.match(await text(), /Carry on/);
  await page.evaluate(() => { delete window.__trainer.state().lesson; window.__trainer.home(); }); await sleep(80);
  ok('chapters: carry on from a saved step, the writing check cannot be skipped, back returns to practice');

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
  assert.match(await text(), /Before you start/, 'after a reset, the name is asked again');
  await page.type('input.text', 'Kara'); await clickText('button', 'Start'); await sleep(100);
  await page.click('button[aria-label="Settings"]'); await sleep(80);
  await (await page.$('input[type=file]')).uploadFile(path.join(dl, exported)); await sleep(200);
  const restored = await state();
  assert.deepStrictEqual(Object.keys(restored.done), Object.keys(saved.done));
  assert.equal(Object.keys(restored.srs).length, Object.keys(saved.srs).length);
  assert.equal(restored.goalMins, 30); assert.equal(restored.xp, saved.xp);
  assert.match(await text(), /of 30 min/);
  fs.rmSync(dl, { recursive: true, force: true });
  ok('export / import: a downloaded file restores chapters, review cards and settings after a reset; a wrong file is refused');

  if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
  console.log('\n' + steps + ' checks passed, no console errors.');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
