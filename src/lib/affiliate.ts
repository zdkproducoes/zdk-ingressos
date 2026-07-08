// Helper centralizado pro cookie de afiliado (last-click wins, 30 dias).
// Lado client: setAffiliateCookieClient
// Lado server (Route Handlers / Server Components): getAffiliateCookieServer

const COOKIE_NAME = 'sacode_ref';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export const AFFILIATE_COOKIE_NAME = COOKIE_NAME;
export const AFFILIATE_COOKIE_MAX_AGE = MAX_AGE_SECONDS;

/**
 * Seta o cookie no browser. Last-click wins: sempre sobrescreve.
 * Path=/ pra ser lido em qualquer rota. SameSite=Lax pra funcionar
 * em redirects normais mas bloquear CSRF basico.
 */
export function setAffiliateCookieClient(code: string) {
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(code);
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

/**
 * Le o cookie no browser. Retorna null se nao existir.
 */
export function getAffiliateCookieClient(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Le o cookie do lado server (Route Handler ou Server Component).
 * Importa cookies() do next/headers no caller pra evitar problemas
 * de "cookies fora de request scope".
 */
export function readAffiliateCodeFromHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}