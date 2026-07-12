// Página institucional: quem está por trás da ZDK Ingressos.
// Conteúdo verificável (nada de número inventado) — autoridade vem de
// história real + transparência.
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, QrCode, MapPin, HeartHandshake } from 'lucide-react'
import { platform } from '@/lib/config'
import { LogoVertical } from '@/components/brand/Logo'

export const metadata: Metadata = {
  title: `Sobre nós | ${platform.name}`,
  description:
    'A ZDK Ingressos é a plataforma de ingressos da ZDK Produções: nascida de quem produz eventos no Grande ABC, feita para produtores e público da região.',
}

export default function SobrePage() {
  const mail = platform.supportEmail || platform.legal.privacyEmail

  return (
    <main className="min-h-screen bg-surface-800">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="mb-8 flex justify-center">
          <LogoVertical symbolHeight={52} />
        </div>
        <h1 className="font-display-bold text-[clamp(1.9rem,5vw,3rem)] text-cream-200 leading-tight uppercase mb-5">
          Feita por quem vive evento
        </h1>
        <p className="text-cream-300 max-w-2xl mx-auto text-lg leading-relaxed">
          A ZDK Ingressos é a plataforma de venda de ingressos da{' '}
          <strong className="text-cream-200">{platform.legal.companyName}</strong>, produtora que realiza
          eventos no Grande ABC paulista. Antes de vender ingresso dos outros, a gente vendeu — e ainda
          vende — os nossos.
        </p>
      </section>

      {/* História */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="font-display-bold text-2xl text-cream-200 uppercase mb-6">Nossa história</h2>
        <div className="space-y-4 text-cream-300 leading-relaxed">
          <p>
            Tudo começou dentro das nossas próprias produções. Para dar conta da venda de ingressos dos
            eventos que realizamos na região — como o <strong className="text-cream-200">Sacode do
            Lacerda</strong>, que chega à 16ª edição —, construímos do zero uma plataforma completa:
            página de evento, pagamento online, ingresso com QR Code, check-in na portaria e painel de
            vendas em tempo real.
          </p>
          <p>
            Funcionou tão bem no palco de casa que decidimos abrir a estrutura para outros produtores.
            Assim nasceu a <strong className="text-cream-200">ZDK Ingressos</strong>: a mesma tecnologia
            testada em pista lotada, agora disponível para quem faz a cena do ABC acontecer — do pagode
            ao sertanejo, da balada ao festival.
          </p>
          <p>
            Somos da região e ficamos por aqui. Quando você compra um ingresso na ZDK, tem uma equipe
            local do outro lado — que conhece a casa de show, o produtor e, muito provavelmente, vai
            estar no evento também.
          </p>
        </div>
      </section>

      {/* Pilares */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-surface-700 border border-muted-700 rounded-2xl p-6">
            <MapPin className="w-7 h-7 stroke-accent-400 mb-3" />
            <h3 className="font-display text-base text-cream-200 mb-1.5">Raiz no ABC</h3>
            <p className="text-[13.5px] text-cream-400 leading-relaxed">Foco total nos eventos de Santo André, São Bernardo, São Caetano, Diadema e região.</p>
          </div>
          <div className="bg-surface-700 border border-muted-700 rounded-2xl p-6">
            <ShieldCheck className="w-7 h-7 stroke-accent-400 mb-3" />
            <h3 className="font-display text-base text-cream-200 mb-1.5">Segurança de verdade</h3>
            <p className="text-[13.5px] text-cream-400 leading-relaxed">Pagamentos processados pelo Mercado Pago; seus dados protegidos conforme a LGPD.</p>
          </div>
          <div className="bg-surface-700 border border-muted-700 rounded-2xl p-6">
            <QrCode className="w-7 h-7 stroke-accent-400 mb-3" />
            <h3 className="font-display text-base text-cream-200 mb-1.5">Tecnologia própria</h3>
            <p className="text-[13.5px] text-cream-400 leading-relaxed">Da compra ao check-in, tudo roda em plataforma nossa — sem intermediário no meio do caminho.</p>
          </div>
          <div className="bg-surface-700 border border-muted-700 rounded-2xl p-6">
            <HeartHandshake className="w-7 h-7 stroke-accent-400 mb-3" />
            <h3 className="font-display text-base text-cream-200 mb-1.5">Parceria com o produtor</h3>
            <p className="text-[13.5px] text-cream-400 leading-relaxed">Taxa combinada em contrato e repasse transparente — o sucesso do evento é o nosso também.</p>
          </div>
        </div>
      </section>

      {/* Dados institucionais + contato */}
      <section className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <div className="bg-surface-700 border border-muted-700 rounded-2xl p-8">
          <h2 className="font-display-bold text-xl text-cream-200 uppercase mb-4">Fale com a gente</h2>
          <ul className="space-y-2 text-sm text-cream-300">
            {mail && (
              <li>
                📧 E-mail:{' '}
                <a href={`mailto:${mail}`} className="text-accent-300 underline underline-offset-2">{mail}</a>
              </li>
            )}
            {platform.whatsapp && (
              <li>
                💬 WhatsApp:{' '}
                <a
                  href={`https://wa.me/${platform.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-300 underline underline-offset-2"
                >
                  chamar agora
                </a>
              </li>
            )}
            <li>
              🏢 {platform.legal.companyName}
              {platform.legal.document ? ` · CNPJ ${platform.legal.document}` : ''}
            </li>
            <li>
              📄 <Link href="/termos" className="text-accent-300 underline underline-offset-2">Termos de Uso</Link>
              {' · '}
              <Link href="/privacidade" className="text-accent-300 underline underline-offset-2">Política de Privacidade</Link>
            </li>
          </ul>
          <div className="border-t border-muted-700 mt-6 pt-6 text-center">
            <p className="text-sm text-cream-400 mb-4">Produz eventos? Venha vender com a gente.</p>
            <Link
              href="/anuncie"
              className="inline-block bg-accent-400 hover:bg-accent-300 text-surface-900 font-display-bold uppercase tracking-wide px-7 py-3 rounded-xl shadow-[0_4px_0_#7C5A16] transition"
            >
              Anuncie seu evento
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
