export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5).replace(':', 'h')
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleaned)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== parseInt(cleaned[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== parseInt(cleaned[10])) return false

  return true
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function isBatchAvailable(batch: {
  status: string
  starts_at: string | null
  ends_at: string | null
  quantity: number
  sold_count: number
}): boolean {
  if (batch.status !== 'active') return false
  if (batch.quantity <= batch.sold_count) return false

  const now = new Date()
  if (batch.starts_at && new Date(batch.starts_at) > now) return false
  if (batch.ends_at && new Date(batch.ends_at) < now) return false

  return true
}

export function getBatchStatusLabel(batch: {
  status: string
  starts_at: string | null
  ends_at: string | null
  quantity: number
  sold_count: number
}): { label: string; color: string } {
  if (batch.quantity <= batch.sold_count) return { label: 'Esgotado', color: 'red' }
  if (batch.status === 'paused') return { label: 'Pausado', color: 'gray' }
  if (batch.status === 'ended') return { label: 'Encerrado', color: 'gray' }

  const now = new Date()
  if (batch.starts_at && new Date(batch.starts_at) > now) return { label: 'Em breve', color: 'yellow' }
  if (batch.ends_at && new Date(batch.ends_at) < now) return { label: 'Encerrado', color: 'gray' }

  const remaining = batch.quantity - batch.sold_count
  if (remaining <= 10) return { label: `Últimas ${remaining} unidades!`, color: 'orange' }

  return { label: 'Disponível', color: 'green' }
}
