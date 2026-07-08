// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurado');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    // no-store: impede o Data Cache do Next de congelar respostas do banco
    // (rotas de metadata como sitemap.xml cacheavam a consulta no build)
    global: {
      fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
    },
  }
);
