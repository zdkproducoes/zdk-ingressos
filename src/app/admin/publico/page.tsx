import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { AniversariosClient } from '@/components/admin/AniversariosClient';
import {
  SERIES,
  SERIES_KEYS,
  genderKey,
  MONTHS_PT,
  MONTHS_SHORT,
  type SeriesKey,
  type Origem,
  type Aniversariante,
} from '@/lib/admin/publico';
import { Users, Cake, MapPin, CalendarDays, type LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PersonRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  gender: string | null;
  birth_date: string | null; // YYYY-MM-DD
  city: string | null;
  phone: string | null;
  email: string | null;
};

type Person = PersonRow & { origin: Origem };

const ORIGEM_OPTIONS: { value: string; label: string }[] = [
  { value: 'todos',   label: 'Todos' },
  { value: 'online',  label: 'Plataforma' },
  { value: 'offline', label: 'Base offline' },
];

type Counts = Record<SeriesKey, number>;
const zeroCounts = (): Counts => ({ homem: 0, mulher: 0, outros: 0 });
const sumCounts = (c: Counts) => c.homem + c.mulher + c.outros;

// "YYYY-MM-DD" -> partes numéricas, sem passar por Date (evita fuso)
function birthParts(birth: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = birth.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

// Hoje no fuso de SP, como { y, m, d }
function todaySP(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).split('-').map(Number);
  return { y: parts[0], m: parts[1], d: parts[2] };
}

function ageToday(birth: { y: number; m: number; d: number }, today: { y: number; m: number; d: number }): number {
  let age = today.y - birth.y;
  if (today.m < birth.m || (today.m === birth.m && today.d < birth.d)) age--;
  return age;
}

// Nomes canônicos de cidade, indexados pela grafia sem acento/minúscula.
// Padroniza SÓ a exibição na aba Público — o banco não é alterado.
const CITY_CANONICAL: Record<string, string> = {
  'sao bernardo do campo': 'São Bernardo do Campo',
  'sao bernardo': 'São Bernardo do Campo',
  'sbc': 'São Bernardo do Campo',
  'sao paulo': 'São Paulo',
  'sa paulo': 'São Paulo',
  'sp': 'São Paulo',
  'santo andre': 'Santo André',
  'sao caetano do sul': 'São Caetano do Sul',
  'sao caetano': 'São Caetano do Sul',
  'maua': 'Mauá',
  'ribeirao pires': 'Ribeirão Pires',
  'rio grande da serra': 'Rio Grande da Serra',
  'taboao da serra': 'Taboão da Serra',
  'jundiai': 'Jundiaí',
  'itanhaem': 'Itanhaém',
  'jaguariuna': 'Jaguariúna',
  'mogi das cruzes': 'Mogi das Cruzes',
  'ferraz de vasconcelos': 'Ferraz de Vasconcelos',
  'praia grande': 'Praia Grande',
};

