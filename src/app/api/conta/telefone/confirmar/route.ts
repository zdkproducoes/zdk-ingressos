// POST /api/conta/telefone/confirmar — valida o código de 6 dígitos e
// efetiva a troca do celular no perfil.
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { consumePhoneCode } from '@/lib/conta/tokens';

const REASON_MSG: Record<string, string> = {
  not_found: 'Nenhuma verificação pendente. Solicite um novo código.',
  expired: 'Código expirado. Solicite um novo.',
  too_many_attempts: 'Muitas tentativas. Solicite um novo código.',
  wrong_code: 'Código incorreto.',
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : '';
  if (code.length !== 6) {
    return NextResponse.json({ error: 'Informe o código de 6 dígitos.' }, { status: 400 });
  }

  const result = await consumePhoneCode(user.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: REASON_MSG[result.reason] }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ phone: result.newValue })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, phone: result.newValue });
}
