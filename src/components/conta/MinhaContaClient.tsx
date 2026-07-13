'use client';

// Área do cliente — seções: dados pessoais (CPF travado), e-mail (troca com
// revalidação no endereço novo), celular (código por SMS/WhatsApp), senha
// (exige a atual) e privacidade (exportar dados, sair de todos os aparelhos).
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Mail, Smartphone, KeyRound, ShieldCheck, Download, LogOut, AlertCircle, Check,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { platform } from '@/lib/config';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  cpf: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  marketing_consent: boolean;
};

const inputCls =
  'w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400';
const labelCls = 'block text-sm text-cream-300 mb-1';
const btnGold =
  'px-5 py-2.5 rounded-lg bg-accent-400 hover:bg-accent-300 disabled:opacity-50 text-surface-900 font-semibold text-sm transition';

function fmtCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

function fmtPhone(phone: string | null) {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

const EMAIL_TROCA_MSG: Record<string, { ok: boolean; text: string }> = {
  ok:        { ok: true,  text: 'E-mail atualizado com sucesso! Use o novo endereço no próximo login.' },
  expirado:  { ok: false, text: 'O link de confirmação expirou. Solicite a troca de e-mail novamente.' },
  invalido:  { ok: false, text: 'Link de confirmação inválido ou já utilizado.' },
  em_uso:    { ok: false, text: 'Este e-mail já está em uso em outra conta.' },
  erro:      { ok: false, text: 'Não foi possível concluir a troca. Tente novamente.' },
};

function Section({ icon: Icon, title, subtitle, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-700 border border-muted-700 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon className="w-5 h-5 stroke-accent-400" />
        <h2 className="font-display text-lg text-cream-200">{title}</h2>
      </div>
      {subtitle && <p className="text-[13px] text-cream-400 mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 mb-4 border ${
      msg.ok
        ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-200'
        : 'bg-red-900/30 border-red-700/50 text-red-200'
    }`}>
      {msg.ok ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
      <span>{msg.text}</span>
    </div>
  );
}

export function MinhaContaClient({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const emailTrocaStatus = params.get('email_troca');

  // ---- dados pessoais ----
  const [dados, setDados] = useState({
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    birth_date: profile.birth_date ?? '',
    gender: profile.gender ?? '',
    city: profile.city ?? '',
    neighborhood: profile.neighborhood ?? '',
    state: profile.state ?? '',
    marketing_consent: profile.marketing_consent,
  });
  const [dadosMsg, setDadosMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dadosSaving, setDadosSaving] = useState(false);

  // ---- e-mail ----
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(
    emailTrocaStatus ? EMAIL_TROCA_MSG[emailTrocaStatus] ?? null : null,
  );
  const [emailSaving, setEmailSaving] = useState(false);

  // ---- celular ----
  const [phoneForm, setPhoneForm] = useState({ new_phone: '', channel: 'sms' as 'sms' | 'whatsapp', code: '' });
  const [phoneStep, setPhoneStep] = useState<'idle' | 'code'>('idle');
  const [phoneMsg, setPhoneMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [currentPhone, setCurrentPhone] = useState(profile.phone);

  // ---- senha ----
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  async function call(url: string, method: string, body: unknown) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  }

  const saveDados = async () => {
    setDadosMsg(null);
    setDadosSaving(true);
    const { ok, json } = await call('/api/conta/perfil', 'PATCH', dados);
    setDadosMsg(ok ? { ok: true, text: 'Dados atualizados!' } : { ok: false, text: json.error ?? 'Erro ao salvar.' });
    setDadosSaving(false);
    if (ok) router.refresh();
  };

  const solicitarEmail = async () => {
    setEmailMsg(null);
    setEmailSaving(true);
    const { ok, json } = await call('/api/conta/email/solicitar', 'POST', emailForm);
    setEmailMsg(ok
      ? { ok: true, text: `Link de confirmação enviado para ${json.sent_to}. A troca só vale depois do clique — confira a caixa de entrada (e o spam).` }
      : { ok: false, text: json.error ?? 'Erro ao solicitar.' });
    setEmailSaving(false);
    if (ok) setEmailForm({ new_email: '', password: '' });
  };

  const solicitarTelefone = async () => {
    setPhoneMsg(null);
    setPhoneSaving(true);
    const { ok, json } = await call('/api/conta/telefone/solicitar', 'POST', {
      new_phone: phoneForm.new_phone, channel: phoneForm.channel,
    });
    if (ok) {
      setPhoneStep('code');
      setPhoneMsg({
        ok: true,
        text: json.dev_code
          ? `[modo dev] Código: ${json.dev_code}`
          : `Código enviado por ${json.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} para o número informado.`,
      });
    } else {
      setPhoneMsg({ ok: false, text: json.error ?? 'Erro ao enviar o código.' });
    }
    setPhoneSaving(false);
  };

  const confirmarTelefone = async () => {
    setPhoneMsg(null);
    setPhoneSaving(true);
    const { ok, json } = await call('/api/conta/telefone/confirmar', 'POST', { code: phoneForm.code });
    if (ok) {
      setCurrentPhone(json.phone);
      setPhoneStep('idle');
      setPhoneForm({ new_phone: '', channel: phoneForm.channel, code: '' });
      setPhoneMsg({ ok: true, text: 'Celular atualizado!' });
      router.refresh();
    } else {
      setPhoneMsg({ ok: false, text: json.error ?? 'Código inválido.' });
    }
    setPhoneSaving(false);
  };

  const savePw = async () => {
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: 'A confirmação não confere com a nova senha.' });
      return;
    }
    setPwSaving(true);
    const { ok, json } = await call('/api/conta/senha', 'POST', {
      current_password: pwForm.current, new_password: pwForm.next,
    });
    setPwMsg(ok
      ? { ok: true, text: 'Senha alterada! Redirecionando para o login…' }
      : { ok: false, text: json.error ?? 'Erro ao alterar.' });
    setPwSaving(false);
    if (ok) {
      setPwForm({ current: '', next: '', confirm: '' });
      // A troca de senha revoga todas as sessões (comportamento do Supabase)
      setTimeout(() => { window.location.href = '/login?redirect=/minha-conta'; }, 1800);
    }
  };

  const sairDeTudo = async () => {
    if (!confirm('Sair da sua conta em TODOS os aparelhos (inclusive este)?')) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/login';
  };

  return (
    <div>
      {/* ---- Dados pessoais ---- */}
      <Section icon={User} title="Dados pessoais">
        <Feedback msg={dadosMsg} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome *</label>
            <input type="text" value={dados.first_name} onChange={(e) => setDados((f) => ({ ...f, first_name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sobrenome</label>
            <input type="text" value={dados.last_name} onChange={(e) => setDados((f) => ({ ...f, last_name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>CPF</label>
            <input type="text" value={fmtCpf(profile.cpf)} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
            <p className="text-xs text-cream-500 mt-1">
              O CPF identifica seus ingressos e não pode ser alterado. Precisa corrigir? Fale com{' '}
              <a href={`mailto:${platform.legal.privacyEmail}`} className="text-accent-300 underline">{platform.legal.privacyEmail}</a>.
            </p>
          </div>
          <div>
            <label className={labelCls}>Data de nascimento</label>
            <input type="date" value={dados.birth_date} onChange={(e) => setDados((f) => ({ ...f, birth_date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Gênero</label>
            <select value={dados.gender} onChange={(e) => setDados((f) => ({ ...f, gender: e.target.value }))} className={inputCls}>
              <option value="">Prefiro não informar</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="nao_binario">Não binário</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="grid grid-cols-[1fr_70px] gap-3">
            <div>
              <label className={labelCls}>Cidade</label>
              <input type="text" value={dados.city} onChange={(e) => setDados((f) => ({ ...f, city: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <input type="text" maxLength={2} value={dados.state} onChange={(e) => setDados((f) => ({ ...f, state: e.target.value.toUpperCase() }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Bairro</label>
            <input type="text" value={dados.neighborhood} onChange={(e) => setDados((f) => ({ ...f, neighborhood: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={dados.marketing_consent}
            onChange={(e) => setDados((f) => ({ ...f, marketing_consent: e.target.checked }))}
            className="mt-0.5 accent-[#D9A63F]"
          />
          <span className="text-sm text-cream-300">
            Quero receber novidades de eventos da região por e-mail/WhatsApp.
          </span>
        </label>
        <div className="mt-5">
          <button onClick={saveDados} disabled={dadosSaving} className={btnGold}>
            {dadosSaving ? 'Salvando…' : 'Salvar dados'}
          </button>
        </div>
      </Section>

      {/* ---- E-mail ---- */}
      <Section
        icon={Mail}
        title="E-mail de acesso"
        subtitle={`Atual: ${email}. Para trocar, confirmamos o endereço novo com um link — a troca só acontece após a validação.`}
      >
        <Feedback msg={emailMsg} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Novo e-mail</label>
            <input type="email" value={emailForm.new_email} onChange={(e) => setEmailForm((f) => ({ ...f, new_email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Sua senha (por segurança)</label>
            <input type="password" autoComplete="current-password" value={emailForm.password} onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="mt-5">
          <button onClick={solicitarEmail} disabled={emailSaving || !emailForm.new_email || !emailForm.password} className={btnGold}>
            {emailSaving ? 'Enviando…' : 'Enviar link de confirmação'}
          </button>
        </div>
      </Section>

      {/* ---- Celular ---- */}
      <Section
        icon={Smartphone}
        title="Celular"
        subtitle={`Atual: ${fmtPhone(currentPhone)}. Para trocar, enviamos um código de 6 dígitos para o número novo.`}
      >
        <Feedback msg={phoneMsg} />
        {phoneStep === 'idle' ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Novo celular (DDD + número)</label>
                <input type="tel" placeholder="(11) 91234-5678" value={phoneForm.new_phone} onChange={(e) => setPhoneForm((f) => ({ ...f, new_phone: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Receber o código por</label>
                <div className="flex gap-2">
                  {(['sms', 'whatsapp'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setPhoneForm((f) => ({ ...f, channel: ch }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm border transition ${
                        phoneForm.channel === ch
                          ? 'bg-accent-400 border-accent-400 text-surface-900 font-bold'
                          : 'bg-surface-800 border-muted-600 text-cream-300'
                      }`}
                    >
                      {ch === 'sms' ? 'SMS' : 'WhatsApp'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <button onClick={solicitarTelefone} disabled={phoneSaving || !phoneForm.new_phone} className={btnGold}>
                {phoneSaving ? 'Enviando…' : 'Enviar código'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="max-w-xs">
              <label className={labelCls}>Código de 6 dígitos</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={phoneForm.code}
                onChange={(e) => setPhoneForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, '') }))}
                className={`${inputCls} font-mono text-lg tracking-[0.4em] text-center`}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={confirmarTelefone} disabled={phoneSaving || phoneForm.code.length !== 6} className={btnGold}>
                {phoneSaving ? 'Confirmando…' : 'Confirmar código'}
              </button>
              <button
                onClick={() => { setPhoneStep('idle'); setPhoneMsg(null); }}
                className="px-4 py-2.5 rounded-lg border border-muted-600 text-cream-300 hover:bg-surface-800 text-sm transition"
              >
                Trocar número
              </button>
            </div>
          </>
        )}
      </Section>

      {/* ---- Senha ---- */}
      <Section icon={KeyRound} title="Senha" subtitle="Mínimo de 8 caracteres. Por segurança, a troca encerra todas as sessões — você fará login de novo.">
        <Feedback msg={pwMsg} />
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Senha atual</label>
            <input type="password" autoComplete="current-password" value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nova senha</label>
            <input type="password" autoComplete="new-password" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Confirmar nova senha</label>
            <input type="password" autoComplete="new-password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="mt-5">
          <button onClick={savePw} disabled={pwSaving || !pwForm.current || !pwForm.next} className={btnGold}>
            {pwSaving ? 'Alterando…' : 'Alterar senha'}
          </button>
        </div>
      </Section>

      {/* ---- Privacidade e segurança ---- */}
      <Section icon={ShieldCheck} title="Privacidade e segurança">
        <div className="space-y-3">
          <a
            href="/api/conta/exportar"
            className="flex items-center gap-2.5 text-sm text-cream-300 hover:text-accent-300 transition"
          >
            <Download className="w-4 h-4 stroke-accent-400" />
            Baixar meus dados (LGPD) — perfil, pedidos e ingressos em JSON
          </a>
          <button
            onClick={sairDeTudo}
            className="flex items-center gap-2.5 text-sm text-cream-300 hover:text-accent-300 transition"
          >
            <LogOut className="w-4 h-4 stroke-accent-400" />
            Sair de todos os aparelhos (encerra todas as sessões)
          </button>
          <p className="text-[13px] text-cream-500 pt-2 border-t border-muted-700">
            Quer excluir sua conta? Envie um pedido para{' '}
            <a
              href={`mailto:${platform.legal.privacyEmail}?subject=${encodeURIComponent('Exclusão de conta (LGPD)')}`}
              className="text-accent-300 underline underline-offset-2"
            >
              {platform.legal.privacyEmail}
            </a>
            . Dados de compras podem ser retidos pelo prazo legal (obrigações fiscais).
          </p>
        </div>
      </Section>
    </div>
  );
}
