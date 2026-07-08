// app/api/admin/eventos/create/route.ts
// Cria um novo evento. Nasce como 'draft' (invisível ao público) — os dados
// de pedidos/lotes/compradores dele nascem separados por event_id.
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const SLUG_REGEX = /^[a-z0-9-]+$/;

export async function POST(request: Request) {
  // Auth — só admin/producer
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const title = str(body.title);
  const slug = str(body.slug).toLowerCase();
  const eventDate = str(body.event_date); // YYYY-MM-DD
  const eventTime = strOrNull(body.event_time); // HH:MM
  const venueName = str(body.venue_name);
  const venueAddress = str(body.venue_address);
  const venueNeighborhood = strOrNull(body.venue_neighborhood);
  const venueCity = str(body.venue_city);
  const venueState = str(body.venue_state).toUpperCase();
  const venueZip = strOrNull(body.venue_zip);
  const description = strOrNull(body.description);
  const serviceFee = body.service_fee_percent === undefined || body.service_fee_percent === ''
    ? 10
    : Number(body.service_fee_percent);
  const maxPerCpf = body.max_tickets_per_cpf === undefined || body.max_tickets_per_cpf === ''
    ? 5
    : Number(body.max_tickets_per_cpf);

  // Validações
  if (!title) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 });
  if (!slug) return NextResponse.json({ error: 'Slug é obrigatório.' }, { status: 400 });
  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { error: 'Slug deve conter apenas letras minúsculas, números e hífen.' },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return NextResponse.json({ error: 'Data do evento inválida (use AAAA-MM-DD).' }, { status: 400 });
  }
  if (eventTime && !/^\d{2}:\d{2}$/.test(eventTime)) {
    return NextResponse.json({ error: 'Horário inválido (use HH:MM).' }, { status: 400 });
  }
  if (!venueName) return NextResponse.json({ error: 'Nome do local é obrigatório.' }, { status: 400 });
  if (!venueAddress) return NextResponse.json({ error: 'Endereço é obrigatório.' }, { status: 400 });
  if (!venueCity) return NextResponse.json({ error: 'Cidade é obrigatória.' }, { status: 400 });
  if (!/^[A-Z]{2}$/.test(venueState)) {
    return NextResponse.json({ error: 'UF inválida (2 letras).' }, { status: 400 });
  }
  if (Number.isNaN(serviceFee) || serviceFee < 0 || serviceFee > 100) {
    return NextResponse.json({ error: 'Taxa de serviço deve estar entre 0 e 100.' }, { status: 400 });
  }
  if (Number.isNaN(maxPerCpf) || maxPerCpf < 1 || maxPerCpf > 100) {
    return NextResponse.json({ error: 'Máximo por CPF deve estar entre 1 e 100.' }, { status: 400 });
  }

  // Slug duplicado
  const { data: existing } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `Já existe um evento com o slug "${slug}".` },
      { status: 409 },
    );
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('events')
    .insert({
      title,
      slug,
      event_date: eventDate,
      event_time: eventTime,
      venue_name: venueName,
      venue_address: venueAddress,
      venue_neighborhood: venueNeighborhood,
      venue_city: venueCity,
      venue_state: venueState,
      venue_zip: venueZip,
      description,
      service_fee_percent: serviceFee,
      max_tickets_per_cpf: maxPerCpf,
      status: 'draft',
    })
    .select('id')
    .single();

  if (insertError || !created) {
    return NextResponse.json(
      { error: insertError?.message || 'Erro ao criar evento.' },
      { status: 500 },
    );
  }

  revalidatePath('/admin/eventos');
  return NextResponse.json({ id: created.id }, { status: 201 });
}
