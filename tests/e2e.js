// Runs the browser test seven times: Spanish with a fake AI tutor and with none, at desktop and phone width,
// then Latin and French, each with the AI on (desktop) and off (Latin at 360px, a small phone; French at 430px, a large one).
// Needs:  npm install   (installs puppeteer, dev only; the app itself has no dependencies)
// Run:    npm run e2e    (set CHROME=path\to\chrome.exe to use an installed Chrome instead)
const { spawn } = require('child_process');
const path = require('path');
const root = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const procs = [];
const start = (args, env) => { const p = spawn(process.execPath, args, { cwd: root, env: Object.assign({}, process.env, env), stdio: 'ignore' }); procs.push(p); return p; };
const run = env => new Promise(res => { const p = spawn(process.execPath, [path.join(__dirname, 'e2e-flow.js')], { cwd: root, env: Object.assign({}, process.env, env), stdio: 'inherit' }); p.on('exit', code => res(code)); });

(async () => {
  start([path.join(__dirname, 'mock-ai.js')], { MOCK_PORT: '9911' });
  start(['server.js'], { PORT: '3130', OPEN_BROWSER: '0', PROVIDER: 'gemini', GEMINI_API_KEY: 'test', GEMINI_BASE_URL: 'http://127.0.0.1:9911' });
  start(['server.js'], { PORT: '3131', OPEN_BROWSER: '0', PROVIDER: 'gemini', GEMINI_API_KEY: '', DEEPSEEK_API_KEY: '' });
  await sleep(1500);
  let failed = 0;
  for (const [label, env] of [['AI on, desktop', { BASE: 'http://localhost:3130' }], ['AI off, desktop', { BASE: 'http://localhost:3131', AI_ON: '0' }], ['AI on, phone width', { BASE: 'http://localhost:3130', W: '390' }],
    ['Latin, AI on, desktop', { BASE: 'http://localhost:3130/?course=la' }], ['Latin, AI off, small phone', { BASE: 'http://localhost:3131/?course=la', AI_ON: '0', W: '360' }],
    ['French, AI on, desktop', { BASE: 'http://localhost:3130/?course=fr-FR' }], ['French, AI off, large phone', { BASE: 'http://localhost:3131/?course=fr-FR', AI_ON: '0', W: '430' }]]) {
    console.log('\n' + label);
    if (await run(env)) failed++;
  }
  procs.forEach(p => p.kill());
  console.log(failed ? '\n' + failed + ' run(s) failed' : '\nAll browser runs passed');
  process.exit(failed ? 1 : 0);
})();
