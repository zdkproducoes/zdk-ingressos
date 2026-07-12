import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Redireciona pro evento ativo mais recente (em vez de slug fixo).
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('slug')
    .eq('status', 'active')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (event) redirect(`/evento/${event.slug}`)

  // Nenhum evento com vendas abertas
  return (
    <main className="min-h-screen bg-surface-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface-700 border border-muted-700 rounded-2xl p-10 text-center">
        <p className="font-display text-accent-400 tracking-[0.2em] text-sm mb-3">
          SACODE DO LACERDA
        </p>
        <h1 className="font-display-bold text-3xl text-cream-200 mb-3">
          Vendas encerradas
        </h1>
        <p className="text-sm text-cream-400">
          Nenhum evento com vendas abertas no momento.
          Fique de olho nas nossas redes sociais — o próximo Sacode vem aí! 🥁
        </p>
      </div>
    </main>
  )
}
