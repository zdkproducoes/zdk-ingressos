'use client'

import { useRouter } from "next/navigation"
import { LoteAtivoCard, type LoteAtivo } from "./LoteAtivoCard"

// O tracking de afiliado mora no <AffiliateTracker /> (nível da página),
// pra contar visita mesmo quando não há lote ativo.
export function LoteAtivoWrapper({
  lote,
  isUrgent,
  eventId,
  eventSlug,
}: {
  lote: LoteAtivo
  isUrgent: boolean
  eventId: string
  eventSlug: string
}) {
  const router = useRouter()

  const handleBuy = (loteId: string, quantity: number) => {
    try {
      localStorage.setItem(
        "cart",
        JSON.stringify([{
          loteId: lote.id,
          quantity,
          price: lote.price,
          name: lote.name,
          addedAt: new Date().toISOString(),
        }])
      )
      localStorage.setItem("event_id", eventId)
      // affiliate_code vive no cookie sacode_ref (lido server-side no checkout)
    } catch (err) {
      console.error("[LoteAtivoWrapper] localStorage falhou:", err)
    }

    router.push(`/checkout?event=${eventSlug}`)
  }

  return <LoteAtivoCard lote={lote} isUrgent={isUrgent} onBuy={handleBuy} />
}
