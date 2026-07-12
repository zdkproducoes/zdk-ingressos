'use client';

// Painel público do embaixador — parte interativa (copiar link, compartilhar).
// Recebe tudo pronto e mascarado do servidor; aqui é só apresentação.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Check,
  Share2,
  Eye,
  ShoppingBag,
  Ticket,
  Wallet,
  TrendingUp,
  Trophy,
  Target,
  Gift,
  UserCheck,
  MessageCircle,
} from 'lucide-react';

export type WeeklyGoal = {
  id: string;
  title: string | null;
  weekStart: string; // 'YYYY-MM-DD'
  weekEnd: string;
  target: number;
  reward: string | null;
  myTickets: number;
  status: 'past' | 'current' | 'future';
};

export type PodiumEntry = { name: string; tickets: number; isMe: boolean };

export type PanelData = {
  name: string;
  code: string;
  isActive: boolean;
  commissionPercent: number;
  eventTitle: string;
  eventDate: string | null;
  eventTime: string | null;
  venueName: string | null;
  shareUrl: string;
  stats: {
    visits: number;
    salesCount: number;
    ticketsCount: number;
    netRevenue: number;
    commission: number;
    conversion: number | null; // % (vendas / visitas)
  };
  sales: Array<{
    buyer: string;
    net: number;
    createdAt: string;
    tickets: number; // ingressos do pedido
    checkedIn: number; // quantos já entraram
    checkinAt: string | null; // horário do último check-in do pedido
    phone: string | null; // só vem durante o evento, se ainda falta gente entrar
  }>;
  podium: PodiumEntry[]; // ranking completo do evento, já ordenado por ingressos
  myRank: number; // posição 1-based (empatados dividem a posição)
  eventGoal: { target: number; reward: string | null; myTickets: number } | null; // a grande meta
  goals: WeeklyGoal[]; // metas semanais em ordem cronológica
  eventStarted: boolean; // libera coluna de check-in, botão de WhatsApp, meta e pódio de check-in
  checkin: {
    target: number; // % de check-in exigido (75)
    myTickets: number;
    myCheckedIn: number;
    podium: Array<{ name: string; pct: number; isMe: boolean }>; // só % (sem números absolutos)
  } | null;
};

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const fmtEventDate = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(isoDate + 'T00:00:00'));

// '2026-07-01' -> '01/07'
const fmtShortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

// Posição da linha `index` do ranking (empatados dividem a posição)
const rankOf = (podium: PodiumEntry[], index: number) =>
  podium.filter((p) => p.tickets > podium[index].tickets).length + 1;

