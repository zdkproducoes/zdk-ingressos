// GET /api/conta/exportar — exporta os dados do próprio usuário (LGPD,
// art. 18: portabilidade). Devolve um JSON para download.
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { platform } from '@/lib/config';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const [{ data: profile }, { data: orders }, { data: tickets }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('full_name, first_name, last_name, cpf, phone, email, birth_date, gender, city, neighborhood, state, marketing_consent, created_at')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('orders')
      .select('order_number, subtotal, service_fee, discount, total, payment_method, payment_status, paid_at, created_at, events(title, event_date)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('order_items')
      .select('attendee_name, status, checked_in_at, created_at, orders!inner(customer_id, order_number), ticket_batches(name)')
      .eq('orders.customer_id', user.id),
  ]);

  const payload = {
    plataforma: platform.name,
    exportado_em: new Date().toISOString(),
    conta: { id: user.id, email: user.email },
    perfil: profile ?? null,
    pedidos: orders ?? [],
    ingressos: tickets ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
