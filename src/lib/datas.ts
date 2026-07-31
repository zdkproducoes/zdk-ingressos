// lib/datas.ts
// Fuso ÚNICO da plataforma: tudo que o usuário lê é horário de Brasília.
//
// Por que este arquivo existe: a Vercel roda as funções com TZ=UTC. Um
// `new Date(iso).toLocaleDateString('pt-BR')` num Server Component renderiza
// em UTC — uma compra feita às 21h de terça aparecia como quarta, e o Resumo
// (que sempre agrupou em SP) parecia estar "perdendo" pedidos. O mesmo código
// num Client Component renderiza no fuso do navegador, o que ainda deixa o
// HTML do servidor diferente do da hidratação. Fixar o fuso resolve os dois
// casos e deixa a saída igual em qualquer máquina.
//
// São DOIS tipos de campo, tratados de formas diferentes:
//
//   TIMESTAMP (created_at, paid_at, checked_in_at, ...) = instante real.
//     Guardado com fuso; convertemos para SP na hora de exibir.  -> dataSP,
//     dataHoraSP, diaSP, hojeSP
//
//   DATE puro (events.event_date = 'YYYY-MM-DD') = rótulo, não instante.
//     Não tem hora nem fuso: "30/08/2026" é 30/08/2026 em qualquer lugar do
//     mundo. Lemos como meia-noite UTC e formatamos em UTC, o que devolve
//     exatamente a data guardada.  -> dataEvento, eventoJaPassou
//
// Nunca use toLocaleDateString/toLocaleString direto em cima de um timestamp:
// ou passa por aqui, ou passa timeZone explícito.

export const TZ_SP = 'America/Sao_Paulo';

type Partes = { year: string; month: string; day: string; hour: string; minute: string; second: string };

const PARTES_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ_SP,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});

/** Quebra um instante nos seus componentes de calendário em horário de SP. */
function partesSP(d: Date): Partes {
  const p = PARTES_FMT.formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  // hourCycle h23 pode devolver '24' na meia-noite em alguns runtimes
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    year: get('year'), month: get('month'), day: get('day'),
    hour, minute: get('minute'), second: get('second'),
  };
}

/** Offset de SP em minutos para um dado instante (hoje sempre -180). */
function offsetSPMinutos(d: Date): number {
  const p = partesSP(d);
  const comoUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (comoUTC - Math.floor(d.getTime() / 1000) * 1000) / 60000;
}

// ---------------------------------------------------------------------------
// TIMESTAMPS
// ---------------------------------------------------------------------------

/** Data de hoje em SP, no formato 'YYYY-MM-DD' (para comparar com colunas DATE). */
export function hojeSP(): string {
  const p = partesSP(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/** Timestamp -> 'YYYY-MM-DD' do dia em SP (chave de agrupamento por dia). */
export function diaSP(iso: string | Date): string {
  const p = partesSP(iso instanceof Date ? iso : new Date(iso));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Timestamp -> 'DD/MM/AAAA' em SP. */
export function dataSP(iso: string | Date | null | undefined, fallback = '—'): string {
  if (!iso) return fallback;
  const p = partesSP(iso instanceof Date ? iso : new Date(iso));
  return `${p.day}/${p.month}/${p.year}`;
}

/** Timestamp -> 'DD/MM/AAAA HH:MM' em SP. `anoCurto` usa 'DD/MM/AA'. */
export function dataHoraSP(
  iso: string | Date | null | undefined,
  { anoCurto = false, fallback = '—' }: { anoCurto?: boolean; fallback?: string } = {},
): string {
  if (!iso) return fallback;
  const p = partesSP(iso instanceof Date ? iso : new Date(iso));
  const ano = anoCurto ? p.year.slice(2) : p.year;
  return `${p.day}/${p.month}/${ano} ${p.hour}:${p.minute}`;
}

/** Timestamp -> 'HH:MM' em SP. */
export function horaSP(iso: string | Date): string {
  const p = partesSP(iso instanceof Date ? iso : new Date(iso));
  return `${p.hour}:${p.minute}`;
}

/**
 * Timestamp -> texto livre em SP, quando precisar de um formato específico
 * (ex.: incluir o dia da semana). Sempre force o fuso por aqui.
 */
export function formatarSP(iso: string | Date, opts: Intl.DateTimeFormatOptions): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', { ...opts, timeZone: TZ_SP }).format(d);
}

// ---------------------------------------------------------------------------
// DATE PURO ('YYYY-MM-DD') — event_date e afins
// ---------------------------------------------------------------------------

const OPCOES_DATA_EVENTO: Intl.DateTimeFormatOptions = {
  day: '2-digit', month: '2-digit', year: 'numeric',
};

/**
 * Formata uma coluna DATE ('YYYY-MM-DD') sem risco de deslocar um dia.
 * Default: 'DD/MM/AAAA'. Ex.: dataEvento(e.event_date, { weekday: 'long',
 * day: '2-digit', month: 'long', year: 'numeric' }).
 */
export function dataEvento(
  ymd: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = OPCOES_DATA_EVENTO,
  fallback = '—',
): string {
  if (!ymd) return fallback;
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat('pt-BR', { ...opts, timeZone: 'UTC' }).format(d);
}

/** Coluna DATE -> Date estável (meia-noite UTC), para ordenar/comparar. */
export function dataEventoComoDate(ymd: string): Date {
  return new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
}

/**
 * O evento já passou? Compara a data do evento com HOJE em SP — nunca com o
 * "hoje" do servidor (que em UTC vira o dia seguinte a partir das 21h).
 */
export function eventoJaPassou(ymd: string | null | undefined): boolean {
  if (!ymd) return false;
  return ymd.slice(0, 10) < hojeSP();
}

/**
 * Instante em que o evento começa, a partir de event_date + event_time
 * interpretados como horário de Brasília. Sem hora, assume meia-noite.
 */
export function inicioDoEvento(ymd: string, hhmm: string | null | undefined): Date {
  const hora = (hhmm || '00:00').slice(0, 5); // 'HH:MM' (event_time vem 'HH:MM:SS')
  const iso = inputSPParaIso(`${ymd.slice(0, 10)}T${hora}`);
  return iso ? new Date(iso) : new Date(NaN);
}

// ---------------------------------------------------------------------------
// <input type="datetime-local"> <-> ISO
// ---------------------------------------------------------------------------
// O input trabalha em "hora de parede", sem fuso. O admin digita horário de
// Brasília, então a conversão tem que ser feita em SP — não no fuso da máquina
// de quem está com o painel aberto.

/** ISO do banco -> valor de <input type="datetime-local"> ('YYYY-MM-DDTHH:MM' em SP). */
export function isoParaInputSP(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = partesSP(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Valor de <input type="datetime-local"> (horário de Brasília) -> ISO UTC. */
export function inputSPParaIso(local: string | null | undefined): string | null {
  if (!local) return null;
  const base = Date.parse(`${local.length === 16 ? local : local.slice(0, 16)}:00Z`);
  if (Number.isNaN(base)) return null;
  // Desconta o offset de SP. Repete uma vez porque o offset poderia mudar
  // exatamente na virada (o Brasil não usa mais horário de verão, mas se
  // voltar a usar isso continua correto).
  let ms = base - offsetSPMinutos(new Date(base)) * 60000;
  ms = base - offsetSPMinutos(new Date(ms)) * 60000;
  return new Date(ms).toISOString();
}
