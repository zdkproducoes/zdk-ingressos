// Home = vitrine: todos os eventos ativos de todos os produtores, com
// destaque para o próximo, busca e filtro por cidade (modelo dos grandes
// players adaptado ao Grande ABC). Usa o client anon — as policies
// events_select_active/orgs_select_public/ticket_batches_select_visible
// controlam o que é público.
import { supabase } from '@/lib/supabase'
import { platform } from '@/lib/config'
import { VitrineClient } from '@/components/vitrine/VitrineClient'
import type { VitrineEvent } from '@/components/vitrine/EventCard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('events')
    .select('id, title, slug, banner_url, event_date, event_time, venue_name, venue_city, venue_state, organizations(name)')
    .eq('status', 'active')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  const rows = (data ?? []) as any[]

  // Preço "a partir de": menor lote visível/comprável de cada evento
  const priceByEvent = new Map<string, number>()
  if (rows.length > 0) {
    const { data: batches } = await supabase
      .from('ticket_batches')
      .select('event_id, price, status')
      .in('event_id', rows.map((e) => e.id))
      .in('status', ['active', 'scheduled'])
    for (const b of (batches ?? []) as { event_id: string; price: number }[]) {
      const current = priceByEvent.get(b.event_id)
      const price = Number(b.price)
      if (current === undefined || price < current) priceByEvent.set(b.event_id, price)
    }
  }

  const events: VitrineEvent[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    banner_url: e.banner_url,
    event_date: e.event_date,
    event_time: e.event_time,
    venue_name: e.venue_name,
    venue_city: e.venue_city,
    venue_state: e.venue_state,
    organization_name:
      (Array.isArray(e.organizations) ? e.organizations[0]?.name : e.organizations?.name) ?? null,
    price_from: priceByEvent.get(e.id) ?? null,
  }))

  return (
    <main className="min-h-screen bg-surface-800">
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <div className="text-center mb-8">
          <p className="font-display text-accent-400 tracking-[0.24em] text-xs uppercase mb-2">
            {platform.name} · Grande ABC
          </p>
          <h1 className="font-display-bold text-[clamp(1.9rem,5vw,3rem)] text-cream-200 leading-tight uppercase">
            O rolê começa aqui
          </h1>
        </div>

        <VitrineClient events={events} />
      </section>
    </main>
  )
}
