// app/auth/confirmar/page.tsx
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <Status type="error" title="Link inválido" message="O link de confirmação está incompleto." />;

  const { data: rec } = await supabaseAdmin
    .from('email_confirmations').select('*').eq('token', token).maybeSingle();

  if (!rec) return <Status type="error" title="Link inválido" message="Este link não foi encontrado." />;
  if (rec.confirmed_at) return <Status type="ok" title="Já confirmado" message="Sua conta já foi confirmada anteriormente." showLogin />;
  if (new Date(rec.expires_at) < new Date()) return <Status type="error" title="Link expirado" message="Este link expirou. Faça login para receber um novo." showLogin />;

  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(rec.user_id, { email_confirm: true });
  if (updErr) return <Status type="error" title="Erro" message="Não foi possível confirmar agora. Tente novamente." />;

  await supabaseAdmin.from('email_confirmations').update({ confirmed_at: new Date().toISOString() }).eq('id', rec.id);
  await supabaseAdmin.from('profiles').update({ email_confirmed_at: new Date().toISOString() }).eq('id', rec.user_id);

  return <Status type="ok" title="E-mail confirmado!" message="Sua conta está ativa. Você já pode fazer login." showLogin />;
}

function Status({ type, title, message, showLogin }: { type: 'ok'|'error'; title: string; message: string; showLogin?: boolean }) {
  const colors = type === 'ok' ? 'bg-emerald-950 border-emerald-800 text-emerald-100' : 'bg-red-950 border-red-800 text-red-100';
  return (
    <main className="min-h-screen bg-surface-800 flex items-center justify-center px-4">
      <div className={`max-w-md w-full rounded-xl border p-8 text-center ${colors}`}>
        <div className="text-5xl mb-4">{type === 'ok' ? '✅' : '⚠️'}</div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-sm opacity-90">{message}</p>
        {showLogin && (
          <Link href="/login" className="inline-block mt-6 rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 px-6 transition">
            Ir para o login
          </Link>
        )}
      </div>
    </main>
  );
}
