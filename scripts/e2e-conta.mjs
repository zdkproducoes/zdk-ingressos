// Teste E2E da área do cliente (/minha-conta) — usa a conta de teste
// comprador@teste.com criada pelo e2e-setup.mjs.
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
const REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const COOKIE = `sb-${REF}-auth-token`;

function cookieFor(session) {
  const enc = 'base64-' + Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const MAX = 3180;
  if (enc.length <= MAX) return `${COOKIE}=${enc}`;
  const parts = [];
  for (let i = 0; i * MAX < enc.length; i++) parts.push(`${COOKIE}.${i}=${enc.slice(i * MAX, (i + 1) * MAX)}`);
  return parts.join('; ');
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let { data, error } = await client.auth.signInWithPassword({ email: 'comprador@teste.com', password: PASSWORD });
if (error) throw error;
let cookie = cookieFor(data.session);

async function relogin(password) {
  const res = await client.auth.signInWithPassword({ email: 'comprador@teste.com', password });
  if (res.error) throw res.error;
  data = res.data;
  cookie = cookieFor(res.data.session);
}

let passed = 0, failed = 0;
const check = (label, ok, extra = '') => {
  ok ? passed++ : failed++;
  console.log(`  ${ok ? '✅' : '❌'} ${label} ${ok ? '' : extra}`);
};

async function api(path, method = 'GET', body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect: 'manual',
    headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* binário/html */ }
  return { status: res.status, json };
}

console.log('— Área do cliente');

// página exige login (anon → redirect)
{
  const res = await fetch(`${BASE}/minha-conta`, { redirect: 'manual' });
  check('anon em /minha-conta → redirect', [302, 307].includes(res.status), `(${res.status})`);
}

// atualizar dados pessoais
{
  const r = await api('/api/conta/perfil', 'PATCH', {
    first_name: 'Comprador', last_name: 'Teste E2E', city: 'Santo André', state: 'sp',
    marketing_consent: true,
  });
  check('PATCH perfil → 200', r.status === 200, `(${r.status}) ${r.json?.error ?? ''}`);
}

// senha errada bloqueia troca de senha
{
  const r = await api('/api/conta/senha', 'POST', { current_password: 'errada123', new_password: 'NovaSenha123' });
  check('senha atual errada → 403', r.status === 403, `(${r.status})`);
}

// troca de senha válida (e volta)
{
  const r1 = await api('/api/conta/senha', 'POST', { current_password: PASSWORD, new_password: 'NovaSenha123!' });
  check('troca de senha → 200', r1.status === 200, `(${r1.status}) ${r1.json?.error ?? ''}`);
  // trocar senha revoga as sessões (esperado) — sessão antiga deve morrer
  const dead = await api('/api/conta/perfil', 'PATCH', { first_name: 'X' });
  check('sessão antiga revogada após troca → 401', dead.status === 401, `(${dead.status})`);
  await relogin('NovaSenha123!');
  const r2 = await api('/api/conta/senha', 'POST', { current_password: 'NovaSenha123!', new_password: PASSWORD });
  check('volta a senha original → 200', r2.status === 200, `(${r2.status})`);
  await relogin(PASSWORD);
}

// e-mail: senha errada bloqueia
{
  const r = await api('/api/conta/email/solicitar', 'POST', { new_email: 'novo@teste.com', password: 'errada' });
  check('trocar e-mail com senha errada → 403', r.status === 403, `(${r.status})`);
}

// e-mail já em uso por outra conta
{
  const r = await api('/api/conta/email/solicitar', 'POST', { new_email: 'produtor.a@teste.com', password: PASSWORD });
  check('e-mail de outra conta → 409', r.status === 409, `(${r.status})`);
}

// celular: fluxo completo com dev_code
{
  const r1 = await api('/api/conta/telefone/solicitar', 'POST', { new_phone: '(11) 98888-7777', channel: 'sms' });
  check('solicitar código de celular → 200', r1.status === 200, `(${r1.status}) ${r1.json?.error ?? ''}`);
  const code = r1.json?.dev_code;
  check('dev_code presente (sem Twilio em dev)', Boolean(code));
  if (code) {
    const bad = await api('/api/conta/telefone/confirmar', 'POST', { code: '000000' });
    check('código errado → 400', bad.status === 400, `(${bad.status})`);
    const okc = await api('/api/conta/telefone/confirmar', 'POST', { code });
    check('código certo atualiza celular → 200', okc.status === 200 && okc.json?.phone === '5511988887777', `(${okc.status})`);
  }
}

// exportar dados (LGPD)
{
  const res = await fetch(`${BASE}/api/conta/exportar`, { headers: { cookie } });
  const body = await res.json().catch(() => null);
  check('exportar dados → 200 com perfil e pedidos', res.status === 200 && body?.perfil && Array.isArray(body?.pedidos), `(${res.status})`);
}

// 🔒 fix de segurança: escalada de role via PostgREST deve falhar
{
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${data.session.user.id}`, {
    method: 'PATCH',
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      authorization: `Bearer ${data.session.access_token}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({ role: 'admin' }),
  });
  check('PATCH role=admin via PostgREST → bloqueado (401/403)', [401, 403].includes(res.status), `(${res.status})`);
}

console.log(`\n${passed} passaram · ${failed} falharam`);
process.exit(failed > 0 ? 1 : 0);
