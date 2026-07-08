// components/auth/SignupForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Eye, EyeOff } from 'lucide-react';
import { ErrorModal } from '@/components/ui/ErrorModal';
import { LegalModal } from '@/components/legal/LegalModal';
import { TermosContent } from '@/components/legal/TermosContent';
import { PrivacidadeContent } from '@/components/legal/PrivacidadeContent';

declare global { interface Window { turnstile?: any } }

type FormState = {
  firstName: string; lastName: string; email: string; emailConfirm: string; phone: string; cpf: string;
  birthDate: string; gender: string; city: string; neighborhood: string; state: string;
  referralSource: string; password: string; passwordConfirm: string;
  marketingConsent: boolean; termsAccepted: boolean;
};

const INITIAL: FormState = {
  firstName:'',lastName:'',email:'',emailConfirm:'',phone:'',cpf:'',birthDate:'',gender:'',city:'',
  neighborhood:'',state:'SP',referralSource:'',password:'',passwordConfirm:'',
  marketingConsent:false,termsAccepted:false,
};

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [showTermosModal, setShowTermosModal] = useState(false);
  const [showPrivacidadeModal, setShowPrivacidadeModal] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!turnstileLoaded || !siteKey || !turnstileRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      'error-callback': () => setTurnstileToken(''),
      'expired-callback': () => setTurnstileToken(''),
      theme: 'dark',
    });
  }, [turnstileLoaded, siteKey]);

  // Cooldown de reenvio
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(p => ({ ...p, [key]: value }));
    if (errors[key as string]) setErrors(e => ({ ...e, [key as string]: '' }));
  }

  function validate(): boolean {
    const e: Record<string,string> = {};
    if (form.firstName.trim().length < 2) e.firstName = 'Informe seu nome';
    if (form.lastName.trim().length < 2) e.lastName = 'Informe seu sobrenome';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido';
    if (!form.emailConfirm) e.emailConfirm = 'Confirme seu e-mail';
    else if (form.email !== form.emailConfirm) e.emailConfirm = 'Os e-mails não coincidem';
    if (!isValidCPF(form.cpf)) e.cpf = 'CPF inválido';
    if (form.phone.replace(/\D/g,'').length < 10) e.phone = 'Telefone inválido';
    if (!form.birthDate) e.birthDate = 'Informe sua data de nascimento';
    else {
      const age = ageFrom(form.birthDate);
      if (age < 13) e.birthDate = 'Você precisa ter pelo menos 13 anos';
      if (age > 120) e.birthDate = 'Data inválida';
    }
    if (!form.gender) e.gender = 'Selecione uma opção';
    if (!form.city.trim()) e.city = 'Informe sua cidade';
    if (!form.referralSource) e.referralSource = 'Selecione uma opção';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (form.password !== form.passwordConfirm) e.passwordConfirm = 'Senhas não coincidem';
    if (!form.termsAccepted) e.termsAccepted = 'Você precisa aceitar os termos';
    if (siteKey && !turnstileToken) e._form = 'Aguarde a verificação anti-robô concluir';

    // Se sobrou algum erro, garante um aviso em pop-up (ErrorModal). Sem isso, o
    // usuário clica em "Criar conta" e parece que nada acontece, porque os erros
    // ficam destacados lá em cima no formulário, fora da vista de quem está no botão.
    if (Object.keys(e).length > 0 && !e._form) {
      if (e.emailConfirm === 'Os e-mails não coincidem') {
        e._form = 'Os e-mails não coincidem. Confira o campo "E-mail" e o "Confirmar e-mail".';
      } else {
        e._form = 'Há campos a corrigir. Veja os itens destacados em vermelho no formulário.';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, cpf: form.cpf.replace(/\D/g,''), phone: form.phone.replace(/\D/g,''),
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ _form: data.error || 'Erro ao criar conta' });
        if (siteKey && widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        setTurnstileToken('');
        return;
      }
      setSuccess(true);
      setResendCooldown(60);
    } catch {
      setErrors({ _form: 'Erro de conexão. Tente novamente.' });
    } finally { setLoading(false); }
  }

  async function resendEmail() {
    if (resendCooldown > 0) return;
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setResendCooldown(data.cooldown || 60);
    } catch {}
  }

  if (success) {
    return (
      <div className="rounded-xl bg-emerald-950 border border-emerald-800 p-6 text-center">
        <div className="text-4xl mb-3">📧</div>
        <h2 className="text-xl font-bold text-emerald-100 mb-2">Quase lá!</h2>
        <p className="text-emerald-200 text-sm leading-relaxed">
          Enviamos um link de confirmação para <strong>{form.email}</strong>.
          Abra seu e-mail e clique no botão para ativar sua conta.
        </p>
        <p className="mt-3 text-xs text-emerald-300/70">Link válido por 24h. Verifique também a caixa de spam.</p>
        <div className="mt-4 pt-4 border-t border-emerald-800/50">
          <button
            type="button" onClick={resendEmail} disabled={resendCooldown > 0}
            className="text-sm text-emerald-300 hover:text-emerald-100 underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
          >
            {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar e-mail'}
          </button>
        </div>
        <Link href="/login" className="block mt-4 text-xs text-emerald-200/70 hover:text-emerald-100">
          Já confirmei → Ir para login
        </Link>
      </div>
    );
  }

  return (
    <>
      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async defer
          onLoad={() => setTurnstileLoaded(true)}
        />
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorModal
          open={!!errors._form}
          message={errors._form || ''}
          onClose={() => setErrors(e => ({ ...e, _form: '' }))}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome" error={errors.firstName}>
            <input type="text" autoComplete="given-name" value={form.firstName}
              onChange={e => update('firstName', e.target.value)} className={cls(errors.firstName)} placeholder="João" />
          </Field>
          <Field label="Sobrenome" error={errors.lastName}>
            <input type="text" autoComplete="family-name" value={form.lastName}
              onChange={e => update('lastName', e.target.value)} className={cls(errors.lastName)} placeholder="Silva" />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="E-mail" error={errors.email}>
            <input type="email" autoComplete="email" inputMode="email" value={form.email}
              onChange={e => { update('email', e.target.value.toLowerCase().trim()); setEmailSuggestion(null); }}
              onBlur={() => setEmailSuggestion(suggestEmail(form.email))}
              className={cls(errors.email)} placeholder="voce@email.com" />
            {emailSuggestion && (
              <button type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { update('email', emailSuggestion); setEmailSuggestion(null); }}
                className="mt-1.5 block text-left text-xs text-amber-sacode-300 hover:text-amber-sacode-200">
                Você quis dizer <span className="font-semibold underline">{emailSuggestion}</span>?
              </button>
            )}
          </Field>
          <Field label="Confirmar e-mail" error={errors.emailConfirm}>
            <input type="email" autoComplete="off" inputMode="email" value={form.emailConfirm}
              onChange={e => update('emailConfirm', e.target.value.toLowerCase().trim())}
              onPaste={e => e.preventDefault()}
              className={cls(errors.emailConfirm)} placeholder="Digite o e-mail novamente" />
            <p className="mt-1 text-xs text-cream-400/70">Por segurança, digite novamente (não dá pra colar).</p>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="CPF" error={errors.cpf}>
            <input type="text" inputMode="numeric" value={maskCPF(form.cpf)}
              onChange={e => update('cpf', e.target.value)} className={cls(errors.cpf)} placeholder="000.000.000-00" maxLength={14} />
          </Field>
          <Field label="Celular (com DDD)" error={errors.phone}>
            <input type="tel" autoComplete="tel" inputMode="tel" value={maskPhone(form.phone)}
              onChange={e => update('phone', e.target.value)} className={cls(errors.phone)} placeholder="(11) 99999-9999" maxLength={15} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Data de nascimento" error={errors.birthDate}>
            <input type="date" autoComplete="bday" value={form.birthDate}
              onChange={e => update('birthDate', e.target.value)} className={cls(errors.birthDate)}
              max={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label="Gênero" error={errors.gender}>
            <select value={form.gender} onChange={e => update('gender', e.target.value)} className={cls(errors.gender)}>
              <option value="">Selecione…</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="nao_binario">Não-binário</option>
              <option value="outro">Outro</option>
              <option value="prefiro_nao_dizer">Prefiro não dizer</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Cidade" error={errors.city}>
            <input type="text" autoComplete="address-level2" value={form.city}
              onChange={e => update('city', e.target.value)} className={cls(errors.city)} placeholder="São Paulo" />
          </Field>
          <Field label="Bairro">
            <input type="text" autoComplete="address-level3" value={form.neighborhood}
              onChange={e => update('neighborhood', e.target.value)} className={cls()} placeholder="Centro" />
          </Field>
          <Field label="UF">
            <select value={form.state} onChange={e => update('state', e.target.value)} className={cls()}>
              {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Como conheceu o evento?" error={errors.referralSource}>
          <select value={form.referralSource} onChange={e => update('referralSource', e.target.value)} className={cls(errors.referralSource)}>
            <option value="">Selecione…</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="amigo">Indicação de amigo</option>
            <option value="google">Google</option>
            <option value="youtube">YouTube</option>
            <option value="outdoor">Outdoor / cartaz</option>
            <option value="radio">Rádio</option>
            <option value="outro">Outro</option>
          </select>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Senha" error={errors.password}>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password}
                onChange={e => update('password', e.target.value)} className={`${cls(errors.password)} pr-10`} placeholder="Mínimo 8 caracteres" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-cream-400 hover:text-amber-sacode-300 transition">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <Field label="Confirmar senha" error={errors.passwordConfirm}>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={form.passwordConfirm}
                onChange={e => update('passwordConfirm', e.target.value)} className={`${cls(errors.passwordConfirm)} pr-10`} />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-cream-400 hover:text-amber-sacode-300 transition">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
        </div>

        <div className="space-y-2 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.marketingConsent}
              onChange={e => update('marketingConsent', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-mauve-600 bg-wine-700 text-amber-sacode-400 focus:ring-amber-sacode-400" />
            <span className="text-sm text-cream-300">Quero receber novidades sobre eventos e promoções por e-mail.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.termsAccepted}
              onChange={e => update('termsAccepted', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-mauve-600 bg-wine-700 text-amber-sacode-400 focus:ring-amber-sacode-400" />
            <span className="text-sm text-cream-300">
              Li e aceito os{' '}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowTermosModal(true); }}
                className="text-amber-sacode-400 underline hover:text-amber-sacode-300"
              >
                Termos de Uso
              </button>
              {' '}e a{' '}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowPrivacidadeModal(true); }}
                className="text-amber-sacode-400 underline hover:text-amber-sacode-300"
              >
                Política de Privacidade
              </button>
              .
            </span>
          </label>
          {errors.termsAccepted && <p className="text-xs text-red-400">{errors.termsAccepted}</p>}
        </div>

        {siteKey && (
          <div className="flex justify-center pt-2">
            <div ref={turnstileRef}></div>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 disabled:opacity-50 disabled:cursor-not-allowed text-wine-800 font-semibold py-3 px-6 transition">
          {loading ? 'Criando conta…' : 'Criar minha conta'}
        </button>

        <p className="text-center text-sm text-cream-400 pt-2">
          Já tem conta? <Link href="/login" className="text-amber-sacode-400 hover:text-amber-sacode-300 underline">Fazer login</Link>
        </p>
      </form>

      <LegalModal
        open={showTermosModal}
        title="Termos de Uso e Condições de Compra"
        onClose={() => setShowTermosModal(false)}
      >
        <TermosContent darkBg={true} />
      </LegalModal>

      <LegalModal
        open={showPrivacidadeModal}
        title="Política de Privacidade"
        onClose={() => setShowPrivacidadeModal(false)}
      >
        <PrivacidadeContent darkBg={true} />
      </LegalModal>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-cream-200 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function cls(error?: string): string {
  const base = 'w-full rounded-lg bg-wine-700 border px-3 py-2.5 text-cream-200 placeholder:text-cream-400 focus:outline-none focus:ring-2 transition';
  return error ? `${base} border-red-700 focus:ring-red-600` : `${base} border-mauve-600 focus:border-amber-sacode-400 focus:ring-amber-sacode-400/30`;
}

// --- Detector de erro de digitação no e-mail ("você quis dizer ...?") ---
const POPULAR_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
  'icloud.com', 'live.com', 'hotmail.com.br', 'outlook.com.br',
  'bol.com.br', 'uol.com.br', 'terra.com.br', 'globo.com', 'ig.com.br',
];
const POPULAR_SLDS = ['gmail', 'hotmail', 'outlook', 'yahoo', 'icloud', 'live', 'bol', 'uol', 'terra', 'globo', 'ig'];
const POPULAR_TLDS = ['com', 'com.br', 'br', 'net', 'org', 'net.br', 'org.br', 'edu.br'];
const FORCE_COM_SLDS = ['gmail', 'outlook', 'icloud', 'live']; // provedores que só usam .com

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function closestMatch(value: string, list: string[], maxDist: number): string | null {
  let best: string | null = null;
  let bestDist = maxDist + 1;
  for (const item of list) {
    if (item === value) return null; // já é exato → sem sugestão
    const dist = levenshtein(value, item);
    if (dist < bestDist) { bestDist = dist; best = item; }
  }
  return bestDist <= maxDist ? best : null;
}

function suggestEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1 || at === e.length - 1) return null;     // sem @ ou sem domínio
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!domain.includes('.')) return null;             // domínio incompleto

  if (POPULAR_DOMAINS.includes(domain)) return null;  // domínio já é válido

  // 1) domínio inteiro próximo de um popular (até 2 toques de diferença)
  const whole = closestMatch(domain, POPULAR_DOMAINS, 2);
  if (whole) return `${local}@${whole}`;

  // 2) conserto por partes: provedor (sld) + final (tld)
  const dot = domain.indexOf('.');
  const sld = domain.slice(0, dot);
  const tld = domain.slice(dot + 1);
  const finalSld = POPULAR_SLDS.includes(sld) ? sld : (closestMatch(sld, POPULAR_SLDS, 1) || sld);
  let finalTld = POPULAR_TLDS.includes(tld) ? tld : (closestMatch(tld, POPULAR_TLDS, 1) || tld);
  if (FORCE_COM_SLDS.includes(finalSld) && finalTld !== 'com') finalTld = 'com';

  if (finalSld !== sld || finalTld !== tld) return `${local}@${finalSld}.${finalTld}`;
  return null;
}

function maskCPF(v: string): string {
  return v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}
function maskPhone(v: string): string {
  const d = v.replace(/\D/g,'').slice(0,11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3').trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3').trim();
}
function isValidCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g,'');
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i])*(10-i);
  let r = 11 - (s % 11); if (r >= 10) r = 0;
  if (r !== parseInt(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i])*(11-i);
  r = 11 - (s % 11); if (r >= 10) r = 0;
  return r === parseInt(c[10]);
}
function ageFrom(d: string): number {
  const b = new Date(d), t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
