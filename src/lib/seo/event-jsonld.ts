// JSON-LD (schema.org/MusicEvent) da página pública do evento,
// montado a partir dos dados do banco — nada hardcoded.
import { platform } from '@/lib/config'
import type { Event } from '@/lib/supabase'

type OrgInfo = { name: string; slug: string } | null

export function buildEventJsonLd(event: Event, org: OrgInfo) {
  const eventUrl = `${platform.baseUrl}/evento/${event.slug}`
  const startTime = (event.event_time || '12:00:00').slice(0, 8)
  const image = event.og_image_url || event.banner_url

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: event.title,
    description: event.content?.subtitle || event.description || event.title,
    startDate: `${event.event_date}T${startTime}-03:00`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: event.venue_name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: [event.venue_address, event.venue_neighborhood].filter(Boolean).join(' — '),
        addressLocality: event.venue_city,
        addressRegion: event.venue_state,
        ...(event.venue_zip ? { postalCode: event.venue_zip } : {}),
        addressCountry: 'BR',
      },
      ...(event.venue_lat != null && event.venue_lng != null
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: Number(event.venue_lat),
              longitude: Number(event.venue_lng),
            },
          }
        : {}),
    },
    ...(image ? { image: [image] } : {}),
    organizer: {
      '@type': 'Organization',
      name: org?.name ?? platform.name,
      url: eventUrl,
    },
    offers: {
      '@type': 'Offer',
      url: eventUrl,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
    },
  }

  const lineup = event.content?.lineup ?? []
  if (lineup.length > 0) {
    jsonLd.performer = lineup.map((a) => ({ '@type': 'MusicGroup', name: a.name }))
  }

  return jsonLd
}
