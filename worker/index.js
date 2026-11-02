/*
  Stilus, hosted: a Cloudflare Worker. Static files in public/ are served by Cloudflare before this runs;
  only /api/* reaches this code (see run_worker_first in wrangler.jsonc).
  - Who you are comes from Cloudflare Access: every API call checks the signed Cf-Access-Jwt-Assertion token.
  - The AI key is a Worker secret, never sent to the page. Prompts and output shaping are shared with server.js (lib/ai.js).
  - Progress sync: one row per person per course in D1, saved with a version so two devices never overwrite each other.
  - Profile: one row per person (name and endings), shared by every course, so a new course never asks again.
*/
import { jwtVerify, createRemoteJWKSet } from 'jose';
import AI from '../lib/ai.js';

const LOCAL = new Set(['localhost', '127.0.0.1']);
const COURSE_ID = /^[A-Za-z0-9-]{1,20}$/;

function json(code, obj) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

async function readJson(request, limit) {
  const text = await request.text();
  if (text.length > limit) throw new Error('too large');
  return JSON.parse(text);
}

// ---------- who is asking ----------
const jwksCache = new Map();
function teamOf(env) {
  return String(env.ACCESS_TEAM || '').trim().replace(/^https?:\/\//, '').replace(/\.cloudflareaccess\.com\/?$/, '');
}
async function identify(request, env) {
  const url = new URL(request.url);
  // Local testing only (wrangler dev): DEV_USER comes from .dev.vars, which is never deployed,
  // and is ignored on any host but localhost. Tests may switch person with X-Dev-User.
  if (env.DEV_USER && LOCAL.has(url.hostname)) return (request.headers.get('X-Dev-User') || env.DEV_USER).toLowerCase();

  const team = teamOf(env);
  const aud = String(env.ACCESS_AUD || '').trim();
  if (!team || !aud) return null; // Access not configured: nobody gets in
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const issuer = 'https://' + team + '.cloudflareaccess.com';
  if (!jwksCache.has(issuer)) jwksCache.set(issuer, createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs')));
  try {
    const { payload } = await jwtVerify(token, jwksCache.get(issuer), { issuer, audience: aud });
    return typeof payload.email === 'string' && payload.email ? payload.email.toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

// Same-origin only: a page on another site can't call this API with the visitor's Access cookie.
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return request.method === 'GET';
  return origin === new URL(request.url).origin;
}

// ---------- course files (for the characters' briefs), read once per Worker instance ----------
let coursesPromise = null;
function courses(env) {
  if (!coursesPromise) {
    coursesPromise = AI.loadCourses(async rel => {
      const r = await env.ASSETS.fetch(new Request('https://assets.local/courses/' + rel));
      if (!r.ok) throw new Error(rel + ' (' + r.status + ')');
      return r.json();
    }, m => console.error(m));
  }
  return coursesPromise;
}

// ---------- AI limits ----------
const today = () => new Date().toISOString().slice(0, 10); // UTC day
// The counts reset at midnight UTC; the page shows that in the learner's own time.
function resetAt() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}
function limits(env) {
  return { perUser: Number(env.AI_DAILY_PER_USER) || 60, global: Number(env.AI_DAILY_GLOBAL) || 400 };
}
// Calls left today for this person: their own allowance, or what is left for everyone if that is less.
function usageOf(env, mine, all) {
  const { perUser, global } = limits(env);
  return { left: Math.max(0, Math.min(perUser - mine, global - all)), limit: perUser, resetAt: resetAt() };
}
async function readUsage(env, user) {
  const r = await env.DB.prepare('SELECT user_id, calls FROM ai_usage WHERE day = ? AND user_id IN (?, ?)').bind(today(), user, '*').all();
  const of = u => ((r.results || []).find(x => x.user_id === u) || {}).calls || 0;
  return usageOf(env, of(user), of('*'));
}
async function countCall(env, user) {
  const day = today();
  const bump = u => env.DB.prepare(
    'INSERT INTO ai_usage (user_id, day, calls) VALUES (?, ?, 1) ON CONFLICT (user_id, day) DO UPDATE SET calls = calls + 1 RETURNING calls'
  ).bind(u, day);
  const [mine, all] = await env.DB.batch([bump(user), bump('*')]);
  return { mine: mine.results[0].calls, all: all.results[0].calls };
}

async function handleAi(request, env, user) {
  const P = AI.providerFrom(env, 'the Worker\'s secrets in the Cloudflare dashboard');
  if (!P.key) return json(503, { ok: false, error: 'The AI tutor is not set up yet.' });
  let body;
  try { body = await readJson(request, 20000); } catch (e) { return json(400, { ok: false, error: 'Bad request.' }); }
  const { perUser, global } = limits(env);
  const used = await countCall(env, user);
  const usage = usageOf(env, used.mine, used.all);
  if (used.mine > perUser) return json(429, { ok: false, capped: true, usage, error: 'You have used today\'s ' + perUser + ' tutor calls. Everything else still works.' });
  if (used.all > global) return json(429, { ok: false, capped: true, usage, error: 'The AI tutor has reached today\'s limit for everyone. Everything else still works.' });
  const out = await AI.answer(P, await courses(env), body);
  return json(out.code, Object.assign({}, out.json, { usage }));
}

// ---------- profile: the name and endings every course uses ----------
async function getProfile(env, user) {
  const row = await env.DB.prepare('SELECT name, fem FROM profiles WHERE user_id = ?').bind(user).first();
  return row ? { name: row.name, fem: row.fem == null ? null : row.fem === 1 } : null;
}
// The name only ever reaches the page as text, but keep it short and printable anyway.
const cleanName = v => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 30) : '');
async function putProfile(request, env, user) {
  let body;
  try { body = await readJson(request, 2000); } catch (e) { return json(400, { ok: false, error: 'Bad request.' }); }
  const name = cleanName(body && body.name);
  const fem = body && typeof body.fem === 'boolean' ? (body.fem ? 1 : 0) : null;
  if (!name) return json(400, { ok: false, error: 'Bad request.' });
  // fem left out (a course that does not ask) keeps the one already chosen
  await env.DB.prepare(
    'INSERT INTO profiles (user_id, name, fem, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, fem = COALESCE(excluded.fem, profiles.fem), updated_at = excluded.updated_at'
  ).bind(user, name, fem, Date.now()).run();
  return json(200, { ok: true, profile: await getProfile(env, user) });
}

