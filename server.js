'use strict';
/*
  Stilus: tiny local server. No dependencies. Needs Node.js 18+.
  - Serves the app from ./public
  - Keeps your AI API key on this computer (never sent to the browser)
  - Exposes /api/status and /api/ai for the optional AI tutor features
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

if (typeof fetch !== 'function') {
  console.error('\nThis app needs Node.js 18 or newer. Get it free from https://nodejs.org\n');
  process.exit(1);
}

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');

// ---------- settings ----------
function loadSettings() {
  const out = {};
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'settings.env'), 'utf8').replace(/^﻿/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[k] = v;
    }
  } catch (e) { /* no settings file is fine */ }
  for (const k of ['PROVIDER', 'DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL', 'DEEPSEEK_BASE_URL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_BASE_URL', 'PORT', 'OPEN_BROWSER']) {
    if (process.env[k]) out[k] = process.env[k];
  }
  return out;
}

const S = loadSettings();
const PORT = Number(S.PORT) || 3000;

const AI = require('./lib/ai.js');
const P = AI.providerFrom(S);
const API_KEY = P.key;
const MODEL = P.model;

// Course files are read once at start-up (see lib/ai.js), before the server starts listening.
const readCourseFile = rel => JSON.parse(fs.readFileSync(path.join(PUBLIC, 'courses', rel), 'utf8'));
let COURSES = {};

// ---------- tiny safety rails (this key costs money) ----------
const hits = [];
function rateLimited() {
  const now = Date.now();
  while (hits.length && now - hits[0] > 60000) hits.shift();
  if (hits.length >= 40) return true;
  hits.push(now);
  return false;
}
function localOnly(req) {
  const host = String(req.headers.host || '').split(':')[0];
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  const origin = req.headers.origin;
  if (origin) {
    try { const h = new URL(origin).hostname; if (h !== 'localhost' && h !== '127.0.0.1') return false; } catch (e) { return false; }
  }
  return true;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(b);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname.startsWith('/api/')) {
      if (!localOnly(req)) return sendJson(res, 403, { ok: false, error: 'Local access only.' });

      if (url.pathname === '/api/status' && req.method === 'GET') {
        return sendJson(res, 200, { ai: !!API_KEY, model: MODEL, provider: P.label });
      }
      if (url.pathname === '/api/ai' && req.method === 'POST') {
        if (!API_KEY) return sendJson(res, 503, { ok: false, error: 'The AI tutor is not set up yet (no ' + P.label + ' API key in settings.env).' });
        if (rateLimited()) return sendJson(res, 429, { ok: false, error: 'Slow down a little: too many AI requests in a minute.' });
        let body;
        try { body = JSON.parse(await readBody(req, 20000)); } catch (e) { return sendJson(res, 400, { ok: false, error: 'Bad request.' }); }
        const out = await AI.answer(P, COURSES, body);
        return sendJson(res, out.code, out.json);
      }
      return sendJson(res, 404, { ok: false, error: 'Not found.' });
    }

    // static files
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
});

server.on('error', err => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('\nPort ' + PORT + ' is already in use. Is the trainer already running in another window?');
    console.error('Close that window, or set a different PORT in settings.env.\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

const listen = () => server.listen(PORT, '127.0.0.1', () => {
  const addr = 'http://localhost:' + PORT;
  console.log('\n  Stilus is running at ' + addr);
  console.log('  AI tutor: ' + (API_KEY ? 'ON (' + P.label + ', model ' + MODEL + ')' : 'OFF (add a key in settings.env to switch it on)'));
  console.log('  Leave this window open while you study. Close it to stop.\n');
  if (S.OPEN_BROWSER !== '0') {
    const cmd = process.platform === 'win32' ? 'start "" "' + addr + '"' : process.platform === 'darwin' ? 'open "' + addr + '"' : 'xdg-open "' + addr + '"';
    exec(cmd, () => { /* ignore failures; the address is printed above */ });
  }
});

AI.loadCourses(readCourseFile, m => console.error(m)).then(c => { COURSES = c; listen(); });
