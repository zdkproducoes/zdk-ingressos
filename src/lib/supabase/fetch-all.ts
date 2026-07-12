// O PostgREST devolve no máximo 1000 linhas por requisição, mesmo com
// .range() maior — um range(0, 49999) traz só as 1000 primeiras, silenciosamente.
// Este helper busca em páginas de 1000 até esgotar o resultado.
//
// IMPORTANTE: a query montada em fetchPage precisa de ordenação estável
// (ex.: .order('id')) — sem isso o banco pode repetir/pular linhas entre páginas.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data } = await fetchPage(from, from + pageSize - 1);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
