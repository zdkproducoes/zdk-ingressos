// lib/turnstile/ratelimit.ts
// Rate limiter simples baseado em PostgreSQL
import { supabaseAdmin } from '@/lib/supabase/admin';

const WINDOW_MINUTES = 60;

/**
 * Retorna true se a requisição está DENTRO do limite (pode prosseguir).
 * Retorna false se EXCEDEU o limite (bloquear).
 */
export async function checkRateLimit(identifier: string, maxRequests: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // Limpa janelas antigas (fire-and-forget)
  supabaseAdmin.from('rate_limits').delete().lt('window_start', windowStart).then();

  // Conta tentativas na janela atual
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('id, count, window_start')
    .eq('identifier', identifier)
    .gte('window_start', windowStart)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('rate_limit check', error); return true; }

  if (!data) {
    await supabaseAdmin.from('rate_limits').insert({ identifier, count: 1 });
    return true;
  }

  if (data.count >= maxRequests) return false;

  await supabaseAdmin.from('rate_limits').update({ count: data.count + 1 }).eq('id', data.id);
  return true;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
