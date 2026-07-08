'use client'

import { useAffiliateTracking } from '@/hooks/useAffiliateTracking'

// Monta o tracking de afiliado (?ref=) na página do evento SEMPRE,
// mesmo sem lote ativo — embaixador divulga antes da abertura de vendas
// e o clique precisa contar (visita + cookie de 30 dias).
export function AffiliateTracker({ eventId }: { eventId: string }) {
  useAffiliateTracking(eventId)
  return null
}
