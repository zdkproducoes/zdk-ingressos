// PATCH /api/conta/perfil — atualiza os dados pessoais do próprio usuário.
// CPF não é editável (documento fiscal dos pedidos); e-mail/celular/senha
// têm rotas próprias com verificação.
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const GENDERS = ['masculino', 'feminino', 'nao_binario', 'prefiro_nao_dizer', 'outro'];

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const firstName = str(body.first_name);
  const lastName = str(body.last_name);
  if (!firstName) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });

  const birthDate = strOrNull(body.birth_date);
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
  }
  const gender = strOrNull(body.gender);
  if (gender && !GENDERS.includes(gender)) {
    return NextResponse.json({ error: 'Gênero inválido.' }, { status: 400 });
  }
  const state = strOrNull(body.state)?.toUpperCase() ?? null;
  if (state && !/^[A-Z]{2}$/.test(state)) {
    return NextResponse.json({ error: 'UF inválida (2 letras).' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName || null,
      full_name: `${firstName} ${lastName}`.trim(),
      birth_date: birthDate,
      gender,
      city: strOrNull(body.city),
      neighborhood: strOrNull(body.neighborhood),
      state,
      marketing_consent: body.marketing_consent === true,
    })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
