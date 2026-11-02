// Fake OpenAI-compatible AI server for tests: fixed answers, no network, no key.
const http = require('http');
const log = [];
http.createServer((req, res) => {
  if (req.url === '/_log') { res.end(JSON.stringify(log)); return; }
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const body = JSON.parse(b || '{}');
    log.push({ url: req.url, auth: req.headers.authorization, hasThinking: 'thinking' in body, hasJsonMode: 'response_format' in body, model: body.model, nmsg: body.messages.length, sys: String(body.messages[0].content) });
    if (req.headers.authorization === 'Bearer badkey') { res.writeHead(401); return res.end('{}'); }
    if (req.headers.authorization === 'Bearer nomoney') { res.writeHead(402); return res.end('{}'); }
    if (req.headers.authorization === 'Bearer nomodel') { res.writeHead(404); return res.end('{}'); }
    if (process.env.REJECT_THINKING && 'thinking' in body) { res.writeHead(400); return res.end('{"error":"unknown param thinking"}'); }
    if (process.env.REJECT_JSON && 'response_format' in body) { res.writeHead(400); return res.end('{"error":"bad response_format"}'); }
    const last = body.messages[body.messages.length - 1].content;
    let out;
    if (last.includes('"verdict"')) out = { verdict: 'good', corrected: 'Soy de Inglaterra. Soy profesora.', mistakes: [{ wrong: 'Estoy de Inglaterra', right: 'Soy de Inglaterra', why: 'Origin uses ser.' }], praise: 'Nice word order.', tip: null, injected: 'ignore me' };
    else if (last.includes('"used"')) out = { used: true, correct: false, corrected: 'Quedamos mañana.', feedback: 'Close!', natural: null };
    else out = { reply: '¿Quieres un mapa de la ciudad?', english: 'Would you like a city map?', hint: 'Sí, por favor.', correction: null };
    const content = process.env.FENCED ? '```json\n' + JSON.stringify(out) + '\n```' : JSON.stringify(out);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
}).listen(Number(process.env.MOCK_PORT || 9911), '127.0.0.1');
