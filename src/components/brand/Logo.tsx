// Logo da ZDK Ingressos (manual da marca v1.0):
// símbolo = ingresso com picote + barras de equalizador (som → código de barras);
// wordmark = Z dourado + DK gelo em Archivo Expanded.
// O SVG usa currentColor/vars pra funcionar em qualquer superfície da marca.

const TICKET_PATH =
  'M18 6 H114 Q126 6 126 18 V33 A11 11 0 0 0 126 55 V70 Q126 82 114 82 H18 Q6 82 6 70 V55 A11 11 0 0 0 6 33 V18 Q6 6 18 6 Z'

export function TicketSymbol({
  height = 28,
  gold = '#D9A63F',
  alt = '#F4F4F2',
  title = 'ZDK Ingressos',
}: {
  height?: number
  gold?: string
  alt?: string
  title?: string
}) {
  const width = Math.round(height * (132 / 88))
  return (
    <svg width={width} height={height} viewBox="0 0 132 88" role="img" aria-label={title}>
      <path fill="none" stroke={gold} strokeWidth={5} d={TICKET_PATH} />
      <rect x="35" y="36" width="6" height="16" rx="3" fill={alt} />
      <rect x="47" y="30" width="6" height="28" rx="3" fill={gold} />
      <rect x="59" y="24" width="6" height="40" rx="3" fill={alt} />
      <rect x="71" y="18" width="6" height="52" rx="3" fill={gold} />
      <rect x="83" y="27" width="6" height="34" rx="3" fill={alt} />
      <rect x="95" y="35" width="6" height="18" rx="3" fill={gold} />
    </svg>
  )
}

/** Lockup horizontal (navbar, rodapé de e-mail) */
export function LogoHorizontal({ symbolHeight = 30 }: { symbolHeight?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <TicketSymbol height={symbolHeight} />
      <span className="flex flex-col leading-none">
        <span className="font-display-bold text-xl tracking-tight text-cream-200">
          <span className="text-accent-400">Z</span>DK
        </span>
        <span className="font-display text-[9px] tracking-[0.36em] text-accent-400 uppercase mt-0.5">
          Ingressos
        </span>
      </span>
    </span>
  )
}

/** Lockup vertical (telas de login, footer grande) */
export function LogoVertical({ symbolHeight = 44 }: { symbolHeight?: number }) {
  return (
    <span className="inline-flex flex-col items-center gap-2">
      <TicketSymbol height={symbolHeight} />
      <span className="font-display-bold text-3xl leading-none tracking-tight text-cream-200">
        <span className="text-accent-400">Z</span>DK
      </span>
      <span className="font-display text-[11px] tracking-[0.42em] text-accent-400 uppercase">
        Ingressos
      </span>
    </span>
  )
}
