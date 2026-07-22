// Identidade da plataforma — fonte única de nome, domínio e marca.
// Tudo vem de variável de ambiente para permitir trocar sem mexer no
// código (o nome/domínio podem mudar até o lançamento).
export const platform = {
  /** Nome público da plataforma (título, e-mails, footer) */
  name: process.env.NEXT_PUBLIC_PLATFORM_NAME ?? 'ZDK Ingressos',
  /** URL canônica do site público, sem barra final */
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.zdkingressos.com.br',
  /** Host do painel dos produtores (ex.: painel.zdkingressos.com.br).
   *  Vazio = sem split por subdomínio (dev/preview servem /admin por path). */
  panelHost: process.env.NEXT_PUBLIC_PANEL_HOST ?? '',
  /** E-mail de suporte exibido ao comprador */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '',
  /** Caixa de entrada que recebe as solicitações do formulário "Precisa de ajuda?" */
  supportInbox: process.env.SUPPORT_INBOX_EMAIL ?? 'suporte@zdkproducoes.com.br',
  /** WhatsApp comercial (só dígitos com DDI, ex.: 5511999990000); vazio = esconde botões */
  whatsapp: process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP ?? '',
  /** Remetente dos e-mails transacionais (domínio verificado no Resend) */
  emailFrom: process.env.EMAIL_FROM ?? 'ZDK Ingressos <onboarding@resend.dev>',
  /** Dados jurídicos da plataforma (termos/privacidade) — nunca hardcode */
  legal: {
    companyName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? 'ZDK PRODUÇÕES',
    document: process.env.NEXT_PUBLIC_LEGAL_DOCUMENT ?? '',
    address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? '',
    privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? 'privacidade@zdkproducoes.com.br',
  },
  /** Pixel da Meta da plataforma; vazio = script não é injetado */
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '',
  /** Token de verificação do Google Search Console; vazio = sem meta tag */
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '',
  /** Descrição na fatura do cartão (máx. 22 chars no Mercado Pago) */
  mpStatementDescriptor: process.env.MP_STATEMENT_DESCRIPTOR ?? 'ZDKINGRESSOS',
  /** Prefixo dos tokens de QR code dos ingressos */
  qrPrefix: process.env.TICKET_QR_PREFIX ?? 'ZDK-',
} as const
