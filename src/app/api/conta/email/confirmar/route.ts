// GET /api/conta/email/confirmar?token=... — conclui a troca de e-mail
// (link clicado no e-mail NOVO). Atualiza auth.users + profiles e volta
// pra área da conta com o resultado.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { consumeEmailToken } from '@/lib/conta/tokens';
import { platform } from '@/lib/config';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const back = (status: string) =>
    NextResponse.redirect(`${platform.baseUrl}/minha-conta?email_troca=${status}`);

  if (!token) return back('invalido');

  const result = await consumeEmailToken(token);
  if (!result.ok) {
    return back(result.reason === 'expired' ? 'expirado' : 'invalido');
  }

  // Corrida: o e-mail pode ter sido tomado por outra conta entre o pedido e o clique
  const { data: taken } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('email', result.newValue)
    .neq('id', result.userId)
    .maybeSingle();
  if (taken) return back('em_uso');

  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(result.userId, {
    email: result.newValue,
    email_confirm: true,
  });
  if (authErr) {
    console.error('[conta/email/confirmar] auth', authErr);
    return back('erro');
  }

  const { error: profErr } = await supabaseAdmin
    .from('profiles')
    .update({ email: result.newValue, email_confirmed_at: new Date().toISOString() })
    .eq('id', result.userId);
  if (profErr) console.error('[conta/email/confirmar] profile', profErr);

  return back('ok');
}
