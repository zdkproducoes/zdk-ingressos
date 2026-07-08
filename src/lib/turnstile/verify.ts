// lib/turnstile/verify.ts
// Valida o token do Cloudflare Turnstile no servidor

export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY não configurado — pulando validação');
    return true; // dev mode
  }
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('turnstile verify error', err);
    return false;
  }
}
