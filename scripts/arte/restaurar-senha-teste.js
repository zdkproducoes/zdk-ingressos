// Restaura a senha da conta de teste produtor_teste1@teste.com.br.
// Uso: node scripts/arte/restaurar-senha-teste.js <senha>
// Descartavel — nao faz parte do app.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const EMAIL = 'produtor_teste1@teste.com.br';
const senha = process.argv[2];
if (!senha) {
  console.error('Uso: node scripts/arte/restaurar-senha-teste.js <senha>');
  process.exit(1);
}

function carregarEnv() {
  const env = {};
  for (const linha of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}

async function main() {
  const env = carregarEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const alvo = lista.users.find((u) => u.email === EMAIL);
  if (!alvo) throw new Error(`usuario ${EMAIL} nao encontrado`);

  const { error } = await admin.auth.admin.updateUserById(alvo.id, { password: senha });
  if (error) throw new Error(error.message);
  console.log(`senha de ${EMAIL} redefinida.`);

  // Confirma que o login funciona de verdade
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: senha }),
  });
  const s = await r.json();
  console.log(s.access_token ? 'login testado: OK' : `login FALHOU: ${JSON.stringify(s)}`);
  process.exit(s.access_token ? 0 : 1);
}

main().catch((e) => { console.error('erro:', e.message); process.exit(1); });
