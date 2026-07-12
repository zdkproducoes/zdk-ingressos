// Setup E2E: confirma/cria as contas de TESTE com senha conhecida.
// NUNCA toca na conta do Fernando. Roda com a service_role do .env.local.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'TesteE2E!12345';
const TEST_USERS = [
  { email: 'produtor.a@teste.com', full_name: 'Produtor A Teste', cpf: '39053344705' },
  { email: 'produtor.b@teste.com', full_name: 'Produtor B Teste', cpf: '95524361503' },
  { email: 'comprador@teste.com',  full_name: 'Comprador Teste',  cpf: '87748248800' },
];

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 100 });
if (listErr) throw listErr;

for (const u of TEST_USERS) {
  const existing = list.users.find((x) => x.email === u.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`ok atualizado: ${u.email}`);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, cpf: u.cpf, phone: '11999990000' },
    });
    if (error) throw error;
    console.log(`ok criado: ${u.email}`);
  }
}

// O app também checa profiles.email_confirmed_at (fluxo próprio de confirmação)
const { error: confErr } = await admin
  .from('profiles')
  .update({ email_confirmed_at: new Date().toISOString() })
  .in('email', TEST_USERS.map((u) => u.email));
if (confErr) throw confErr;
console.log('ok profiles confirmados');
