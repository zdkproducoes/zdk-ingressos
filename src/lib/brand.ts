// Marca por organização (organizations.brand jsonb).
// Shape esperado — todos os campos opcionais; sem eles vale o tema/nome
// padrão da plataforma:
// {
//   "colors": { "primary": "#5b0f1e", "accent": "#e0a83c", "bg": "#2a0e14",
//               "surface": "#3a1620", "text": "#f5e9d7" },
//   "logo_url": "https://.../logo.png",
//   "og_default_url": "https://.../og.jpg",
//   "email": { "display_name": "SACODE", "reply_to": "contato@..." },
//   "socials": { "instagram": "https://instagram.com/...", "whatsapp": "5511..." },
//   "public_name": "SACODE do Lacerda"
// }
import { platform } from '@/lib/config'

export type OrgBrand = {
  colors?: {
    primary?: string
    accent?: string
    bg?: string
    surface?: string
    text?: string
  }
  logo_url?: string
  og_default_url?: string
  email?: { display_name?: string; reply_to?: string }
  socials?: { instagram?: string; whatsapp?: string }
  public_name?: string
}

export type OrgForBrand = { name: string; brand?: OrgBrand | null } | null | undefined

/** Nome público do organizador (para o comprador). */
export function orgPublicName(org: OrgForBrand): string {
  return org?.brand?.public_name || org?.name || platform.name
}

/** Remetente dos e-mails: friendly name da organização + domínio da plataforma. */
export function emailFromFor(org: OrgForBrand): string {
  const display = org?.brand?.email?.display_name || org?.name
  if (!display) return platform.emailFrom
  // extrai o endereço do EMAIL_FROM da plataforma ("Nome <email>" ou só "email")
  const match = platform.emailFrom.match(/<([^>]+)>/)
  const address = match ? match[1] : platform.emailFrom
  return `${display} · ${platform.name} <${address}>`
}

export function emailReplyToFor(org: OrgForBrand): string | undefined {
  return org?.brand?.email?.reply_to || undefined
}

/** Mapeia brand.colors → overrides das CSS vars --brand-* usadas no tema. */
export function brandCssVars(brand: OrgBrand | null | undefined): Record<string, string> {
  const c = brand?.colors
  if (!c) return {}
  const vars: Record<string, string> = {}
  if (c.bg) vars['--brand-surface-800'] = c.bg
  if (c.primary) {
    vars['--brand-surface-600'] = c.primary
    vars['--background-elevated'] = c.primary
  }
  if (c.surface) vars['--brand-surface-700'] = c.surface
  if (c.accent) {
    vars['--brand-accent-400'] = c.accent
    vars['--accent'] = c.accent
  }
  if (c.text) vars['--brand-cream-200'] = c.text
  if (c.bg) vars['--background'] = c.bg
  if (c.text) vars['--foreground'] = c.text
  return vars
}
