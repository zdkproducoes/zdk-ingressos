import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { Hero } from '@/components/evento/Hero'
import { CopyAbertura, InfoEvento, LineupSection, MapaSection } from '@/components/evento/Secoes'
import { LoteAtivoWrapper } from '@/components/evento/LoteAtivoWrapper'
import { AffiliateTracker } from '@/components/evento/AffiliateTracker'
import { calcularUrgencia } from '@/lib/lote-helpers'
import { resolveLoteAtual } from '@/lib/lotes'

type Props = { params: { slug: string } }

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Abertura de vendas da 16ª edição (exibida na tarja e no card enquanto não há lote ativo)
const AVISO_ABERTURA = '08/07 às 18h'

export const metadata: Metadata = {
  title: "Sacode do Lacerda — 16ª Edição com Milthinho | 02/08 • Villa Jardim • SBC",
  description:
    "Domingo, 02 de Agosto de 2026, a partir das 12h no Villa Jardim Bar — São Bernardo do Campo, ABC paulista. " +
    "A Super Edição do Sacode do Lacerda traz Milthinho, um dos maiores nomes do pagode nacional, " +
    "ao lado de Caio Lacerda, Pagode Na Sena, Nayara Oliveira (sertanejo) e DJ Sant. " +
    "Vendas abrem 08/07 às 18h — garanta seu ingresso.",
  keywords: [
    "Sacode do Lacerda", "Sacode do Lacerda 16ª edição", "Sacode do Lacerda Super Edição",
    "Sacode 2026", "Sacode do Lacerda ingresso", "Sacode do Lacerda São Bernardo",
    "Milthinho", "Milthinho show", "Milthinho show 2026", "Milthinho ingresso",
    "Milthinho São Bernardo", "Milthinho ABC", "Milthinho pagode", "Milthinho agenda 2026",
    "Caio Lacerda", "Caio Lacerda show", "Caio Lacerda ingresso", "Caio Lacerda 2026",
    "Pagode Na Sena", "Pagode Na Sena show",
    "Nayara Oliveira", "Nayara Oliveira sertanejo", "Nayara Oliveira show",
    "DJ Sant",
    "pagode São Bernardo do Campo", "pagode SBC", "pagode ABC", "pagode ABC paulista",
    "pagode Grande ABC", "pagode Santo André", "pagode São Caetano", "pagode Diadema",
    "samba São Bernardo do Campo", "samba SBC", "samba ABC", "samba ABC paulista",
    "sertanejo São Bernardo do Campo", "sertanejo SBC", "sertanejo ABC",
    "festa São Bernardo do Campo", "festa SBC", "festa ABC", "festa ABC paulista",
    "festa Santo André", "festa São Caetano", "festa Diadema",
    "evento São Bernardo do Campo", "evento ABC paulista", "show pagode SBC", "show pagode ABC",
    "Villa Jardim Bar", "Villa Jardim São Bernardo", "Villa Jardim SBC",
    "ingressos pagode", "ingressos samba", "ingressos sertanejo",
    "roda de samba SBC", "roda de samba ABC",
    "festa domingo SBC", "festa domingo ABC", "evento fim de semana ABC",
    "festa agosto 2026", "festa agosto SBC", "o que fazer em agosto SBC",
  ],
  authors: [{ name: "ZDK Produções" }],
  creator: "ZDK Produções",
  publisher: "Caio Lacerda",
  metadataBase: new URL("https://www.zdkingressos.com.br"),
  alternates: {
    canonical: "/evento/sacode-16-edicao",
  },
  openGraph: {
    title: "Sacode do Lacerda — 16ª Edição | Super Edição com Milthinho",
    description:
      "02 de Agosto • Villa Jardim Bar (São Bernardo do Campo / ABC). " +
      "Milthinho + Caio Lacerda + Pagode Na Sena + Nayara Oliveira + DJ Sant. " +
      "A Super Edição do Sacode. Vendas abrem 08/07 às 18h.",
    url: "https://www.zdkingressos.com.br/evento/sacode-16-edicao",
    siteName: "Sacode do Lacerda",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image-16.jpg",
        width: 1200,
        height: 600,
        alt: "Sacode do Lacerda — Super Edição (16ª) — Milthinho, Caio Lacerda, Pagode Na Sena, Nayara Oliveira e DJ Sant — 02 de Agosto — Villa Jardim Bar — São Bernardo do Campo",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sacode do Lacerda — 16ª Edição | Super Edição com Milthinho",
    description:
      "02/08 • Villa Jardim Bar (SBC/ABC) • Milthinho, Caio Lacerda, Pagode Na Sena, Nayara Oliveira e DJ Sant. Vendas abrem 08/07 às 18h.",
    images: ["/og-image-16.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "events",
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MusicEvent",
  name: "Sacode do Lacerda — 16ª Edição (Super Edição)",
  description:
    "Super Edição do Sacode do Lacerda com Milthinho, Caio Lacerda, Pagode Na Sena, " +
    "Nayara Oliveira e DJ Sant, no Villa Jardim Bar (São Bernardo do Campo/SP).",
  startDate: "2026-08-02T12:00:00-03:00",
  endDate: "2026-08-02T23:59:00-03:00",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: {
    "@type": "Place",
    name: "Villa Jardim Bar",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Av. Marginal Direita, 235 — Taboão",
      addressLocality: "São Bernardo do Campo",
      addressRegion: "SP",
      postalCode: "09760-510",
      addressCountry: "BR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -23.65009070362278,
      longitude: -46.5833898,
    },
  },
  image: ["https://www.zdkingressos.com.br/og-image-16.jpg"],
  performer: [
    { "@type": "MusicGroup", name: "Milthinho" },
    { "@type": "MusicGroup", name: "Caio Lacerda" },
    { "@type": "MusicGroup", name: "Pagode Na Sena" },
    { "@type": "MusicGroup", name: "Nayara Oliveira" },
    { "@type": "MusicGroup", name: "DJ Sant" },
  ],
  organizer: {
    "@type": "Organization",
    name: "Caio Lacerda",
    url: "https://www.zdkingressos.com.br",
  },
  offers: {
    "@type": "Offer",
    url: "https://www.zdkingressos.com.br/evento/sacode-16-edicao",
    priceCurrency: "BRL",
    availability: "https://schema.org/InStock",
    validFrom: "2026-07-08T18:00:00-03:00",
  },
}

export default async function EventPage({ params }: Props) {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()

  if (eventError || !event) notFound()

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <AffiliateTracker eventId={event.id} />
        <Hero
          precoMinimo={loteAtivo ? Number(loteAtivo.price) : null}
          avisoAbertura={AVISO_ABERTURA}
        />
        <CopyAbertura />
        <InfoEvento />
        <LineupSection />
        <MapaSection />
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
                Abertura das Vendas dia {AVISO_ABERTURA}
              </h3>
              <p className="text-cream-300 mb-6 text-sm">
                Os ingressos da Super Edição ainda não estão à venda.
                Volta aqui dia 08/07 a partir das 18h — os primeiros lotes são os mais baratos.
              </p>
              <button
                disabled
                className="w-full bg-surface-800/70 text-accent-300/70 font-black text-lg py-4 rounded-xl cursor-not-allowed border border-accent-400/40"
              >
                ABERTURA DAS VENDAS DIA {AVISO_ABERTURA}
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
                Acompanhe nossas redes sociais para os próximos eventos.
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
