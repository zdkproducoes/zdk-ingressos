// Sobe um arquivo de arte para o bucket público "event-assets".
// Uso: node scripts/arte/upload-hero.js <arquivo> <caminho/no/bucket>
// Ex.:  node scripts/arte/upload-hero.js scripts/arte/sambow-fest-provisoria.jpg heroes/sambow-fest/provisoria.jpg
//
// Lê as chaves do .env.local (não commitar chaves — ver CLAUDE.md).

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function carregarEnv() {
  const arquivo = path.join(process.cwd(), '.env.local');
  const env = {};
  for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}

async function main() {
  const [arquivo, destino] = process.argv.slice(2);
  if (!arquivo || !destino) {
    console.error('Uso: node scripts/arte/upload-hero.js <arquivo> <caminho/no/bucket>');
    process.exit(1);
  }

  const env = carregarEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const buffer = fs.readFileSync(arquivo);
  const ext = path.extname(arquivo).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const { error } = await supabase.storage
    .from('event-assets')
    .upload(destino, buffer, { contentType, cacheControl: '31536000', upsert: true });
  if (error) {
    console.error('Falha no upload:', error.message);
    process.exit(1);
  }

  const { data } = supabase.storage.from('event-assets').getPublicUrl(destino);
  console.log(data.publicUrl);
}

main();
