import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'
import { Bebas_Neue, Anton } from "next/font/google"
import { Toaster } from 'react-hot-toast'
import { Navbar, type UserProfile } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-bold",
  display: "swap",
})

export const metadata: Metadata = {
  // Verificação de propriedade no Google Search Console (meta tag)
  verification: {
    google: 'dccWX-mAsbBayo8vJfrDix4s_wG2uroxBRFL-Ek5-Sg',
  },
  title: 'Sacode do Lacerda - 16ª Edição | Ingressos',
  description: 'Garanta seu ingresso para a Super Edição do Sacode do Lacerda com Milthinho, Caio Lacerda, Pagode Na Sena, Nayara Oliveira e DJ Sant. 02 de agosto de 2026, a partir das 12h no Villa Jardim Bar.',
  openGraph: {
    title: 'Sacode do Lacerda - 16ª Edição | Super Edição com Milthinho',
    description: 'O pagode que faz São Bernardo tremer! 02/08/2026 no Villa Jardim Bar. Ingressos limitados.',
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
    <html lang="pt-BR" className={`${bebasNeue.variable} ${anton.variable}`}>
      <body className="bg-wine-800 min-h-screen text-cream-200 pt-14">
        {/* Meta Pixel (base) — dispara PageView em todas as paginas, uma unica vez no layout raiz.
            O Purchase e enviado server-side via CAPI (lib/meta/capi.ts), mesmo pixel ID. */}
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
  fbq('init', '1415319082934143');
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
            src="https://www.facebook.com/tr?id=1415319082934143&ev=PageView&noscript=1"
          />
        </noscript>

        <Navbar initialAuth={initialAuth} />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#45183F',
              color: '#EADBC4',
              border: '1px solid #E4A03F',
            },
          }}
        />
        {children}
        <Footer />
      </body>
    </html>
  )
}
