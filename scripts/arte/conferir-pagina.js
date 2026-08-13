// Confere as secoes da pagina de vendas do SAMBOW FEST na pre-visualizacao.
// Uso: node scripts/arte/conferir-pagina.js
// Descartavel — nao faz parte do app.

const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:3311';
const EMAIL = 'produtor_teste1@teste.com.br';

function carregarEnv() {
  const env = {};
  for (const linha of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}

const env = carregarEnv();

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const senha = `conf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const alvo = lista.users.find((u) => u.email === EMAIL);
  await admin.auth.admin.updateUserById(alvo.id, { password: senha });

  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: senha }),
  });
  const s = await r.json();
  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
  const payload = JSON.stringify({
    access_token: s.access_token, token_type: 'bearer', expires_in: s.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + s.expires_in,
    refresh_token: s.refresh_token, user: s.user,
  });
  const bruto = `base64-${Buffer.from(payload).toString('base64')}`;
  const PEDACO = 3180;
  const cookies = [];
  if (bruto.length <= PEDACO) cookies.push(`sb-${ref}-auth-token=${bruto}`);
  else for (let i = 0, n = 0; i < bruto.length; i += PEDACO, n++)
    cookies.push(`sb-${ref}-auth-token.${n}=${bruto.slice(i, i + PEDACO)}`);

  const resp = await fetch(`${BASE}/evento/sambow-fest?preview=1`, {
    headers: { cookie: cookies.join('; ') },
  });
  const html = await resp.text();

  const secoes = [
    ['tarja de pre-visualizacao', 'PRÉ-VISUALIZAÇÃO'],
    ['titulo', 'SAMBOW FEST'],
    ['subtitulo', 'domingo inteiro de pagode'],
    ['banner provisorio', 'heroes/sambow-fest/provisoria-v1.jpg'],
    ['aviso de abertura na tarja', 'Abertura das Vendas'],
    ['data de abertura', '13/08 às 18h'],
    ['bloco EM BREVE', 'EM BREVE'],
    ['data do evento', '20 de setembro'],
    ['local', 'Villa Jardim Bar'],
    ['cidade', 'São Bernardo do Campo'],
    ['secao de lineup', 'Lineup'],
    ['headliner 1', 'Pagode do Gordinho'],
    ['headliner 2', 'Pagode do DB'],
    ['headliner 3', 'GICA'],
    ['participacao Alex Fernandes', 'Alex Fernandes'],
    ['participacao Tibério', 'Tibério'],
    ['participacao Sing Santiago', 'Sing Santiago'],
    ['participacao Caio Lacerda', 'Caio Lacerda'],
    ['participacao Samba na Rede', 'Samba na Rede'],
    ['participacao Agitai', 'Agitai'],
    ['DJ Dhupan', 'DJ Dhupan'],
    ['DJ DYO', 'DJ DYO'],
    ['DJ DUH', 'DJ DUH'],
    ['copy de abertura', 'festival de pagode'],
    ['mapa', 'maps'],
    ['organizador', 'Danilo Barbosa'],
    ['JSON-LD de evento', '"@type":"MusicEvent"'],
    ['JSON-LD com o lineup', '"@type":"MusicGroup"'],
    ['noindex no rascunho', 'noindex'],
  ];

  let falhas = 0;
  for (const [nome, agulha] of secoes) {
    const ok = html.includes(agulha);
    if (!ok) falhas++;
    console.log(`${ok ? 'ok  ' : 'FALTA'}  ${nome}`);
  }

  // O que NAO pode aparecer num evento que ainda nao abriu vendas
  const proibidos = [
    ['botao de compra ativo', 'Garantir meu ingresso'],
    ['preco na tarja', 'A partir de R$'],
  ];
  for (const [nome, agulha] of proibidos) {
    const presente = html.includes(agulha);
    if (presente) falhas++;
    console.log(`${presente ? 'INDEVIDO' : 'ok  '}  ${nome} (nao deve aparecer antes de 13/08)`);
  }

  await admin.auth.admin.updateUserById(alvo.id, {
    password: `descartada-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  });

  console.log(`\n${falhas === 0 ? 'pagina completa' : `${falhas} problema(s)`}`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => { console.error('erro:', e.message); process.exit(1); });
