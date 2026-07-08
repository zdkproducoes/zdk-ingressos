// lib/lotes.ts
// REGRA ÚNICA da virada de lote — usada pela página do evento, pela página
// de checkout e pela API de compra, pra que os três sempre concordem.
//
// Os lotes de um evento formam uma FILA (por sort_order). O "lote atual"
// é o PRIMEIRO da fila que ainda pode vender:
//   - visível (is_visible)
//   - não desativado manualmente (status 'paused'/'ended' passam o bastão;
//     'active' e 'scheduled' participam da fila — 'scheduled' vira sozinho
//     quando chega a vez dele)
//   - dentro da janela de datas (starts_at/ends_at, quando definidas)
//   - com estoque REAL: vendidos (sold_count) + reservados em checkouts em
//     andamento (reserved_count) < quantidade — a MESMA conta da reserva
//     atômica, então página e checkout nunca divergem na virada.
//
// Se o primeiro elegível da fila ainda não abriu (starts_at no futuro),
// NINGUÉM está à venda (é fila: o lote 2 não fura na frente do 1) e ele
// volta como "próximo" — a página mostra "em breve".
//
// A virada é calculada na hora da leitura: não depende de cron nem de
// mudança de status no banco. Lote 1 esgotou/expirou/foi pausado → o
// lote 2 assume instantaneamente.

export type LoteFilaRow = {
  id: string;
  name: string;
  price: number | string;
  quantity: number;
  sold_count: number | null;
  reserved_count?: number | null;
  status: string;
  is_visible: boolean;
  sort_order: number | null;
  starts_at: string | null;
  ends_at: string | null;
};

// Estoque real restante: mesma conta da função reserve_order_stock do banco
export function restanteReal(b: LoteFilaRow): number {
  return b.quantity - (b.sold_count ?? 0) - (b.reserved_count ?? 0);
}

export function resolveLoteAtual<T extends LoteFilaRow>(
  batches: T[],
  now: number = Date.now(),
): { atual: T | null; proximo: T | null } {
  const fila = batches
    .filter((b) => b.is_visible)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || Number(a.price) - Number(b.price),
    );

  for (let i = 0; i < fila.length; i++) {
    const b = fila[i];
    // Desativado manualmente ou já esgotado por status: passa o bastão
    if (b.status !== 'active' && b.status !== 'scheduled') continue;
    // Janela de vendas encerrou: passa o bastão
    if (b.ends_at && new Date(b.ends_at).getTime() <= now) continue;
    // Esgotado de verdade (contando reservas em andamento): passa o bastão
    if (restanteReal(b) <= 0) continue;
    // Primeiro elegível ainda não abriu: ninguém vende (fila não fura)
    if (b.starts_at && new Date(b.starts_at).getTime() > now) {
      return { atual: null, proximo: b };
    }
    return { atual: b, proximo: fila[i + 1] ?? null };
  }

  return { atual: null, proximo: null };
}