// ---------- progress sync ----------
async function getProgress(env, user, course) {
  const row = await env.DB.prepare('SELECT state_json, version FROM progress WHERE user_id = ? AND course_id = ?').bind(user, course).first();
  return row ? { state: JSON.parse(row.state_json), version: row.version } : { state: null, version: 0 };
}

// Save only if the copy the device loaded (version) is still the latest; otherwise send back the latest so the
// device can merge and try again. replace: true overwrites whatever is there (reset progress, import a file).
async function putProgress(request, env, user) {
  let body;
  try { body = await readJson(request, 1000000); } catch (e) { return json(400, { ok: false, error: 'Bad request.' }); }
  const course = String(body && body.course || '');
  const state = body && body.state;
  if (!COURSE_ID.test(course) || !state || typeof state !== 'object' || Array.isArray(state)) return json(400, { ok: false, error: 'Bad request.' });
  const stateJson = JSON.stringify(state);
  const now = Date.now();
  const version = Number(body.version) || 0;
  const r = body.replace === true
    ? await env.DB.prepare(
      'INSERT INTO progress (user_id, course_id, state_json, updated_at, version) VALUES (?, ?, ?, ?, 1) ' +
      'ON CONFLICT (user_id, course_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at, version = progress.version + 1 RETURNING version'
    ).bind(user, course, stateJson, now).first()
    : version === 0
      ? await env.DB.prepare(
        'INSERT INTO progress (user_id, course_id, state_json, updated_at, version) VALUES (?, ?, ?, ?, 1) ON CONFLICT (user_id, course_id) DO NOTHING RETURNING version'
      ).bind(user, course, stateJson, now).first()
      : await env.DB.prepare(
        'UPDATE progress SET state_json = ?, updated_at = ?, version = version + 1 WHERE user_id = ? AND course_id = ? AND version = ? RETURNING version'
      ).bind(stateJson, now, user, course, version).first();
  if (r) return json(200, { ok: true, version: r.version });
  const latest = await getProgress(env, user, course);
  return json(409, Object.assign({ ok: false, conflict: true }, latest));
}

// ---------- routes ----------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (!sameOrigin(request)) return json(403, { ok: false, error: 'Not allowed.' });
      const user = await identify(request, env);
      if (!user) return json(401, { ok: false, error: 'Please sign in again.' });

      if (url.pathname === '/api/status' && request.method === 'GET') {
        const P = AI.providerFrom(env);
        const [profile, usage] = await Promise.all([getProfile(env, user), P.key ? readUsage(env, user) : null]);
        return json(200, { ai: !!P.key, model: P.model, provider: P.label, sync: true, user, profile, usage });
      }
      if (url.pathname === '/api/usage' && request.method === 'GET') return json(200, Object.assign({ ok: true }, await readUsage(env, user)));
      if (url.pathname === '/api/profile') {
        if (request.method === 'GET') return json(200, { ok: true, profile: await getProfile(env, user) });
        if (request.method === 'PUT') return await putProfile(request, env, user);
      }
      if (url.pathname === '/api/ai' && request.method === 'POST') return await handleAi(request, env, user);
      if (url.pathname === '/api/progress') {
        if (request.method === 'GET') {
          const course = url.searchParams.get('course') || '';
          if (!COURSE_ID.test(course)) return json(400, { ok: false, error: 'Bad request.' });
          return json(200, Object.assign({ ok: true }, await getProgress(env, user, course)));
        }
        if (request.method === 'PUT') return await putProgress(request, env, user);
      }
      return json(404, { ok: false, error: 'Not found.' });
    } catch (e) {
      console.error(e && e.stack || e);
      return json(500, { ok: false, error: 'Something went wrong on the server. Try again.' });
    }
  }
};