function PodiumSection({ podium, myRank }: { podium: PodiumEntry[]; myRank: number }) {
  // Pódio só faz sentido com mais de um embaixador no evento
  if (podium.length < 2) return null;

  const top3 = podium.slice(0, 3);
  const rest = podium.slice(3);
  // Visual clássico: 2º à esquerda, 1º no centro (mais alto), 3º à direita
  const order = [1, 0, 2].filter((i) => i < top3.length);
  const medal = ['🥇', '🥈', '🥉'];
  const heights = ['h-24', 'h-16', 'h-12'];

  return (
    <div className="bg-surface-700 border border-muted-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-cream-200 uppercase tracking-wider flex items-center gap-2">
          <Trophy size={16} className="text-accent-400" />
          Pódio dos embaixadores
        </h2>
      </div>
      <p className="text-xs text-cream-400 mb-5">
        Você está em <strong className="text-accent-400">{myRank}º lugar</strong> de{' '}
        {podium.length} embaixadores, por ingressos vendidos.
      </p>

      {/* Top 3 */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 mb-4">
        {order.map((i) => {
          const entry = top3[i];
          return (
            <div key={i} className="flex-1 max-w-[160px] flex flex-col items-center">
              <span className="text-2xl mb-1">{medal[i]}</span>
              <p
                className={`text-xs sm:text-sm font-semibold text-center leading-tight mb-0.5 truncate w-full ${
                  entry.isMe ? 'text-accent-400' : 'text-cream-200'
                }`}
                title={entry.name}
              >
                {entry.name}
                {entry.isMe && ' (você)'}
              </p>
              <p className="text-[11px] text-cream-400 mb-2">
                {entry.tickets} {entry.tickets === 1 ? 'ingresso' : 'ingressos'}
              </p>
              <div
                className={`w-full ${heights[i]} rounded-t-lg border border-b-0 flex items-start justify-center pt-1.5 text-sm font-bold ${
                  entry.isMe
                    ? 'bg-accent-400/20 border-accent-400/50 text-accent-400'
                    : 'bg-surface-800 border-muted-700 text-cream-300'
                }`}
              >
                {rankOf(podium, i)}º
              </div>
            </div>
          );
        })}
      </div>

      {/* Demais posições */}
      {rest.length > 0 && (
        <ul className="border-t border-muted-700 pt-3 space-y-1">
          {rest.map((entry, i) => {
            const index = i + 3;
            return (
              <li
                key={index}
                className={`flex items-center gap-3 text-sm rounded-lg px-3 py-1.5 ${
                  entry.isMe
                    ? 'bg-accent-400/10 border border-accent-400/40 text-accent-400 font-semibold'
                    : 'text-cream-300'
                }`}
              >
                <span className="w-8 text-cream-400 text-xs">{rankOf(podium, index)}º</span>
                <span className="flex-1 truncate" title={entry.name}>
                  {entry.name}
                  {entry.isMe && ' (você)'}
                </span>
                <span className="text-xs text-cream-400">
                  {entry.tickets} {entry.tickets === 1 ? 'ingresso' : 'ingressos'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GoalProgressBar({ done, target, highlight }: { done: number; target: number; highlight: boolean }) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  return (
    <div className="w-full h-3 bg-surface-800 border border-muted-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          highlight ? 'bg-accent-400' : done >= target ? 'bg-emerald-500' : 'bg-muted-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MetasSection({
  eventGoal,
  goals,
}: {
  eventGoal: PanelData['eventGoal'];
  goals: WeeklyGoal[];
}) {
  if (!eventGoal && goals.length === 0) return null;

  const current = goals.filter((g) => g.status === 'current');
  const past = goals.filter((g) => g.status === 'past');
  const future = goals.filter((g) => g.status === 'future');

  return (
    <div className="bg-surface-700 border border-muted-700 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-cream-200 uppercase tracking-wider flex items-center gap-2">
        <Target size={16} className="text-accent-400" />
        Suas metas
      </h2>

      {/* A grande meta do evento */}
      {eventGoal && (
        <div className="bg-surface-800 border border-muted-700 rounded-xl p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-cream-200">🏆 Meta do evento</p>
            <p className="text-xs text-cream-400 whitespace-nowrap">campanha inteira</p>
          </div>
          <p className="text-2xl font-bold text-cream-200 mb-2">
            {eventGoal.myTickets}{' '}
            <span className="text-sm font-medium text-cream-400">
              de {eventGoal.target} {eventGoal.target === 1 ? 'ingresso' : 'ingressos'}
            </span>
          </p>
          <GoalProgressBar done={eventGoal.myTickets} target={eventGoal.target} highlight={false} />
          <p className="text-xs mt-2 text-cream-300">
            {eventGoal.myTickets >= eventGoal.target ? (
              <>🎉 <strong>Grande meta batida!</strong> Você é destaque desta edição.</>
            ) : (
              <>
                As metas semanais abaixo quebram essa meta em partes — batendo as semanas,
                a grande meta vem junto.
              </>
            )}
          </p>
          {eventGoal.reward && (
            <p className="text-xs mt-2 text-accent-400 flex items-center gap-1.5">
              <Gift size={14} />
              Prêmio da campanha: {eventGoal.reward}
            </p>
          )}
        </div>
      )}

      {/* Meta da semana atual */}
      {current.map((g) => {
        const hit = g.myTickets >= g.target;
        return (
          <div
            key={g.id}
            className="bg-accent-400/10 border border-accent-400/40 rounded-xl p-4"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-cream-200">
                {g.title || 'Meta da semana'}
              </p>
              <p className="text-xs text-cream-400 whitespace-nowrap">
                {fmtShortDate(g.weekStart)} a {fmtShortDate(g.weekEnd)}
              </p>
            </div>
            <p className="text-2xl font-bold text-accent-400 mb-2">
              {g.myTickets}{' '}
              <span className="text-sm font-medium text-cream-400">
                de {g.target} {g.target === 1 ? 'ingresso' : 'ingressos'}
              </span>
            </p>
            <GoalProgressBar done={g.myTickets} target={g.target} highlight />
            <p className="text-xs mt-2 text-cream-300">
              {hit ? (
                <>🎉 <strong>Meta batida!</strong> Continue vendendo e suba no pódio.</>
              ) : (
                <>
                  Faltam <strong>{g.target - g.myTickets}</strong>{' '}
                  {g.target - g.myTickets === 1 ? 'ingresso' : 'ingressos'} até{' '}
                  {fmtShortDate(g.weekEnd)}. Você consegue! 💪
                </>
              )}
            </p>
            {g.reward && (
              <p className="text-xs mt-2 text-accent-400 flex items-center gap-1.5">
                <Gift size={14} />
                Prêmio da semana: {g.reward}
              </p>
            )}
          </div>
        );
      })}

      {/* Semanas anteriores */}
      {past.length > 0 && (
        <div>
          <p className="text-xs text-cream-400 uppercase tracking-wider mb-2">Semanas anteriores</p>
          <ul className="space-y-2">
            {past.map((g) => {
              const hit = g.myTickets >= g.target;
              return (
                <li key={g.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-xs text-cream-300 truncate">
                        {g.title || `${fmtShortDate(g.weekStart)} a ${fmtShortDate(g.weekEnd)}`}
                      </p>
                      <p className="text-xs text-cream-400 whitespace-nowrap">
                        {g.myTickets}/{g.target}
                      </p>
                    </div>
                    <GoalProgressBar done={g.myTickets} target={g.target} highlight={false} />
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      hit
                        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
                        : 'bg-muted-800/60 text-cream-400 border-muted-600'
                    }`}
                  >
                    {hit ? 'Batida ✓' : 'Não batida'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Próximas semanas */}
      {future.length > 0 && (
        <div>
          <p className="text-xs text-cream-400 uppercase tracking-wider mb-2">Próximas semanas</p>
          <ul className="space-y-1">
            {future.map((g) => (
              <li key={g.id} className="flex items-center justify-between text-xs text-cream-400">
                <span>
                  {g.title || 'Meta'} · começa {fmtShortDate(g.weekStart)}
                </span>
                <span>
                  {g.target} {g.target === 1 ? 'ingresso' : 'ingressos'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function CheckinSection({ checkin }: { checkin: NonNullable<PanelData['checkin']> }) {
  const { target, myTickets, myCheckedIn, podium } = checkin;
  const myPct = myTickets > 0 ? (myCheckedIn / myTickets) * 100 : 0;
  const hit = myTickets > 0 && myPct >= target;
  const medal = ['🥇', '🥈', '🥉'];
  // Empatados dividem a posição (mesma % = mesma colocação)
  const rankAt = (index: number) =>
    podium.filter((p) => p.pct > podium[index].pct).length + 1;

  return (
    <div className="bg-surface-700 border border-muted-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-cream-200 uppercase tracking-wider flex items-center gap-2">
          <UserCheck size={16} className="text-accent-400" />
          Check-in do seu público
        </h2>
        <span className="text-[11px] text-cream-400 whitespace-nowrap">
          atualiza sozinho a cada minuto
        </span>
      </div>

      {/* Meta de check-in */}
      {myTickets > 0 ? (
        <div className="bg-accent-400/10 border border-accent-400/40 rounded-xl p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-cream-200">Meta de check-in</p>
            <p className="text-xs text-cream-400 whitespace-nowrap">{target}% dos seus ingressos</p>
          </div>
          <p className="text-2xl font-bold text-accent-400 mb-2">
            {Math.round(myPct)}%{' '}
            <span className="text-sm font-medium text-cream-400">
              ({myCheckedIn} de {myTickets} {myTickets === 1 ? 'ingresso' : 'ingressos'} já entraram)
            </span>
          </p>
          {/* Barra com marcador na meta */}
          <div className="relative w-full h-3 bg-surface-800 border border-muted-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hit ? 'bg-emerald-500' : 'bg-accent-400'}`}
              style={{ width: `${Math.min(100, myPct)}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cream-200/70"
              style={{ left: `${target}%` }}
              title={`Meta: ${target}%`}
            />
          </div>
          <p className="text-xs mt-2 text-cream-300">
            {hit ? (
              <>🎉 <strong>Meta de check-in batida!</strong> Seu público veio de verdade.</>
            ) : (
              <>
                Faltam <strong>{Math.max(0, Math.ceil((target / 100) * myTickets) - myCheckedIn)}</strong>{' '}
                check-ins pra bater os {target}%. Chama quem ainda não chegou! 📲
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="text-sm text-cream-400">
          Você ainda não tem ingressos vendidos — sem meta de check-in por enquanto.
        </p>
      )}

      {/* Pódio do check-in (só %) */}
      {podium.length >= 2 && (
        <div>
          <p className="text-xs text-cream-400 uppercase tracking-wider mb-2">Pódio do check-in</p>
          <ul className="space-y-1">
            {podium.map((entry, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 text-sm rounded-lg px-3 py-1.5 ${
                  entry.isMe
                    ? 'bg-accent-400/10 border border-accent-400/40 text-accent-400 font-semibold'
                    : 'text-cream-300'
                }`}
              >
                <span className="w-8 text-cream-400 text-xs">
                  {i < 3 ? medal[i] : `${rankAt(i)}º`}
                </span>
                <span className="flex-1 truncate" title={entry.name}>
                  {entry.name}
                  {entry.isMe && ' (você)'}
                </span>
                <span className={`text-sm font-bold ${entry.isMe ? 'text-accent-400' : 'text-cream-200'}`}>
                  {Math.round(entry.pct)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-cream-400 mt-2">
            % dos ingressos vendidos por cada embaixador que já fizeram check-in.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? 'bg-accent-400/10 border-accent-400/40'
          : 'bg-surface-700 border-muted-700'
      }`}
    >
      <div className="flex items-center gap-2 text-cream-400 text-xs uppercase tracking-wider mb-2">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-accent-400' : 'text-cream-200'}`}>
        {value}
      </p>
    </div>
  );
}

export function AfiliadoPanelClient({ data }: { data: PanelData }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const { stats } = data;

  // Durante o evento, atualiza os dados sozinho: a cada 60s (só com a aba
  // visível) e imediatamente quando a pessoa volta pra aba. router.refresh()
  // rebusca no servidor sem perder o estado da página.
  useEffect(() => {
    if (!data.eventStarted) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [data.eventStarted, router]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* silencioso */
    }
  };

  const whatsappText = encodeURIComponent(
    `Garanta seu ingresso para o ${data.eventTitle} pelo meu link: ${data.shareUrl}`,
  );

  return (
    <main className="min-h-screen bg-surface-800 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div>
          <p className="text-xs uppercase tracking-widest text-accent-400 font-semibold mb-1">
            Painel do Embaixador
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-cream-200">
            Olá, {data.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-cream-400 mt-1">
            {data.eventTitle}
            {data.eventDate && <> · {fmtEventDate(data.eventDate)}</>}
            {data.eventTime && <> às {data.eventTime}</>}
            {data.venueName && <> · {data.venueName}</>}
          </p>
        </div>

        {/* Aviso de inativo */}
        {!data.isActive && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-4 py-3">
            Seu link de divulgação está <strong>desativado</strong> no momento. Novos
            cliques não estão sendo atribuídos a você — fale com a produção.
          </div>
        )}

        {/* Link de divulgação */}
        <div className="bg-surface-700 border border-muted-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cream-200 uppercase tracking-wider mb-3">
            Seu link de divulgação
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={data.shareUrl}
              onFocus={(e) => e.target.select()}
              className="flex-1 bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2.5 text-xs font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-accent-400 hover:bg-accent-500 text-surface-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition"
              >
                <Share2 size={16} />
                WhatsApp
              </a>
            </div>
          </div>
          <p className="text-xs text-cream-400 mt-2">
            Toda compra feita por quem entrou pelo seu link (válido por 30 dias) conta pra você.
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={<Eye size={14} />} label="Visitas no link" value={String(stats.visits)} />
          <StatCard icon={<ShoppingBag size={14} />} label="Vendas" value={String(stats.salesCount)} />
          <StatCard icon={<Ticket size={14} />} label="Ingressos" value={String(stats.ticketsCount)} />
          <StatCard
            icon={<TrendingUp size={14} />}
            label="Conversão"
            value={stats.conversion === null ? '—' : `${stats.conversion.toFixed(1)}%`}
          />
          <StatCard
            icon={<Wallet size={14} />}
            label="Vendas atribuídas"
            value={fmtCurrency(stats.netRevenue)}
          />
          <StatCard
            icon={<Wallet size={14} />}
            label={`Sua comissão (${data.commissionPercent}%)`}
            value={fmtCurrency(stats.commission)}
            highlight
          />
        </div>

        {/* Check-in do público (libera no horário de início do evento) */}
        {data.checkin && <CheckinSection checkin={data.checkin} />}

        {/* Metas do evento e semanais (gamificação) */}
        <MetasSection eventGoal={data.eventGoal} goals={data.goals} />

        {/* Pódio (gamificação) */}
        <PodiumSection podium={data.podium} myRank={data.myRank} />

        {/* Últimas vendas */}
        <div className="bg-surface-700 border border-muted-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cream-200 uppercase tracking-wider mb-4">
            Últimas vendas
          </h2>
          {data.sales.length === 0 ? (
            <p className="text-center text-cream-400 py-6 text-sm">
              Nenhuma venda ainda. Compartilhe seu link e acompanhe por aqui! 🚀
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-cream-400 text-xs uppercase tracking-wider border-b border-muted-700">
                  <tr>
                    <th className="text-left py-2">Quando</th>
                    <th className="text-left py-2">Comprador</th>
                    <th className="text-right py-2">Valor</th>
                    {data.eventStarted && <th className="text-right py-2">Check-in</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((s, i) => (
                    <tr key={i} className="border-b border-muted-700/50">
                      <td className="py-2 text-cream-300 whitespace-nowrap">
                        {fmtDateTime(s.createdAt)}
                      </td>
                      <td className="py-2 text-cream-200">{s.buyer}</td>
                      <td className="py-2 text-right text-cream-300">{fmtCurrency(s.net)}</td>
                      {data.eventStarted && (
                        <td className="py-2">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {s.tickets > 0 && s.checkedIn === s.tickets ? (
                              <span className="text-emerald-300 text-xs">
                                {s.tickets > 1 && `${s.checkedIn}/${s.tickets} `}✓{' '}
                                {s.checkinAt && fmtTime(s.checkinAt)}
                              </span>
                            ) : s.checkedIn > 0 ? (
                              <span className="text-accent-400 text-xs">
                                {s.checkedIn}/{s.tickets} ✓ {s.checkinAt && fmtTime(s.checkinAt)}
                              </span>
                            ) : (
                              <span className="text-cream-400 text-xs">ainda não</span>
                            )}
                            {s.phone && (
                              <a
                                href={`https://wa.me/55${s.phone}?text=${encodeURIComponent(
                                  `Oi, ${s.buyer.split(' ')[0]}! Aqui é ${data.name.split(' ')[0]}, do ${data.eventTitle} 🎉 Já começou e tô te esperando aqui — bora?`,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chamar no WhatsApp quem ainda não chegou"
                                className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1 rounded transition"
                              >
                                <MessageCircle size={12} />
                                Chamar
                              </a>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.sales.length === 30 && (
                <p className="text-xs text-cream-400 mt-3 text-center">
                  Mostrando as 30 mais recentes.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-cream-400 text-center">
          Valores de comissão calculados sobre o valor líquido (sem taxa de serviço).
          O acerto é combinado diretamente com a produção. Não compartilhe o link desta página.
        </p>
      </div>
    </main>
  );
}
