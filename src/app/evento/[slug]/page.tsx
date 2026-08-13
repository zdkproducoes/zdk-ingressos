// Página pública do evento — todo o conteúdo (título, textos, lineup, local,
// SEO, JSON-LD) vem do banco: events.* + events.content + organização dona.
import { supabase, type Event, type EventContent } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase/admin'
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
import { BrandTheme } from '@/components/theme/BrandTheme'
import { StickyBuyBar } from '@/components/evento/StickyBuyBar'
import { orgPublicName, type OrgBrand } from '@/lib/brand'
import { dataEvento } from '@/lib/datas';
import { getPanelContext } from '@/lib/auth/panel'
import { assertEventInScope } from '@/lib/auth/scope'

type Props = { params: { slug: string } }

export const dynamic = 'force-dynamic'
export const revalidate = 0

type OrgRow = { name: string; slug: string; brand: OrgBrand | null }
type EventWithOrg = Event & {
  organizations: OrgRow | OrgRow[] | null
}

type FetchedEvent = { event: Event; org: OrgRow | null; preview: boolean }

const STATUS_PREVIEW_LABEL: Record<string, string> = {
  draft: 'rascunho',
  pending: 'aguardando aprovação',
  finished: 'arquivado',
}

const EVENT_SELECT = '*, organizations(name, slug, brand)'

function splitOrg(raw: EventWithOrg): { event: Event; org: OrgRow | null } {
  const org = Array.isArray(raw.organizations) ? raw.organizations[0] ?? null : raw.organizations
  return { event: raw as Event, org }
}

// Caminho público: cliente anônimo, com a RLS do banco valendo
// (events_select_active só devolve status 'active'/'finished').
async function fetchEventPublico(slug: string): Promise<FetchedEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  // PGRST116 = nenhuma linha (slug inexistente) — 404 esperado, não é falha
  if (error && error.code !== 'PGRST116') {
    console.error(`[evento] erro ao buscar evento "${slug}":`, error)
  }
  if (error || !data) return null
  return { ...splitOrg(data as EventWithOrg), preview: false }
}

// Caminho de PRÉ-VISUALIZAÇÃO: evento ainda não publicado (draft/pending) só
// aparece para quem já o enxergaria no painel — superadmin ou membro da
// organização dona. Para o resto do mundo continua 404, como antes.
// Comprar é impossível de qualquer jeito: /checkout e /api/checkout/create
// exigem status 'active'.
async function fetchEventPreview(slug: string): Promise<FetchedEvent | null> {
  const ctx = await getPanelContext()
  if (!ctx) return null

  const { data } = await supabaseAdmin
    .from('events')
    .select(EVENT_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null

  const raw = data as EventWithOrg
  if (!(await assertEventInScope(ctx, raw.id))) return null
  return { ...splitOrg(raw), preview: true }
}

async function fetchEvent(slug: string): Promise<FetchedEvent | null> {
  return (await fetchEventPublico(slug)) ?? (await fetchEventPreview(slug))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await fetchEvent(params.slug)
  if (!result) return { title: `Evento não encontrado | ${platform.name}` }

  const { event, org, preview } = result
  const content: EventContent = event.content ?? {}

  // Rascunho nunca pode ser indexado nem gerar preview de link em rede social
  if (preview) {
    return {
      title: `[Rascunho] ${event.title} | ${platform.name}`,
      robots: { index: false, follow: false },
    }
  }

  const dateLabel = dataEvento(event.event_date, {
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

  const { event, org, preview } = result
  const content: EventContent = event.content ?? {}
  const avisoAbertura = content.opening_notice ?? null

  // Em pré-visualização os lotes também estão atrás da RLS (o evento não é
  // público ainda), então lê com o client de serviço. Quem chegou aqui já
  // passou pela checagem de escopo em fetchEventPreview.
  const db = preview ? supabaseAdmin : supabase
  const { data: batches } = await db
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
      <BrandTheme brand={org?.brand} />
      {preview && (
        <div className="sticky top-0 z-50 bg-accent-400 text-surface-900 text-center text-sm font-bold px-4 py-2">
          PRÉ-VISUALIZAÇÃO — evento em {STATUS_PREVIEW_LABEL[event.status] ?? event.status}.
          Ninguém além da sua equipe vê esta página, e a compra fica bloqueada até publicar.
        </div>
      )}
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
            Organizado por <span className="text-cream-300">{orgPublicName(org)}</span>
          </p>
        )}
        {loteAtivo && <StickyBuyBar price={Number(loteAtivo.price)} />}
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
