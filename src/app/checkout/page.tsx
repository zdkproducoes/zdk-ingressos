// app/checkout/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';
import { resolveLoteAtual } from '@/lib/lotes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout - SACODE' };

export default async function Page({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: eventSlug } = await searchParams;
  if (!eventSlug) {
    return (
      <main className="min-h-screen bg-surface-800 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-cream-300 mb-4">Selecione um evento na pagina inicial</p>
          <Link href="/" className="rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 px-6 inline-block">Ver eventos</Link>
        </div>
      </main>
    );
  }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, event_date, event_time, venue_name, status, service_fee_percent')
    .eq('slug', eventSlug).single();
  if (!event || event.status !== 'active') notFound();

  // Lotes do checkout: le da view batch_availability (paid_count + reserved_count).
  const { data: batches } = await supabaseAdmin
    .from('batch_availability')
    .select('id, name, price, max_per_order, min_per_order, paid_count, quantity, sold_count, reserved_count, status, is_visible, starts_at, ends_at, sort_order')
    .eq('event_id', event.id)
    .eq('is_visible', true)
    .order('id');

  // Virada de lote: regra unica de fila (src/lib/lotes.ts) — SO o lote atual
  // e vendavel; os demais aguardam a vez. Mesma regra da pagina do evento e
  // da API de compra, entao a virada acontece nos tres ao mesmo tempo.
  const { atual: loteAtual, proximo: proximoLote } = resolveLoteAtual(batches ?? []);
  const availableBatches = loteAtual ? [loteAtual] : [];
  const vendasEmBreve = !loteAtual && Boolean(proximoLote);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;
  const emailConfirmed = !!user?.email_confirmed_at;

  const eventDate = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  return (
    <main className="min-h-screen bg-surface-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href={`/`} className="text-sm text-cream-400 hover:text-cream-200 mb-6 inline-block">Voltar</Link>
        <h1 className="text-2xl md:text-3xl font-bold text-cream-200 mb-6">Checkout</h1>
        {isLoggedIn && !emailConfirmed && (
          <div className="rounded-xl bg-amber-950 border border-amber-800 p-4 mb-6 text-amber-100 text-sm">
            Voce ainda nao confirmou seu e-mail. Verifique sua caixa de entrada antes de finalizar a compra.
          </div>
        )}
        {availableBatches.length === 0 ? (
          <div className={`rounded-2xl border-2 p-8 text-center shadow-xl max-w-2xl mx-auto ${
            vendasEmBreve
              ? 'border-accent-400 bg-gradient-to-br from-muted-700 to-surface-700'
              : 'border-red-600 bg-gradient-to-br from-red-900/40 to-red-800/40'
          }`}>
            <p className={`text-sm font-bold uppercase tracking-wider mb-3 ${
              vendasEmBreve ? 'text-accent-300' : 'text-red-300'
            }`}>
              {vendasEmBreve ? 'EM BREVE' : 'ESGOTADO'}
            </p>
            <h3 className="text-cream-200 text-2xl font-black mb-2">
              {vendasEmBreve ? 'As vendas ainda nao abriram' : 'Ingressos indisponiveis'}
            </h3>
            <p className="text-cream-400 mb-6 text-sm">
              {vendasEmBreve
                ? 'O proximo lote ainda nao esta a venda. Volte em instantes!'
                : 'No momento nao ha lotes disponiveis para compra neste evento. Volte mais tarde ou acompanhe nossas redes sociais.'}
            </p>
            <Link
              href={`/evento/${event.slug}`}
              className="inline-block bg-accent-400 hover:bg-accent-500 text-surface-800 font-bold px-6 py-3 rounded-xl transition"
            >
              Voltar para o evento
            </Link>
          </div>
        ) : (
          <CheckoutClient
            eventId={event.id}
            eventTitle={event.title}
            eventDate={eventDate}
            eventTime={(event.event_time || '').slice(0,5)}
            venueName={event.venue_name}
            serviceFeePercent={Number(event.service_fee_percent)}
            batches={availableBatches.map(b => ({ ...b, price: Number(b.price) }))}
            isLoggedIn={isLoggedIn}
            emailConfirmed={emailConfirmed}
          />
        )}
      </div>
    </main>
  );
}
