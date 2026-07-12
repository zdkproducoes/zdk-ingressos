// Home = vitrine: todos os eventos ativos de todos os produtores
// (modelo Blacktag). Usa o client anon — as policies events_select_active
// e orgs_select_public controlam o que é público.
import { supabase } from '@/lib/supabase'
import { platform } from '@/lib/config'
import { EventCard, type VitrineEvent } from '@/components/vitrine/EventCard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('events')
    .select('id, title, slug, banner_url, event_date, event_time, venue_name, venue_city, venue_state, organizations(name)')
    .eq('status', 'active')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  const events: VitrineEvent[] = ((data ?? []) as any[]).map((e) => ({
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
  }))

  return (
    <main className="min-h-screen bg-surface-800">
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-16">
        <div className="text-center mb-10">
          <p className="font-display text-accent-400 tracking-[0.2em] text-sm mb-2">
            {platform.name.toUpperCase()}
          </p>
          <h1 className="font-display-bold text-[clamp(2rem,5vw,3rem)] text-cream-200 leading-tight">
            Próximos eventos
          </h1>
        </div>

        {events.length === 0 ? (
          <div className="max-w-md mx-auto bg-surface-700 border border-muted-700 rounded-2xl p-10 text-center">
            <h2 className="font-display-bold text-2xl text-cream-200 mb-3">
              Nenhum evento à venda
            </h2>
            <p className="text-sm text-cream-400">
              Não há eventos com vendas abertas no momento. Volte em breve!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
