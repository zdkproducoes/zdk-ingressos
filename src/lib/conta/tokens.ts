// Tokens de troca de e-mail/celular da área do cliente.
// O valor bruto (link ou código de 6 dígitos) nunca é salvo — só o sha256.
import { createHash, randomBytes, randomInt } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function newEmailToken(): string {
  return randomBytes(32).toString('hex');
}

export function newPhoneCode(): string {
  return String(randomInt(100000, 1000000)); // 6 dígitos
}

const TTL_MINUTES: Record<'email' | 'phone', number> = { email: 60 * 24, phone: 10 };

/** Invalida pendências anteriores do mesmo tipo e cria um novo token. */
export async function createChangeToken(
  userId: string,
  kind: 'email' | 'phone',
  newValue: string,
  rawToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await supabaseAdmin
    .from('account_change_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('kind', kind)
    .is('used_at', null);

  const { error } = await supabaseAdmin.from('account_change_tokens').insert({
    user_id: userId,
    kind,
    new_value: newValue,
    token_hash: sha256(rawToken),
    expires_at: new Date(Date.now() + TTL_MINUTES[kind] * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const MAX_ATTEMPTS = 5;

type ConsumeResult =
  | { ok: true; userId: string; newValue: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'too_many_attempts' | 'wrong_code' };

/** Consome um token de e-mail pelo valor bruto (link clicado). */
export async function consumeEmailToken(rawToken: string): Promise<ConsumeResult> {
  const { data: row } = await supabaseAdmin
    .from('account_change_tokens')
    .select('id, user_id, new_value, expires_at')
    .eq('kind', 'email')
    .eq('token_hash', sha256(rawToken))
    .is('used_at', null)
    .maybeSingle();

  if (!row) return { ok: false, reason: 'not_found' };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };

  await supabaseAdmin
    .from('account_change_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);

  return { ok: true, userId: row.user_id, newValue: row.new_value };
}

/** Valida o código de 6 dígitos do celular (com limite de tentativas). */
export async function consumePhoneCode(userId: string, code: string): Promise<ConsumeResult> {
  const { data: row } = await supabaseAdmin
    .from('account_change_tokens')
    .select('id, user_id, new_value, token_hash, attempts, expires_at')
    .eq('kind', 'phone')
    .eq('user_id', userId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, reason: 'not_found' };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

  if (row.token_hash !== sha256(code)) {
    await supabaseAdmin
      .from('account_change_tokens')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);
    return { ok: false, reason: row.attempts + 1 >= MAX_ATTEMPTS ? 'too_many_attempts' : 'wrong_code' };
  }

  await supabaseAdmin
    .from('account_change_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);

  return { ok: true, userId: row.user_id, newValue: row.new_value };
}
