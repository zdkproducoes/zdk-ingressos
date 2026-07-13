// Testa a brecha de escalada de privilégio no SACODE (produção).
// Cria um usuário de teste descartável, tenta virar admin via API pública
// e DESFAZ tudo no final (o usuário é apagado).
//
// Uso:
//   SACODE_URL=https://nsbyylbgnmzlgfwzgasl.supabase.co \
//   SACODE_ANON_KEY=... SACODE_SERVICE_KEY=... \
//   node sql/hotfix-sacode/testar-hotfix.mjs
//
// (as chaves estão em Project Settings → API Keys do projeto sacode-mvp)
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SACODE_URL;
const ANON = process.env.SACODE_ANON_KEY;
const SERVICE = process.env.SACODE_SERVICE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('Defina SACODE_URL, SACODE_ANON_KEY e SACODE_SERVICE_KEY.');
  process.exit(1);
}

const admin = createClient(URL, SER