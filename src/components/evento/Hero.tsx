import Image from "next/image";

// Hero da página do evento: banner do evento (events.banner_url) + tarja de CTA.
// Sem banner, renderiza um hero tipográfico com o título.
// A tarja muda conforme o estado das vendas:
//   - com lote ativo: "Vendas ABERTAS | A partir de R$ X"
//   - sem lote ativo: aviso de abertura (vendas ainda não começaram)
export function Hero({
  title,
  subtitle,
  bannerUrl,
  precoMinimo,
  avisoAbertura,
}: {
  title: string;
  subtitle: string | null;
  bannerUrl: string | null;
  precoMinimo: number | null;
  avisoAbertura: string | null; // ex.: "08/07 às 18h"; null = sem data anunciada
}) {
  const vendasAbertas = precoMinimo !== null;
  const precoFmt =
    precoMinimo === null
      ? ''
      : precoMinimo % 1 === 0
        ? String(precoMinimo)
        : precoMinimo.toFixed(2).replace('.', ',');

  return (
    <>
      {/* Hero com o banner do evento em tela cheia */}
      <section className="relative w-full overflow-hidden bg-surface-900">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt={title}
            width={2160}
            height={1080}
            priority
            className="w-full h-auto block"
          />
        ) : (
          <div className="w-full py-24 px-5 bg-gradient-to-br from-surface-600 to-muted-600 text-center">
            <h1 className="font-display-bold text-[clamp(2.5rem,8vw,5rem)] text-cream-100 leading-none tracking-wide">
              {title}
            </h1>
            {subtitle && (
              <p className="font-display text-xl text-accent-300 tracking-[0.1em] mt-4">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {/* Fade pro fundo do site embaixo */}
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-transparent to-surface-800 pointer-events-none" />
      </section>

      {/* Tarja-CTA logo abaixo */}
      <section
        className="relative bg-gradient-to-br from-surface-600 to-muted-600
                   border-t-4 border-b-4 border-accent-400
                   py-7 px-5 text-center"
      >
        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-400" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-400" />

        <div className="max-w-[1000px] mx-auto flex flex-wrap items-center justify-center gap-4 sm:gap-x-8">
          {vendasAbertas ? (
            <div className="font-display text-xl tracking-[0.08em] text-cream-100">
              Vendas <strong className="text-accent-300">ABERTAS</strong>
              <span className="mx-2 opacity-50">|</span>
              A partir de <strong className="text-accent-300">R$ {precoFmt}</strong>
            </div>
          ) : (
            <div className="font-display text-xl tracking-[0.08em] text-cream-100">
              {avisoAbertura ? (
                <>Abertura das Vendas <strong className="text-accent-300">dia {avisoAbertura}</strong></>
              ) : (
                <>Vendas <strong className="text-accent-300">em breve</strong></>
              )}
            </div>
          )}
          <a
            href="#ingressos"
            className="bg-accent-400 text-surface-900 px-8 py-3.5
                       rounded-[10px] font-display-bold text-xl
                       tracking-wider uppercase no-underline
                       transition-all duration-200
                       shadow-[0_4px_0_#7C5A16]
                       hover:bg-accent-300 hover:-translate-y-0.5
                       hover:shadow-[0_6px_0_#7C5A16]
                       active:translate-y-0.5
                       active:shadow-[0_2px_0_#7C5A16]
                       animate-pulse-glow"
          >
            {vendasAbertas ? 'Garantir meu ingresso' : 'Ver ingressos'}
          </a>
        </div>
      </section>
    </>
  );
}
