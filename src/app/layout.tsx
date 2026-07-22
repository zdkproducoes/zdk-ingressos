import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'
import { Archivo } from "next/font/google"
import { Toaster } from 'react-hot-toast'
import { Navbar, type UserProfile } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BotaoAjuda } from '@/components/suporte/BotaoAjuda'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { platform } from '@/lib/config'

// Tipografia display da marca: Archivo variável com o eixo de largura (wdth).
// O font-stretch 125% (Expanded) é aplicado pelas classes .font-display /
// .font-display-bold no globals.css.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  // Verificação de propriedade no Google Search Console (meta tag);
  // sem a env, a tag não é emitida
  ...(platform.googleSiteVerification
    ? { verification: { google: platform.googleSiteVerification } }
    : {}),
  title: `${platform.name} — Ingressos`,
  description: `Compre ingressos para os melhores eventos na ${platform.name}.`,
  openGraph: {
    title: `${platform.name} — Ingressos`,
    description: `Compre ingressos para os melhores eventos na ${platform.name}.`,
    type: 'website',
    locale: 'pt_BR',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Descobre o login no servidor para a Navbar ja vir preenchida no 1o HTML (evita o FOUC).
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialAuth: UserProfile | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()
    initialAuth = profile ?? null
  }

  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body className="bg-surface-800 min-h-screen text-cream-200 pt-14">
        {/* Meta Pixel (base) — dispara PageView em todas as paginas, uma unica vez no layout raiz.
            O Purchase e enviado server-side via CAPI (lib/meta/capi.ts), mesmo pixel ID.
            Sem NEXT_PUBLIC_META_PIXEL_ID configurado, nada é injetado. */}
        {platform.metaPixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${platform.metaPixelId}');
  fbq('track', 'PageView');
              `}
            </Script>
            {/* Fallback oficial do Meta para navegadores sem JavaScript */}
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                alt=""
                src={`https://www.facebook.com/tr?id=${platform.metaPixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}

        <Navbar initialAuth={initialAuth} />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--background-elevated)',
              color: 'var(--foreground)',
              border: '1px solid var(--accent)',
            },
          }}
        />
        {children}
        <Footer />
        <BotaoAjuda />
      </body>
    </html>
  )
}
