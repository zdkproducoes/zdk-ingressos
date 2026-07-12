// Página pública do evento — todo o conteúdo (título, textos, lineup, local,
// SEO, JSON-LD) vem do banco: events.* + events.content + organização dona.
import { supabase, type Event, type EventContent } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { Hero } from '@/components/evento/Hero'
import { CopyAbertura, InfoEvento, LineupSection, MapaSection } from '@/components/evento/Secoes'
import { LoteAtivoWrapper } from '@/components/evento/LoteAtivoWrapper'
import { AffiliateTracker } from '@/components/evento/AffiliateTracker'
import { calcularUrgencia } from '@/lib/lote-helpers'
import { resolveLoteAtual } from '@/lib/lotes'
import { platform } from '@/lib/config'
import { buildEventJsonLd } from '@/lib/seo/event-jsonld'

type Props = { params: { slug: string } }

export const dynamic = 'force-dynamic'
export const revalidate = 0

type EventWithOrg = Event & {
  organizations: { name: string; slug: string } | { name: string; slug: string }[] | null
}

async function fetchEvent(slug: string): Promise<{ event: Event; org: { name: string; slug: string } | null } | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*, organizations(name, slug)')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  const raw = data as EventWithOrg
  const org = Array.isArray(raw.organizations) ? raw.organizations[0] ?? null : raw.organizations
  return { event: raw as Event, org }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await fetchEvent(params.slug)
  if (!result) return { title: `Evento não encontrado | ${platform.name}` }

  const { event, org } = result
  const content: EventContent = event.content ?? {}

  const dateLabel = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const title = `${event.title}${content.subtitle ? ` — ${content.subtitle}` : ''} | Ingressos`
  const description =
    event.description?.slice(0, 300) ||
    `${event.title} — ${dateLabel} no ${event.venue_name}, ${event.venue_city}/${event.venue_state}. Garanta seu ingresso na ${platform.name}.`
  const ogImage = event.og_image_url || event.banner_url
  const canonical = `${platform.baseUrl}/evento/${event.slug}`

  return {
    title,
    description,
    ...(content.seo_keywords?.length ? { keywords: content.seo_keywords } : {}),
    ...(org ? { authors: [{ name: org.name }], creator: org.name } : {}),
    publisher: platform.name,
    metadataBase: new URL(platform.baseUrl),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: platform.name,
      locale: 'pt_BR',
      type: 'website',
      ...(ogImage
        ? { images: [{ url: ogImage, width: 1200, height: 600, alt: event.title }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    category: 'events',
  }
}

export default async function EventPage({ params }: Props) {
  const result = await fetchEvent(params.slug)
  if (!result) notFound()

  const { event, org } = result
  const content: EventContent = event.content ?? {}
  const avisoAbertura = content.opening_notice ?? null

  const { data: batches } = await supabase
    .from('batch_availability')
    .select('*')
    .eq('event_id', event.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  const allBatches = batches ?? []
  // Virada de lote: regra única de fila (src/lib/lotes.ts) — o lote atual é o
  // primeiro da fila (sort_order) com estoque real (vendidos + reservados),
  // dentro da janela de datas. Mesma regra do checkout e da API de compra.
  const { atual: loteAtivo, proximo: proximoLote } = resolveLoteAtual(allBatches)
  const isUrgent = loteAtivo ? calcularUrgencia(loteAtivo, proximoLote) : false

  // Sem lote ativo: distingue "vendas ainda não abriram" (nenhum lote criado ou
  // lote agendado) de "esgotado de verdade" (havia lotes e todos venderam).
  const vendasEmBreve = !loteAtivo && (allBatches.length === 0 || Boolean(proximoLote))

  const jsonLd = buildEventJsonLd(event, org)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <AffiliateTracker eventId={event.id} />
        <Hero
          title={event.title}
          subtitle={content.subtitle ?? null}
          bannerUrl={event.banner_url}
          precoMinimo={loteAtivo ? Number(loteAtivo.price) : null}
          avisoAbertura={avisoAbertura}
        />
        <CopyAbertura event={event} />
        <InfoEvento event={event} />
        <LineupSection lineup={content.lineup ?? []} />
        <MapaSection event={event} />
        {org && (
          <p className="text-center text-sm text-cream-400 pb-4">
            Organizado por <span className="text-cream-300">{org.name}</span>
          </p>
        )}
        {loteAtivo ? (
          <LoteAtivoWrapper
            lote={loteAtivo}
            isUrgent={isUrgent}
            eventId={event.id}
            eventSlug={event.slug}
          />
        ) : vendasEmBreve ? (
          <div id="ingressos" className="max-w-[700px] mx-auto px-5 py-12">
            <div className="rounded-2xl border-2 border-accent-400 bg-gradient-to-br from-muted-700 to-surface-700 p-8 text-center shadow-xl">
              <p className="text-accent-300 text-sm font-bold uppercase tracking-wider mb-3">
                🗓️ EM BREVE
              </p>
              <h3 className="text-cream-200 text-3xl font-black mb-2">
                {avisoAbertura ? `Abertura das Vendas dia ${avisoAbertura}` : 'Vendas em breve'}
              </h3>
              <p className="text-cream-300 mb-6 text-sm">
                Os ingressos deste evento ainda não estão à venda.
                {avisoAbertura
                  ? ' Volta aqui na data de abertura — os primeiros lotes são os mais baratos.'
                  : ' Fique de olho — os primeiros lotes são os mais baratos.'}
              </p>
              <button
                disabled
                className="w-full bg-surface-800/70 text-accent-300/70 font-black text-lg py-4 rounded-xl cursor-not-allowed border border-accent-400/40"
              >
                {avisoAbertura ? `ABERTURA DAS VENDAS DIA ${avisoAbertura}` : 'VENDAS EM BREVE'}
              </button>
            </div>
          </div>
        ) : (
          <div id="ingressos" className="max-w-[700px] mx-auto px-5 py-12">
            <div className="rounded-2xl border-2 border-red-600 bg-gradient-to-br from-red-900/40 to-red-800/40 p-8 text-center shadow-xl">
              <p className="text-red-300 text-sm font-bold uppercase tracking-wider mb-3">
                ● ESGOTADO
              </p>
              <h3 className="text-cream-200 text-3xl font-black mb-2">
                Ingressos esgotados
              </h3>
              <p className="text-cream-400 mb-6 text-sm">
                Todos os lotes deste evento foram vendidos.
                Acompanhe os próximos eventos na página inicial.
              </p>
              <button
                disabled
                className="w-full bg-red-900/50 text-red-300/60 font-black text-lg py-4 rounded-xl cursor-not-allowed border border-red-700/50"
              >
                INGRESSOS ESGOTADOS
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
