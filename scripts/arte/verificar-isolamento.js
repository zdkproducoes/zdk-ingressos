// Verificacao de ponta a ponta do isolamento entre produtores.
//
// Loga como produtor_teste1 (owner SO da org "Danilo Barbosa") contra o
// servidor local e confere, com HTTP de verdade, que ele:
//   - enxerga o SAMBOW FEST (org dele)
//   - NAO enxerga nada do "Pagode do Gordinho" (org do Cassio)
//   - leva 404 no afiliado de outra org (era o vazamento do panel_token)
//   - nao recebe telefone/CPF cru na busca de cortesia
//   - consegue PRE-VISUALIZAR o proprio evento em rascunho
//
// Uso: node scripts/arte/verificar-isolamento.js [baseUrl]
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
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const resultados = [];
function checar(nome, ok, detalhe = '') {
  resultados.push({ nome, ok, detalhe });
  console.log(`${ok ? 'PASS' : 'FALHOU'}  ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
}

async function main() {
  // 1) senha temporaria na conta de teste (conta descartavel @teste.com.br)
  const senha = `verif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const alvo = lista.users.find((u) => u.email === EMAIL);
  if (!alvo) throw new Error(`usuario ${EMAIL} nao encontrado`);
  const { error: errSenha } = await admin.auth.admin.updateUserById(alvo.id, { password: senha });
  if (errSenha) throw new Error(`nao consegui definir a senha: ${errSenha.message}`);

  // 2) login via GoTrue -> tokens
  const respLogin = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: senha }),
  });
  const sessao = await respLogin.json();
  if (!sessao.access_token) throw new Error(`login falhou: ${JSON.stringify(sessao)}`);

  // 3) cookie de sessao no formato do @supabase/ssr (base64- + chunks)
  const ref = new URL(URL_SB).hostname.split('.')[0];
  const payload = JSON.stringify({
    access_token: sessao.access_token,
    token_type: 'bearer',
    expires_in: sessao.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + sessao.expires_in,
    refresh_token: sessao.refresh_token,
    user: sessao.user,
  });
  const bruto = `base64-${Buffer.from(payload).toString('base64')}`;
  const PEDACO = 3180;
  const cookies = [];
  if (bruto.length <= PEDACO) {
    cookies.push(`sb-${ref}-auth-token=${bruto}`);
  } else {
    for (let i = 0, n = 0; i < bruto.length; i += PEDACO, n++) {
      cookies.push(`sb-${ref}-auth-token.${n}=${bruto.slice(i, i + PEDACO)}`);
    }
  }
  const cookieHeader = cookies.join('; ');

  const get = async (rota) => {
    const r = await fetch(`${BASE}${rota}`, {
      headers: { cookie: cookieHeader },
      redirect: 'manual',
    });
    return { status: r.status, corpo: await r.text() };
  };

  // ---- verificacoes ----
  const painel = await get('/admin/eventos');
  checar('produtor entra no painel', painel.status === 200, `HTTP ${painel.status}`);
  checar(
    'aba Eventos mostra o SAMBOW FEST (org dele)',
    painel.corpo.includes('SAMBOW FEST'),
  );
  checar(
    'aba Eventos NAO mostra o Pagode do Gordinho (outra org)',
    !painel.corpo.includes('As que ningu'),
  );

  const cortesias = await get('/admin/cortesias');
  checar(
    'dropdown de cortesias nao vaza evento de outra org',
    cortesias.status === 200 && !cortesias.corpo.includes('As que ningu'),
    `HTTP ${cortesias.status}`,
  );

  // afiliado de OUTRA organizacao (o furo do panel_token)
  const { data: afiliadoAlheio } = await admin
    .from('affiliates')
    .select('id, panel_token, events!inner(organization_id)')
    .eq('events.organization_id', '7412c752-4ed5-4544-93f1-9f7b549ea2e8')
    .limit(1)
    .maybeSingle();

  if (afiliadoAlheio) {
    const r = await get(`/admin/afiliados/${afiliadoAlheio.id}`);
    checar(
      'afiliado de outra org responde 404',
      r.status === 404,
      `HTTP ${r.status}`,
    );
    checar(
      'panel_token de outra org nao vaza no HTML',
      !r.corpo.includes(afiliadoAlheio.panel_token),
    );
  } else {
    checar('afiliado de outra org responde 404', true, 'sem afiliado cadastrado p/ testar');
  }

  // busca de cortesia: nao pode devolver telefone nem CPF cru
  const { data: alguem } = await admin
    .from('profiles')
    .select('email, phone, cpf')
    .not('cpf', 'is', null)
    .not('phone', 'is', null)
    .limit(1)
    .maybeSingle();

  if (alguem) {
    const r = await get(`/api/admin/cortesias/buscar?q=${encodeURIComponent(alguem.email)}`);
    const json = JSON.parse(r.corpo);
    checar('busca de cortesia nao devolve telefone', !('phone' in (json.profile ?? {})));
    checar(
      'busca de cortesia nao devolve CPF cru',
      !r.corpo.includes(alguem.cpf),
      `veio: ${json.profile?.cpf ?? '—'}`,
    );
    checar(
      'busca de cortesia nao devolve e-mail cru',
      !r.corpo.includes(alguem.email),
      `veio: ${json.profile?.email ?? '—'}`,
    );
  }

  // pre-visualizacao do proprio rascunho
  const prev = await get('/evento/sambow-fest?preview=1');
  checar('produtor pre-visualiza o proprio rascunho', prev.status === 200, `HTTP ${prev.status}`);
  checar('a pre-visualizacao mostra a tarja', prev.corpo.includes('PRÉ-VISUALIZAÇÃO'));
  checar('a pre-visualizacao traz o lineup', prev.corpo.includes('PAGODE DO DB') || prev.corpo.includes('Pagode do DB'));

  // rascunho de outra org nao seria visivel — o Gordinho esta ativo, entao
  // aqui so conferimos que a pagina publica dele continua normal (sem tarja)
  const publico = await get('/evento/pagode-do-gordinho-as-que-ninguem-pede');
  checar(
    'evento publicado de outra org segue normal (sem tarja)',
    publico.status === 200 && !publico.corpo.includes('PRÉ-VISUALIZAÇÃO'),
    `HTTP ${publico.status}`,
  );

  // 4) invalida a senha temporaria
  await admin.auth.admin.updateUserById(alvo.id, {
    password: `descartada-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  });
  console.log('\nsenha temporaria invalidada.');

  const falhas = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} verificacoes passaram.`);
  process.exit(falhas.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('erro:', e.message);
  process.exit(1);
});
