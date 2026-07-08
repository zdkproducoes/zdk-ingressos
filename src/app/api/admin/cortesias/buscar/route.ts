// app/api/admin/cortesias/buscar/route.ts
// Busca convidado por CPF ou e-mail para emissão de cortesia
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Auth: só admin/producer pode buscar
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ found: false });

  // Detecta se é CPF (só números, 11 dígitos quando limpo) ou e-mail
  const cpfDigits = q.replace(/\D/g, '');
  const isCpf = cpfDigits.length === 11;
  const isEmail = q.includes('@');

  let query = supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email, phone, cpf')
    .limit(1);

  if (isCpf) {
    query = query.eq('cpf', cpfDigits);
  } else if (isEmail) {
    query = query.ilike('email', q.toLowerCase());
  } else {
    return NextResponse.json({
      found: false,
      error: 'Digite um CPF (11 dígitos) ou e-mail válido'
    });
  }

  const { data, error } = await query.single();
  if (error || !data) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    profile: {
      id: data.id,
      name: `${data.first_name} ${data.last_name}`.trim(),
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
    }
  });
}
