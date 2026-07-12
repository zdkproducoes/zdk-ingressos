// Constantes e helpers compartilhados da aba Público (server e client).
import { platform } from '@/lib/config';

// Paleta de séries validada (skill dataviz) sobre a superfície surface-700 #16181F:
// passa faixa de luminosidade, croma, separação CVD e contraste >= 3:1.
export const SERIES = {
  homem:  { label: 'Homens',   color: '#4485C4' },
  mulher: { label: 'Mulheres', color: '#B8619B' },
  outros: { label: 'Outros / não informado', color: '#BD8028' },
} as const;
export type SeriesKey = keyof typeof SERIES;
export const SERIES_KEYS: SeriesKey[] = ['homem', 'mulher', 'outros'];

export function genderKey(g: string | null): SeriesKey {
  if (g === 'masculino') return 'homem';
  if (g === 'feminino') return 'mulher';
  return 'outros';
}

export type Origem = 'online' | 'offline';

export const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function fmtPhone(phone: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone ?? '—';
}

// Aniversariante enviado da página (server) para o componente client
export type Aniversariante = {
  id: string;
  name: string;
  firstName: string;
  day: number;
  ageTurning: number;
  gender: SeriesKey;
  phone: string | null;
  origin: Origem;
};

export const DEFAULT_BIRTHDAY_TEMPLATE =
  `Olá {nome}! 🎉 Aqui é da equipe do ${platform.name}. Vimos que você faz aniversário em {mes} e queremos te convidar pra comemorar com a gente no {evento}! 🎂`;

// Monta a mensagem substituindo os placeholders {nome}, {mes}, {evento}, {idade}
export function fillTemplate(
  template: string,
  vars: { nome: string; mes: string; evento: string; idade: number },
): string {
  return template
    .replaceAll('{nome}', vars.nome)
    .replaceAll('{mes}', vars.mes)
    .replaceAll('{evento}', vars.evento)
    .replaceAll('{idade}', String(vars.idade));
}

// wa.me: null se o telefone não servir (menos de 10 dígitos)
export function waHref(phone: string | null, message: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const intl = digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
