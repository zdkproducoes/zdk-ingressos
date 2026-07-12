// E2E multi-organização: valida o isolamento por organização contra o app
// rodando em http://localhost:3000. Usa as contas de teste criadas pelo
// e2e-setup.mjs (senha conhecida) — nunca as contas reais.
//
// Uso: node scripts/e2e-run.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const PASSWORD = 'TesteE2E!12345';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

// ---- helpers -------------------------------------------------------------

function base64url(str) {
  return Buffer.from(str, 'utf8').toString('base64url');
}

// Reproduz o formato do @supabase/ssr: "base64-" + base64url(JSON), com
// chunking em 3180 chars (name.0, name.1, ...)
function sessionToCookieHeader(session) {
  const encoded = 'base64-' + base64url(JSON.stringify(session));
  const MAX = 3180;
  if (encoded.length <= MAX) return `${COOKIE_NAME}=${encoded}`;
  const chunks = [];
  for (let i = 0; i * MAX < encoded.length; i++) {
    chunks.push(`${COOKIE_NAME}.${i}=${encoded.slice(i * MAX, (i + 1) * MAX)}`);
  }
  return chunks.join('; ');
}

async function loginCookie(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return sessionToCookieHeader(data.session);
}

let passed = 0;
let failed = 0;
function check(label, ok, extra = '') {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label} ${extra}`);
  }
}

async function api(path, { method = 'GET', cookie = null, body = null } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* html */ }
  const text = json ? '' : await res.text();
  return { status: res.status, json, text, headers: res.headers };
}

// ---- dados base ----------------------------------------------------------

const anon = createClient(SUPABASE_URL, ANON_KEY);
const { data: events } = await anon
  .from('events')
  .select('id, slug, title')
  .in('slug', ['festival-alfa', 'baile-beta']);
const eventA = events.find((e) => e.slug === 'festival-alfa');
const eventB = events.find((e) => e.slug === 'baile-beta');
if (!eventA || !eventB) throw new Error('Eventos de seed não encontrados');

console.log(`\nE2E contra ${BASE}`);
console.log(`Evento A (Produtora Alfa): ${eventA.id}`);
console.log(`Evento B (Produtora Beta): ${eventB.id}\n`);

// ---- 1. páginas públicas ---------------------------------------------------

console.log('— Páginas públicas (anon)');
{
  const home = await api('/');
  check('home responde 200', home.status === 200, `(status ${home.status})`);
  check('home lista Festival Alfa', home.text.includes('Festival Alfa'));
  check('home lista Baile Beta', home.text.includes('Baile Beta'));

  const evA = await api('/evento/festival-alfa');
  check('/evento/festival-alfa 200', evA.status === 200);
  check('página do evento tem lineup (Banda Alfa)', evA.text.includes('Banda Alfa'));
  check('página tem JSON-LD MusicEvent', evA.text.includes('"@type":"MusicEvent"'));
  check('organizador exibido', evA.text.includes('Produtora Alfa'));
  check('sem marca antiga (SACODE)', !evA.text.includes('SACODE'));

  const evB = await api('/evento/baile-beta');
  check('/evento/baile-beta mostra "em breve"', evB.status === 200 && /em breve/i.test(evB.text));
}

// ---- 2. anônimo não entra no painel ---------------------------------------

console.log('— Anônimo bloqueado');
{
  const r1 = await api('/api/admin/cortesias');
  check('GET /api/admin/cortesias → 401', r1.status === 401, `(status ${r1.status})`);
  const r2 = await api('/admin/resumo');
  check('GET /admin/resumo → redirect login', [302, 307].includes(r2.status), `(status ${r2.status})`);
}

// ---- 3. comprador comum não entra no painel --------------------------------

console.log('— Comprador (role customer) bloqueado');
{
  const cookie = await loginCookie('comprador@teste.com');
  const r = await api('/api/admin/eventos/select', {
    method: 'POST', cookie, body: { event_id: eventA.id },
  });
  check('POST eventos/select → 403', r.status === 403, `(status ${r.status})`);
}

// ---- 4. produtor A: acessa o que é dele, 404 no que é do B -----------------

console.log('— Produtor A (owner da Alfa)');
{
  const cookie = await loginCookie('produtor.a@teste.com');

  const own = await api('/api/admin/eventos/select', {
    method: 'POST', cookie, body: { event_id: eventA.id },
  });
  check('seleciona o PRÓPRIO evento → 200', own.status === 200, `(status ${own.status})`);

  const cross = await api('/api/admin/eventos/select', {
    method: 'POST', cookie, body: { event_id: eventB.id },
  });
  check('seleciona evento da org B → 404', cross.status === 404, `(status ${cross.status})`);

  const patchCross = await api(`/api/admin/eventos/${eventB.id}`, {
    method: 'PATCH', cookie, body: { action: 'set_status', status: 'draft' },
  });
  check('PATCH evento da org B → 404', patchCross.status === 404, `(status ${patchCross.status})`);

  const vendaCross = await api(`/api/admin/venda-offline?eventId=${eventB.id}`, { cookie });
  check('venda-offline do evento B → 404', vendaCross.status === 404, `(status ${vendaCross.status})`);

  const vendaOwn = await api(`/api/admin/venda-offline?eventId=${eventA.id}`, { cookie });
  check('venda-offline do próprio evento → 200', vendaOwn.status === 200, `(status ${vendaOwn.status})`);

  const loteCross = await api('/api/admin/lotes/create', {
    method: 'POST', cookie,
    body: { event_id: eventB.id, name: 'Invasor', price: 10, quantity: 5 },
  });
  check('criar lote no evento B → bloqueado', [400, 404].includes(loteCross.status), `(status ${loteCross.status})`);

  const cortCross = await api('/api/admin/cortesias', {
    method: 'POST', cookie,
    body: { eventId: eventB.id, guestProfileId: '00000000-0000-0000-0000-000000000000', quantity: 1 },
  });
  check('cortesia no evento B → 404', cortCross.status === 404, `(status ${cortCross.status})`);

  const fin = await api('/admin/financeiro', { cookie });
  check('financeiro abre (owner) e mostra só a Alfa',
    fin.status === 200 && fin.text.includes('Vendas brutas') && !fin.text.includes('Produtora Beta'),
    `(status ${fin.status})`);

  const eventosPage = await api('/admin/eventos', { cookie });
  check('lista de eventos: só Festival Alfa',
    eventosPage.status === 200 && eventosPage.text.includes('Festival Alfa') && !eventosPage.text.includes('Baile Beta'),
    `(status ${eventosPage.status})`);

  const checkinCross = await api('/checkin/baile-beta', { cookie });
  check('check-in do evento B → 404', checkinCross.status === 404, `(status ${checkinCross.status})`);

  const plataforma = await api('/admin/plataforma', { cookie });
  check('tela Plataforma vedada a produtor (redirect)',
    [302, 307].includes(plataforma.status), `(status ${plataforma.status})`);

  const publico = await api('/admin/publico', { cookie });
  check('aba Público vedada a produtor (redirect)',
    [302, 307].includes(publico.status), `(status ${publico.status})`);
}

// ---- 5. produtor B: espelho ------------------------------------------------

console.log('— Produtor B (owner da Beta)');
{
  const cookie = await loginCookie('produtor.b@teste.com');
  const cross = await api('/api/admin/eventos/select', {
    method: 'POST', cookie, body: { event_id: eventA.id },
  });
  check('seleciona evento da org A → 404', cross.status === 404, `(status ${cross.status})`);

  const own = await api('/api/admin/eventos/select', {
    method: 'POST', cookie, body: { event_id: eventB.id },
  });
  check('seleciona o PRÓPRIO evento → 200', own.status === 200, `(status ${own.status})`);
}

// ---- resultado -------------------------------------------------------------

console.log(`\n${passed} passaram · ${failed} falharam`);
process.exit(failed > 0 ? 1 : 0);
