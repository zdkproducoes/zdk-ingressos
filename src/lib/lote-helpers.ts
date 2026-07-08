export type LoteRow = {
  id: string
  quantity: number
  paid_count: number
  starts_at: string | null
  status: "scheduled" | "active" | "sold_out" | "ended"
}

export function calcularUrgencia(
  loteAtivo: LoteRow,
  proximoLote: LoteRow | null
): boolean {
  if (loteAtivo.paid_count / loteAtivo.quantity >= 0.9) return true

  if (proximoLote?.starts_at) {
    const horasAteAtivacao =
      (new Date(proximoLote.starts_at).getTime() - Date.now()) / 3_600_000
    if (horasAteAtivacao > 0 && horasAteAtivacao <= 24) return true
  }

  return false
}
