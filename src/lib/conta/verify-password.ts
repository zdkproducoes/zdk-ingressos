// Confirma a senha atual do usuário antes de operações sensíveis
// (trocar e-mail/senha). Usa um client anon isolado — não mexe nos
// cookies da sessão em andamento.
import { createClient } from '@supabase/supabase-js';

export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  if (!password) return false;
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}
