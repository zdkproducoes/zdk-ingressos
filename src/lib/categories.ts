// Categorias de evento da vitrine — fonte única (form admin, API e home).
// O slug é o que vai pro banco (events.category); o label é o que o público vê.
export type EventCategory = {
  slug: string
  label: string
  emoji: string
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { slug: 'pagode-samba',  label: 'Pagode & Samba',    emoji: '🥁' },
  { slug: 'sertanejo',     label: 'Sertanejo',         emoji: '🤠' },
  { slug: 'funk',          label: 'Funk',              emoji: '🔥' },
  { slug: 'eletronico',    label: 'Eletrônico',        emoji: '🎧' },
  { slug: 'rock',          label: 'Rock',              emoji: '🎸' },
  { slug: 'pop',           label: 'Pop & Shows',       emoji: '🎤' },
  { slug: 'rap-trap',      label: 'Rap & Trap',        emoji: '🎙️' },
  { slug: 'forro',         label: 'Forró & Piseiro',   emoji: '🪗' },
  { slug: 'festa-junina',  label: 'Festa Junina',      emoji: '🌽' },
  { slug: 'carnaval',      label: 'Carnaval & Blocos', emoji: '🎭' },
  { slug: 'balada',        label: 'Festas & Baladas',  emoji: '🪩' },
  { slug: 'festival',      label: 'Festivais',         emoji: '🎪' },
  { slug: 'standup',       label: 'Stand-up & Humor',  emoji: '😂' },
  { slug: 'teatro',        label: 'Teatro & Cultura',  emoji: '🎬' },
  { slug: 'gospel',        label: 'Gospel',            emoji: '🙏' },
  { slug: 'futebol',       label: 'Futebol & Esportes', emoji: '⚽' },
  { slug: 'gastronomia',   label: 'Gastronomia',       emoji: '🍔' },
  { slug: 'infantil',      label: 'Infantil & Família', emoji: '🎈' },
  { slug: 'outros',        label: 'Outros',            emoji: '✨' },
]

export const CATEGORY_SLUGS = EVENT_CATEGORIES.map((c) => c.slug)

export function categoryLabel(slug: string | null | undefined): string | null {
  if (!slug) return null
  const cat = EVENT_CATEGORIES.find((c) => c.slug === slug)
  return cat ? `${cat.emoji} ${cat.label}` : null
}
