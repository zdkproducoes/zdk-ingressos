// Parser dos campos de conteúdo da página do evento (form admin → banco).
// O lineup vem como texto (1 artista por linha): "Nome | gênero | tipo"
//   tipo: principal → headliner · anfitriao/anfitrião → host · dj → dj ·
//         qualquer outro/vazio → support
import type { EventContent, EventLineupItem } from '@/lib/supabase'

const TIER_MAP: Record<string, EventLineupItem['tier']> = {
  principal: 'headliner',
  headliner: 'headliner',
  anfitriao: 'host',
  'anfitrião': 'host',
  host: 'host',
  dj: 'dj',
}

export function parseLineupText(text: string): EventLineupItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, genre, tierRaw] = line.split('|').map((p) => p.trim())
      const tier = TIER_MAP[(tierRaw ?? '').toLowerCase()] ?? 'support'
      return {
        name,
        ...(genre ? { genre } : {}),
        tier,
      } satisfies EventLineupItem
    })
    .filter((a) => a.name.length > 0)
}

export function lineupToText(lineup: EventLineupItem[] | undefined): string {
  if (!lineup?.length) return ''
  const tierLabel: Record<string, string> = {
    headliner: 'principal',
    host: 'anfitriao',
    dj: 'dj',
    support: '',
  }
  return lineup
    .map((a) => {
      const parts = [a.name, a.genre ?? '', tierLabel[a.tier ?? 'support'] ?? '']
      // remove pipes vazios do fim
      while (parts.length > 1 && !parts[parts.length - 1]) parts.pop()
      return parts.join(' | ')
    })
    .join('\n')
}

export type ContentFormFields = {
  banner_url?: unknown
  og_image_url?: unknown
  venue_lat?: unknown
  venue_lng?: unknown
  subtitle?: unknown
  opening_notice?: unknown
  lineup_text?: unknown
  /** HTML da copy rica; gravado CRU aqui e sanitizado na rota (server). */
  about_html?: unknown
}

/** Normaliza os campos de conteúdo vindos do form. Retorna erro em coordenada inválida. */
export function parseContentFields(body: ContentFormFields):
  | { ok: true; columns: { banner_url: string | null; og_image_url: string | null; venue_lat: number | null; venue_lng: number | null; content: EventContent } }
  | { ok: false; error: string } {
  const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

  const numOrNull = (v: unknown): number | null | 'invalid' => {
    if (v === undefined || v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : 'invalid'
  }

  const lat = numOrNull(body.venue_lat)
  const lng = numOrNull(body.venue_lng)
  if (lat === 'invalid' || lng === 'invalid') {
    return { ok: false, error: 'Latitude/longitude inválidas (use números, ex.: -23.6500).' }
  }

  const content: EventContent = {}
  const subtitle = strOrNull(body.subtitle)
  const openingNotice = strOrNull(body.opening_notice)
  const lineupText = strOrNull(body.lineup_text)
  const aboutHtml = strOrNull(body.about_html)
  if (subtitle) content.subtitle = subtitle
  if (openingNotice) content.opening_notice = openingNotice
  if (lineupText) content.lineup = parseLineupText(lineupText)
  // CRU — a rota sanitiza com sanitize-html antes de gravar (server-only).
  if (aboutHtml) content.about_html = aboutHtml

  return {
    ok: true,
    columns: {
      banner_url: strOrNull(body.banner_url),
      og_image_url: strOrNull(body.og_image_url),
      venue_lat: lat,
      venue_lng: lng,
      content,
    },
  }
}
