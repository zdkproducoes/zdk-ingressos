// POST /api/conta/senha — troca a senha exigindo a senha atual.
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyCurrentPassword } from '@/lib/conta/verify-password';
import { checkRateLimit } from '@/lib/turnstile/ratelimit';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const allowed = await checkRateLimit(`senha:${user.id}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const current = typeof body.current_password === 'string' ? body.current_password : '';
  const next = typeof body.new_password === 'string' ? body.new_password : '';

  if (next.length < 8) {
    return NextResponse.json({ error: 'A nova senha precisa de pelo menos 8 caracteres.' }, { status: 400 });
  }
  if (!(await verifyCurrentPassword(user.email, current))) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: next });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
