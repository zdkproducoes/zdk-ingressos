// Seções da página pública do evento — 100% orientadas aos dados do banco
// (events.* + events.content jsonb). Cada seção só renderiza se tiver dados.
import { Calendar, MapPin, Clock } from "lucide-react"
import type { Event, EventLineupItem } from "@/lib/supabase"

function formatEventDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatWeekday(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
}

// ---------------------------------------------------------------------------
// Abertura: kicker (data • cidade) + título + descrição
// ---------------------------------------------------------------------------
export function CopyAbertura({ event }: { event: Event }) {
  const dateLabel = formatEventDate(event.event_date)
  const weekday = formatWeekday(event.event_date)
  const timeLabel = (event.event_time || '').slice(0, 5)
  const subtitle = event.content?.subtitle ?? null
  const aboutHtml = event.content?.about_html ?? null

  return (
    <section className="max-w-[850px] mx-auto px-5 pt-16 pb-10 text-center">
      <div className="font-display text-accent-400 tracking-[0.2em] text-sm mb-3 uppercase">
        {dateLabel} • {event.venue_city}
      </div>
      <h1 className="font-display-bold text-[clamp(2rem,5vw,3rem)] leading-[1.05] text-cream-200 mb-6">
        {event.title}
        {subtitle && (
          <>
            {' '}
            <span className="block text-accent-400 text-[0.6em] mt-2">{subtitle}</span>
          </>
        )}
      </h1>
      {aboutHtml ? (
        <div
          className="text-cream-300 text-[1.0625rem] leading-[1.7] max-w-[650px] mx-auto space-y-5 [&_strong]:text-cream-200"
          dangerouslySetInnerHTML={{ __html: aboutHtml }}
        />
      ) : event.description ? (
        <p className="text-cream-300 text-[1.0625rem] leading-[1.7] max-w-[650px] mx-auto whitespace-pre-line">
          {event.description}
        </p>
      ) : null}
      <p className="text-cream-300 text-[1.0625rem] leading-[1.7] max-w-[650px] mx-auto mt-5 capitalize-first">
        <span className="capitalize">{weekday}</span>,{' '}
        <strong className="text-cream-200">{dateLabel}</strong>
        {timeLabel && (
          <>
            , a partir das <strong className="text-cream-200">{timeLabel}</strong>
          </>
        )}
        , no <strong className="text-cream-200">{event.venue_name}</strong>, em{' '}
        <strong className="text-cream-200">{event.venue_city}</strong>.
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Cartão de informações: quando / onde / acesso
// ---------------------------------------------------------------------------
export function InfoEvento({ event }: { event: Event }) {
  const dateLabel = formatEventDate(event.event_date)
  const weekday = formatWeekday(event.event_date)
  const timeLabel = (event.event_time || '').slice(0, 5)

  return (
    <section className="max-w-[1200px] mx-auto px-5 pt-2 pb-12">
      <div className="bg-surface-700 border border-muted-700 border-l-4 border-l-accent-400
                      rounded-xl px-7 py-6
                      grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2">
        <InfoRow
          icon={<Calendar className="w-[22px] h-[22px] stroke-accent-400" strokeWidth={2} />}
          label="Quando"
          value={dateLabel}
          sub={`${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}${timeLabel ? ` • a partir das ${timeLabel}` : ''}`}
        />
        <InfoRow
          icon={<MapPin className="w-[22px] h-[22px] stroke-accent-400" strokeWidth={2} />}
          label="Onde"
          value={event.venue_name}
          sub={`${event.venue_city} • ${event.venue_state}`}
        />
        <InfoRow
          icon={<Clock className="w-[22px] h-[22px] stroke-accent-400" strokeWidth={2} />}
          label="Acesso"
          value={event.age_rating || 'Livre'}
          sub={event.age_rating_notes || 'Consulte a organização'}
        />
      </div>
    </section>
  )
}

function InfoRow({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string
}) {
  return (
    <div className="flex gap-4 items-start py-3.5">
      <div className="w-[42px] h-[42px] bg-surface-800 border-2 border-muted-500
                      rounded-[10px] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.08em] text-cream-400 mb-0.5">{label}</div>
        <div className="font-display text-[1.375rem] tracking-[0.03em] text-cream-200 leading-[1.2]">{value}</div>
        <div className="text-[0.8125rem] text-cream-300 mt-0.5 leading-[1.4]">{sub}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lineup (content.lineup): headliner em destaque, host, suportes e DJs.
// Não renderiza nada se o evento não tiver lineup cadastrado.
// ---------------------------------------------------------------------------
export function LineupSection({ lineup }: { lineup: EventLineupItem[] }) {
  if (!lineup || lineup.length === 0) return null

  const headliners = lineup.filter((a) => a.tier === 'headliner')
  const hosts = lineup.filter((a) => a.tier === 'host')
  const djs = lineup.filter((a) => a.tier === 'dj')
  const support = lineup.filter(
    (a) => !a.tier || a.tier === 'support',
  )

  return (
    <section id="lineup" className="max-w-[1200px] mx-auto px-5 py-10">
      <div className="font-display text-accent-400 tracking-[0.2em] text-[0.85rem] text-center mb-2">
        QUEM SOBE NO PALCO
      </div>
      <h2 className="font-display-bold text-[clamp(2rem,4.5vw,2.75rem)] text-cream-200 text-center mb-10">
        Lineup <span className="text-accent-400">oficial</span>
      </h2>

      {headliners.map((a) => (
        <div
          key={a.name}
          className="bg-gradient-to-br from-accent-400/15 to-surface-700
                     border-2 border-accent-400 rounded-2xl
                     p-8 mb-4 text-center relative overflow-hidden
                     shadow-[0_0_40px_-10px_rgba(228,160,63,0.35)]"
        >
          <span className="absolute top-2 right-4 text-2xl opacity-40">🌟</span>
          <span className="inline-block bg-accent-400 text-surface-900
                           px-3.5 py-1 rounded-full text-[0.7rem] font-extrabold
                           tracking-[0.12em] uppercase mb-3.5">
            🌟 Atração principal
          </span>
          <div className="font-display-bold text-[clamp(2.5rem,7vw,4rem)]
                          text-accent-300 leading-none tracking-wide mb-1.5 uppercase">
            {a.name}
          </div>
          {(a.tagline || a.genre) && (
            <div className="font-display text-lg text-cream-200 tracking-[0.1em]">
              {a.tagline || a.genre}
            </div>
          )}
        </div>
      ))}

      {hosts.map((a) => (
        <div
          key={a.name}
          className="bg-gradient-to-br from-muted-700 to-surface-700
                     border-2 border-muted-400 rounded-2xl
                     p-8 mb-6 text-center relative overflow-hidden"
        >
          <span className="absolute top-2 right-4 text-2xl opacity-40">👑</span>
          <span className="inline-block bg-muted-400 text-surface-900
                           px-3.5 py-1 rounded-full text-[0.7rem] font-extrabold
                           tracking-[0.12em] uppercase mb-3.5">
            ⭐ Anfitrião
          </span>
          <div className="font-display-bold text-[clamp(2.25rem,6vw,3.5rem)]
                          text-cream-100 leading-none tracking-wide mb-1.5 uppercase">
            {a.name}
          </div>
          {(a.tagline || a.genre) && (
            <div className="font-display text-lg text-accent-300 tracking-[0.1em]">
              {a.tagline || a.genre}
            </div>
          )}
        </div>
      ))}

      {support.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {support.map((a) => (
            <ArtistCard key={a.name} name={a.name} genre={a.genre || ''} />
          ))}
        </div>
      )}

      {djs.length > 0 && (
        <div className="bg-surface-900 border border-dashed border-muted-600 rounded-[10px]
                        px-5 py-3.5 text-center text-cream-300 text-[0.9375rem]">
          🎧 Discotecagem com{' '}
          {djs.map((a, i) => (
            <strong
              key={a.name}
              className="text-accent-400 font-display tracking-wider text-lg ml-1 uppercase"
            >
              {a.name}
              {i < djs.length - 1 ? ',' : ''}
            </strong>
          ))}
        </div>
      )}
    </section>
  )
}

function ArtistCard({ name, genre }: { name: string; genre: string }) {
  return (
    <div className="bg-surface-700 border border-muted-700 border-t-[3px] border-t-accent-400
                    rounded-xl px-5 py-5 text-center transition-all duration-200
                    hover:border-t-accent-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="font-display text-2xl text-cream-200 tracking-[0.03em] mb-1 leading-tight">{name}</div>
      {genre && <div className="text-xs text-cream-400 tracking-wider uppercase">{genre}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mapa/como chegar. Embed só quando o evento tem lat/lng.
// ---------------------------------------------------------------------------
export function MapaSection({ event }: { event: Event }) {
  const hasCoords = event.venue_lat != null && event.venue_lng != null
  const lat = Number(event.venue_lat)
  const lng = Number(event.venue_lng)
  const gmapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue_name}, ${event.venue_address}, ${event.venue_city}`)}`
  const wazeUrl = hasCoords ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null
  const embedUrl = hasCoords ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed` : null

  return (
    <section id="local" className="max-w-[1200px] mx-auto px-5 py-10">
      <div className="font-display text-accent-400 tracking-[0.2em] text-[0.85rem] text-center mb-2">
        COMO CHEGAR
      </div>
      <h2 className="font-display-bold text-[clamp(2rem,4.5vw,2.75rem)] text-cream-200 text-center mb-10">
        No <span className="text-accent-400">{event.venue_name}</span>
      </h2>

      <div className="bg-surface-700 border border-muted-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-muted-700 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display text-2xl text-cream-200 tracking-[0.03em] leading-tight">
              {event.venue_name}
            </div>
            <div className="text-sm text-cream-400 mt-1">
              {event.venue_address}
              {event.venue_neighborhood ? ` — ${event.venue_neighborhood}` : ''}
              <br />
              {event.venue_city} — {event.venue_state}
              {event.venue_zip ? ` • CEP ${event.venue_zip}` : ''}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
               className="bg-surface-600 text-cream-100 px-3.5 py-2
                          border border-muted-500 rounded-lg text-[0.8125rem] font-semibold
                          no-underline inline-flex items-center gap-1.5
                          transition-all duration-200 hover:bg-surface-500 hover:-translate-y-0.5">
              📍 Google Maps
            </a>
            {wazeUrl && (
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
                 className="bg-muted-600 text-cream-100 px-3.5 py-2
                            border border-muted-400 rounded-lg text-[0.8125rem] font-semibold
                            no-underline inline-flex items-center gap-1.5
                            transition-all duration-200 hover:bg-muted-500 hover:-translate-y-0.5">
                🚗 Waze
              </a>
            )}
          </div>
        </div>
        {embedUrl && (
          <div className="w-full">
            <iframe
              src={embedUrl}
              className="w-full rounded-lg shadow-lg border-0"
              style={{ height: '350px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Localização de ${event.venue_name}`}
            />
          </div>
        )}
      </div>
    </section>
  )
}