// Fallback para cidades fora do dicionário: Título Com Partículas Minúsculas
function titleCasePt(s: string): string {
  const minor = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return s.split(' ')
    .map((w, i) => (minor.has(w) && i > 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const AGE_BRACKETS: { label: string; min: number; max: number }[] = [
  { label: 'Até 17',  min: 0,  max: 17 },
  { label: '18–24',   min: 18, max: 24 },
  { label: '25–29',   min: 25, max: 29 },
  { label: '30–39',   min: 30, max: 39 },
  { label: '40–49',   min: 40, max: 49 },
  { label: '50+',     min: 50, max: 200 },
];

const fmtNumber = (v: number) => v.toLocaleString('pt-BR');
const fmtPct = (part: number, total: number) =>
  total > 0 ? `${((part / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—';

// ---------- componentes visuais (server) ----------

function Legend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-cream-300">
      {SERIES_KEYS.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SERIES[k].color }} />
          {SERIES[k].label}
        </span>
      ))}
    </div>
  );
}

// Barra horizontal empilhada por gênero. Largura relativa ao maior valor do
// grupo (max); total visível no fim, detalhe (absoluto + %) no title (hover).
function StackedBar({ label, counts, max }: { label: string; counts: Counts; max: number }) {
  const total = sumCounts(counts);
  const widthPct = max > 0 ? (total / max) * 100 : 0;
  const detail = SERIES_KEYS
    .map((k) => `${SERIES[k].label}: ${fmtNumber(counts[k])} (${fmtPct(counts[k], total)})`)
    .join(' · ');
  return (
    <div className="flex items-center gap-3" title={`${label} — ${detail}`}>
      <span className="w-28 shrink-0 text-sm text-cream-300 truncate" title={label}>{label}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[2px] h-4" style={{ width: `${widthPct}%` }}>
          {SERIES_KEYS.filter((k) => counts[k] > 0).map((k, i, arr) => (
            <div
              key={k}
              className={`h-4 min-w-[3px] ${i === arr.length - 1 ? 'rounded-r' : ''} ${i === 0 ? 'rounded-l-sm' : ''}`}
              style={{ backgroundColor: SERIES[k].color, flexGrow: counts[k] }}
            />
          ))}
        </div>
      </div>
      <span className="w-12 shrink-0 text-right text-sm text-cream-200 font-medium">{fmtNumber(total)}</span>
    </div>
  );
}

function ChartCard({ icon: Icon, title, subtitle, children }: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-700 rounded-lg border border-muted-700 p-6">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <div className="flex items-center gap-2">
          <Icon className="text-accent-400" size={20} />
          <h2 className="text-cream-200 font-bold">{title}</h2>
        </div>
        <Legend />
      </div>
      {subtitle && <p className="text-cream-400 text-xs mb-4">{subtitle}</p>}
      <div className="space-y-2 mt-4">{children}</div>
    </div>
  );
}

// ---------- página ----------

export default async function PublicoPage({
  searchParams,
}: {
  searchParams: { mes?: string; origem?: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') redirect('/');

  const today = todaySP();
  const mesParsed = parseInt(searchParams?.mes ?? '', 10);
  const mes = mesParsed >= 1 && mesParsed <= 12 ? mesParsed : today.m;
  const origem = ORIGEM_OPTIONS.some((o) => o.value === searchParams?.origem)
    ? (searchParams!.origem as string)
    : 'todos';

  const buildHref = (params: { origem?: string; mes?: number; anchor?: boolean }) =>
    `/admin/publico?origem=${params.origem ?? origem}&mes=${params.mes ?? mes}${params.anchor ? '#aniversarios' : ''}`;

  const personFields = 'id, full_name, first_name, gender, birth_date, city, phone, email';
  const fetchAllPeople = async (table: 'profiles' | 'offline_audience'): Promise<PersonRow[]> => {
    const rows = await fetchAllRows((from, to) =>
      supabaseAdmin.from(table).select(personFields).order('id').range(from, to));
    return rows as unknown as PersonRow[];
  };

  const [rawOnline, rawOffline, selectedEvent] = await Promise.all([
    origem === 'offline' ? Promise.resolve([] as PersonRow[]) : fetchAllPeople('profiles'),
    origem === 'online' ? Promise.resolve([] as PersonRow[]) : fetchAllPeople('offline_audience'),
    getSelectedEvent(),
  ]);

  // -------- deduplicação entre bases (visão "Todos") --------
  // Quem está na base offline mas já se cadastrou na plataforma conta uma vez
  // só — vale o cadastro na plataforma (mais recente e preenchido pela própria pessoa).
  // Chave: telefone (DDD + últimos 8 dígitos, tolera 9º dígito e +55) ou e-mail.
  const phoneKeyOf = (phone: string | null): string | null => {
    let d = (phone ?? '').replace(/\D/g, '');
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
    if (d.length < 10) return null;
    return `${d.slice(0, 2)}${d.slice(-8)}`;
  };
  const emailKeyOf = (email: string | null): string | null =>
    email?.trim().toLowerCase() || null;

  const onlinePeople: Person[] = rawOnline.map((p) => ({ ...p, origin: 'online' as const }));
  const offlineAll: Person[] = rawOffline.map((p) => ({ ...p, origin: 'offline' as const }));

  const knownPhones = new Set(onlinePeople.map((p) => phoneKeyOf(p.phone)).filter(Boolean));
  const knownEmails = new Set(onlinePeople.map((p) => emailKeyOf(p.email)).filter(Boolean));
  const isDup = (p: Person) => {
    const ph = phoneKeyOf(p.phone);
    const em = emailKeyOf(p.email);
    return (ph !== null && knownPhones.has(ph)) || (em !== null && knownEmails.has(em));
  };
  const offlinePeople = origem === 'todos' ? offlineAll.filter((p) => !isDup(p)) : offlineAll;
  const overlap = origem === 'todos' ? offlineAll.length - offlinePeople.length : 0;

  const people: Person[] = [...onlinePeople, ...offlinePeople];
  const total = people.length;

  // -------- totais por gênero --------
  const genderTotals = zeroCounts();
  for (const p of people) genderTotals[genderKey(p.gender)]++;

  // -------- por faixa etária --------
  const ageCounts = AGE_BRACKETS.map(() => zeroCounts());
  const ageUnknown = zeroCounts();
  for (const p of people) {
    const parts = p.birth_date ? birthParts(p.birth_date) : null;
    if (!parts) { ageUnknown[genderKey(p.gender)]++; continue; }
    const age = ageToday(parts, today);
    const idx = AGE_BRACKETS.findIndex((b) => age >= b.min && age <= b.max);
    if (idx >= 0) ageCounts[idx][genderKey(p.gender)]++;
    else ageUnknown[genderKey(p.gender)]++;
  }

  // -------- por cidade (top 10 + outras) --------
  // Agrupa ignorando caixa e acentos ("São Bernardo" = "sao bernardo")
  const cityMap = new Map<string, { label: string; counts: Counts }>();
  for (const p of people) {
    const raw = p.city?.trim().replace(/\s+/g, ' ');
    const key = raw
      ? raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : '__none__';
    if (!cityMap.has(key)) {
      const label = !raw ? 'Não informado' : (CITY_CANONICAL[key] ?? titleCasePt(key));
      cityMap.set(key, { label, counts: zeroCounts() });
    }
    cityMap.get(key)!.counts[genderKey(p.gender)]++;
  }
  const citiesSorted = Array.from(cityMap.values()).sort((a, b) => sumCounts(b.counts) - sumCounts(a.counts));
  const topCities = citiesSorted.slice(0, 10);
  const otherCities = citiesSorted.slice(10);
  const otherCounts = zeroCounts();
  for (const c of otherCities) for (const k of SERIES_KEYS) otherCounts[k] += c.counts[k];

  // -------- aniversariantes por mês --------
  const monthCounts: Counts[] = MONTHS_PT.map(() => zeroCounts());
  for (const p of people) {
    const parts = p.birth_date ? birthParts(p.birth_date) : null;
    if (!parts) continue;
    monthCounts[parts.m - 1][genderKey(p.gender)]++;
  }

  // -------- lista de aniversariantes do mês selecionado --------
  const birthdayPeople: Aniversariante[] = people
    .map((p) => ({ p, parts: p.birth_date ? birthParts(p.birth_date) : null }))
    .filter((x): x is { p: Person; parts: { y: number; m: number; d: number } } =>
      x.parts !== null && x.parts.m === mes)
    .sort((a, b) => a.parts.d - b.parts.d)
    .map(({ p, parts }) => ({
      id: `${p.origin}-${p.id}`,
      name: p.full_name?.trim() || '',
      firstName: p.first_name?.trim() || p.full_name?.trim().split(' ')[0] || '',
      day: parts.d,
      ageTurning: today.y - parts.y,
      gender: genderKey(p.gender),
      phone: p.phone,
      origin: p.origin,
    }));

  const maxAge = Math.max(1, ...ageCounts.map(sumCounts), sumCounts(ageUnknown));
  const maxCity = Math.max(1, ...topCities.map((c) => sumCounts(c.counts)), sumCounts(otherCounts));
  const maxMonth = Math.max(1, ...monthCounts.map(sumCounts));

  const stats = [
    { value: fmtNumber(total), label: 'Pessoas na base' },
    { value: fmtPct(genderTotals.homem, total), label: `Homens (${fmtNumber(genderTotals.homem)})` },
    { value: fmtPct(genderTotals.mulher, total), label: `Mulheres (${fmtNumber(genderTotals.mulher)})` },
    { value: fmtPct(genderTotals.outros, total), label: `Outros / não informado (${fmtNumber(genderTotals.outros)})` },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro de origem da base */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-cream-400">Origem:</span>
        {ORIGEM_OPTIONS.map((o) => (
          o.value === origem ? (
            <span key={o.value} className="px-2.5 py-1 rounded-lg border border-accent-400 bg-accent-400 text-surface-800 font-semibold">
              {o.label}
            </span>
          ) : (
            <Link key={o.value} href={buildHref({ origem: o.value })}
              className="px-2.5 py-1 rounded-lg border border-muted-700 text-cream-200 hover:bg-surface-700 transition">
              {o.label}
            </Link>
          )
        ))}
      </div>

      {origem === 'todos' && overlap > 0 && (
        <p className="text-cream-400 text-xs -mt-3">
          {fmtNumber(overlap)} pessoa(s) da base offline já têm cadastro na plataforma (mesmo
          telefone ou e-mail) e foram contadas uma vez só — vale o cadastro na plataforma.
        </p>
      )}

      {/* Cards de totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface-700 rounded-lg p-6 border border-muted-700">
            <Users className="text-accent-400 mb-3" size={24} />
            <p className="text-2xl font-bold text-cream-200">{stat.value}</p>
            <p className="text-sm text-cream-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Faixa etária */}
      <ChartCard
        icon={CalendarDays}
        title="Por idade"
        subtitle="Idade calculada a partir da data de nascimento do cadastro. Passe o mouse na barra para ver o detalhe por gênero (absoluto e %)."
      >
        {AGE_BRACKETS.map((b, i) => (
          <StackedBar key={b.label} label={b.label} counts={ageCounts[i]} max={maxAge} />
        ))}
        {sumCounts(ageUnknown) > 0 && (
          <StackedBar label="Não informado" counts={ageUnknown} max={maxAge} />
        )}
      </ChartCard>

      {/* Região */}
      <ChartCard
        icon={MapPin}
        title="Por região"
        subtitle="Cidade informada no cadastro (10 mais frequentes)."
      >
        {topCities.map((c) => (
          <StackedBar key={c.label} label={c.label} counts={c.counts} max={maxCity} />
        ))}
        {otherCities.length > 0 && (
          <StackedBar label={`Outras (${otherCities.length})`} counts={otherCounts} max={maxCity} />
        )}
      </ChartCard>

      {/* Aniversariantes por mês */}
      <ChartCard
        icon={Cake}
        title="Aniversariantes por mês"
        subtitle="Quantidade de cadastros que fazem aniversário em cada mês. Clique no mês na seção abaixo para ver a lista."
      >
        {MONTHS_PT.map((m, i) => (
          <StackedBar key={m} label={m} counts={monthCounts[i]} max={maxMonth} />
        ))}
      </ChartCard>

      {/* Sub-seção: aniversários do mês */}
      <div id="aniversarios" className="bg-surface-700 rounded-lg border border-muted-700 overflow-hidden">
        <div className="p-6 border-b border-muted-700">
          <div className="flex items-center gap-2 mb-1">
            <Cake className="text-accent-400" size={20} />
            <h2 className="text-cream-200 font-bold">Aniversários — {MONTHS_PT[mes - 1]}</h2>
          </div>
          <p className="text-cream-400 text-xs mb-4">
            {fmtNumber(birthdayPeople.length)} pessoa(s) fazem aniversário em {MONTHS_PT[mes - 1]}.
            O botão abre o WhatsApp com o convite pronto — é só revisar e enviar.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            {MONTHS_SHORT.map((m, i) => (
              i + 1 === mes ? (
                <span key={m} className="px-2.5 py-1 rounded-lg border border-accent-400 bg-accent-400 text-surface-800 font-semibold">
                  {m}
                </span>
              ) : (
                <Link key={m} href={buildHref({ mes: i + 1, anchor: true })}
                  className="px-2.5 py-1 rounded-lg border border-muted-700 text-cream-200 hover:bg-surface-800 transition">
                  {m}
                </Link>
              )
            ))}
          </div>
        </div>
        <AniversariosClient
          people={birthdayPeople}
          mes={mes}
          eventTitle={selectedEvent?.title ?? null}
          showOrigin={origem === 'todos'}
        />
      </div>
    </div>
  );
}
