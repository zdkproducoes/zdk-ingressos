import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'

export type VitrineEvent = {
  id: string
  title: string
  slug: string
  banner_url: string | null
  event_date: string
  event_time: string | null
  venue_name: string
  venue_city: string
  venue_state: string
  organization_name: string | null
  /** menor preço de lote comprável; null = vendas ainda não abertas */
  price_from: number | null
}

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

function fmtPrice(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(2).replace('.', ',')
}

export function EventCard({ event }: { event: VitrineEvent }) {
  const date = new Date(event.event_date + 'T00:00:00')
  const timeLabel = (event.event_time || '').slice(0, 5)

  return (
    <Link
      href={`/evento/${event.slug}`}
      className="group block bg-surface-700 border border-muted-700 rounded-2xl overflow-hidden
                 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-accent-400/60"
    >
      {/* Banner (2:1) ou fallback tipográfico */}
      <div className="relative aspect-[2/1] bg-gradient-to-br from-surface-600 to-muted-700 overflow-hidden">
        {event.banner_url ? (
          <Image
            src={event.banner_url}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <span className="font-display-bold text-2xl text-cream-200 text-center leading-tight uppercase">
              {event.title}
            </span>
          </div>
        )}
        {/* Badge de data (bloco dia/mês) */}
        <div className="absolute left-4 -bottom-5 bg-accent-400 text-surface-900 rounded-xl px-3 py-1.5 text-center leading-none shadow-lg">
          <span className="font-display-bold block text-[22px]">{date.getDate()}</span>
          <span className="font-display block text-[10px] tracking-[0.12em] mt-0.5">
            {MONTHS[date.getMonth()]}
          </span>
        </div>
      </div>

      <div className="px-5 pt-8 pb-4">
        <h2 className="font-display-bold text-lg text-cream-200 leading-tight uppercase mb-1.5 group-hover:text-accent-300 transition">
          {event.title}
        </h2>
        <p className="flex items-center gap-1.5 text-[13px] text-cream-400 mb-3">
          <MapPin className="w-3.5 h-3.5 stroke-accent-400 shrink-0" />
          {event.venue_name} — {event.venue_city}/{event.venue_state}
          {timeLabel && ` · ${timeLabel}`}
        </p>
        <div className="flex items-center justify-between border-t border-muted-700 pt-3">
          {event.price_from != null ? (
            <p className="text-[11px] uppercase tracking-wider text-cream-500 leading-tight">
              a partir de
              <span className="block font-display-bold text-base text-accent-300 normal-case tracking-normal">
                R$ {fmtPrice(event.price_from)}
              </span>
            </p>
          ) : (
            <p className="text-[12px] text-cream-500">Vendas em breve</p>
          )}
          <span className="text-[13px] font-bold text-accent-300">Comprar →</span>
        </div>
        {event.organization_name && (
          <p className="text-[11px] text-cream-500 mt-2">por {event.organization_name}</p>
        )}
      </div>
    </Link>
  )
}
