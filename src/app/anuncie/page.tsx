// Página de captação de produtores: por que vender na ZDK Ingressos
// e como entrar em contato. Linkada na home e no footer.
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  QrCode, Wallet, LayoutDashboard, Users, ScanLine, MessageCircle, Mail, MapPin,
} from 'lucide-react'
import { platform } from '@/lib/config'

export const metadata: Metadata = {
  title: `Venda seus ingressos | ${platform.name}`,
  description:
    'Produz eventos no Grande ABC? Venda seus ingressos na ZDK Ingressos: página própria do evento, pagamento pelo Mercado Pago, QR Code na hora, check-in pelo celular e painel de vendas em tempo real.',
}

const BENEFITS = [
  {
    icon: LayoutDashboard,
    title: 'Painel em tempo real',
    text: 'Vendas, pedidos, compradores e check-ins do seu evento na palma da mão — só você enxerga os seus dados.',
  },
  {
    icon: Wallet,
    title: 'Pagamento sem dor de cabeça',
    text: 'Cartão e Pix processados pelo Mercado Pago. Taxa combinada em contrato, repasse transparente no painel financeiro.',
  },
  {
    icon: QrCode,
    title: 'Ingresso digital na hora',
    text: 'Aprovado o pagamento, o QR Code chega no e-mail do cliente em segundos — com o nome da sua produção no remetente.',
  },
  {
    icon: ScanLine,
    title: 'Check-in pelo celular',
    text: 'App de portaria leitor de QR, à prova de ingresso duplicado, com relatório de entrada em tempo real.',
  },
  {
    icon: Users,
    title: 'Time de afiliados e metas',
    text: 'Links de divulgação para embaixadores, comissão configurável e metas semanais para acelerar a venda.',
  },
  {
    icon: MapPin,
    title: 'Vitrine do Grande ABC',
    text: 'Seu evento aparece na página inicial para um público que já compra ingresso na região.',
  },
]

const STEPS = [
  { n: '1', title: 'Fale com a gente', text: 'Chama no WhatsApp ou manda um e-mail contando do seu evento.' },
  { n: '2', title: 'Conta criada em 1 dia', text: 'Criamos a sua organização, definimos a taxa em contrato e você recebe acesso ao painel.' },
  { n: '3', title: 'Publique e venda', text: 'Você monta a página do evento, cria os lotes e publica. O dinheiro entra, o painel mostra tudo.' },
]

export default function AnunciePage() {
  const wa = platform.whatsapp
    ? `https://wa.me/${platform.whatsapp}?text=${encodeURIComponent('Olá! Quero vender os ingressos do meu evento na ZDK Ingressos.')}`
    : null
  const mail = platform.supportEmail || platform.legal.privacyEmail

  return (
    <main className="min-h-screen bg-surface-800">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <p className="font-display text-accent-400 tracking-[0.24em] text-xs uppercase mb-3">
          Para produtores e casas de show
        </p>
        <h1 className="font-display-bold text-[clamp(2rem,5.5vw,3.4rem)] text-cream-200 leading-[1.02] uppercase mb-5">
          Seu evento.<br />
          <span className="text-accent-400">Nossa plataforma.</span>
        </h1>
        <p className="text-cream-300 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
          A ZDK Ingressos nasceu de quem produz evento no Grande ABC — sabemos o que é virada de lote,
          portaria lotada e repasse que precisa fechar. Venda seus ingressos com a estrutura que a gente
          construiu para os nossos próprios eventos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-300 text-surface-900 font-display-bold uppercase tracking-wide px-7 py-3.5 rounded-xl shadow-[0_4px_0_#7C5A16] transition"
            >
              <MessageCircle className="w-5 h-5" /> Chamar no WhatsApp
            </a>
          )}
          {mail && (
            <a
              href={`mailto:${mail}?subject=${encodeURIComponent('Quero vender ingressos na ZDK Ingressos')}`}
              className="inline-flex items-center gap-2 border border-muted-600 hover:border-accent-400 text-cream-200 font-semibold px-7 py-3.5 rounded-xl transition"
            >
              <Mail className="w-5 h-5 stroke-accent-400" /> {mail}
            </a>
          )}
        </div>
      </section>

      {/* Benefícios */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="font-display-bold text-2xl text-cream-200 uppercase text-center mb-10">
          O que você leva
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-surface-700 border border-muted-700 rounded-2xl p-6">
              <Icon className="w-7 h-7 stroke-accent-400 mb-4" />
              <h3 className="font-display text-lg text-cream-200 mb-2">{title}</h3>
              <p className="text-sm text-cream-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="font-display-bold text-2xl text-cream-200 uppercase text-center mb-10">
          Como funciona
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center px-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-400 text-surface-900 font-display-bold text-xl mb-4">
                {s.n}
              </span>
              <h3 className="font-display text-lg text-cream-200 mb-2">{s.title}</h3>
              <p className="text-sm text-cream-400 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Transparência */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-surface-700 border border-accent-400/40 rounded-2xl p-8 text-center">
          <h2 className="font-display-bold text-xl text-cream-200 uppercase mb-3">
            Transparência antes de tudo
          </h2>
          <p className="text-sm text-cream-400 leading-relaxed max-w-xl mx-auto">
            A taxa da plataforma é combinada em contrato, por organização — sem surpresa. Cada venda,
            taxa e repasse fica registrado no seu painel financeiro, e a operação roda no CNPJ da{' '}
            {platform.legal.companyName}. Quer entender os detalhes? Leia nossos{' '}
            <Link href="/termos" className="text-accent-300 underline underline-offset-2">Termos de Uso</Link>{' '}
            ou pergunte direto pra gente.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <h2 className="font-display-bold text-2xl text-cream-200 uppercase mb-6">
          Bora colocar seu evento no ar?
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-300 text-surface-900 font-display-bold uppercase tracking-wide px-7 py-3.5 rounded-xl shadow-[0_4px_0_#7C5A16] transition"
            >
              <MessageCircle className="w-5 h-5" /> Falar com a ZDK
            </a>
          )}
          <Link
            href="/sobre"
            className="inline-flex items-center gap-2 border border-muted-600 hover:border-accent-400 text-cream-200 font-semibold px-7 py-3.5 rounded-xl transition"
          >
            Conhecer a plataforma
          </Link>
        </div>
      </section>
    </main>
  )
}
