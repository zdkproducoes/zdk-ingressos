import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin } from 'lucide-react'

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
}

export function EventCard({ event }: { event: VitrineEvent }) {
  const dateLabel = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
  const timeLabel = (event.event_time || '').slice(0, 5)

  return (
    <Link
      href={`/evento/${event.slug}`}
      className="group block bg-surface-700 border border-muted-700 rounded-2xl overflow-hidden
                 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-accent-400/60"
    >
      {/* Banner (proporção 2:1) ou fallback com o título */}
      <div className="relative aspect-[2/1] bg-gradient-to-br from-surface-600 to-muted-600 overflow-hidden">
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
            <span className="font-display-bold text-2xl text-cream-200 text-center leading-tight">
              {event.title}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h2 className="font-display text-2xl text-cream-200 tracking-[0.02em] leading-tight mb-2 group-hover:text-accent-300 transition">
          {event.title}
        </h2>
        <p className="flex items-center gap-1.5 text-sm text-cream-300 mb-1 capitalize">
          <Calendar className="w-4 h-4 stroke-accent-400 shrink-0" />
          {dateLabel}
          {timeLabel && ` • ${timeLabel}`}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-cream-400">
          <MapPin className="w-4 h-4 stroke-accent-400 shrink-0" />
          {event.venue_name} — {event.venue_city}/{event.venue_state}
        </p>
        {event.organization_name && (
          <p className="text-xs text-cream-400 mt-3 pt-3 border-t border-muted-700">
            por <span className="text-cream-300">{event.organization_name}</span>
          </p>
        )}
      </div>
    </Link>
  )
}
