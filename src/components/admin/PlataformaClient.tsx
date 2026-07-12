'use client';

// Tela do superadmin: cria organização, define taxa, gerencia membros e
// registra repasses. Todas as ações batem em /api/admin/plataforma/*.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, AlertCircle, Check } from 'lucide-react';

export type OrgAdminItem = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  contact_email: string | null;
  platform_fee_percent: number;
  is_active: boolean;
  gmv: number;
  estimated_fee: number;
  members: { id: string; role: string; name: string; email: string }[];
  events: { id: string; title: string }[];
  payouts: {
    id: string;
    gross_amount: number;
    platform_fee: number;
    mp_fees: number;
    net_amount: number;
    status: string;
    paid_at: string | null;
    notes: string | null;
    period_start: string | null;
    period_end: string | null;
    event_title: string | null;
  }[];
};

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono', admin: 'Admin', staff: 'Staff', checkin: 'Check-in',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const inputCls =
  'w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400';
const labelCls = 'block text-sm text-cream-300 mb-1';
const btnPrimary =
  'px-4 py-2 rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-900 font-semibold text-sm transition';
const btnGhost =
  'px-4 py-2 rounded-lg border border-muted-600 text-cream-300 hover:bg-surface-800 text-sm transition';

export function PlataformaClient({ items }: { items: OrgAdminItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // modais
  const [orgModal, setOrgModal] = useState(false);
  const [memberModal, setMemberModal] = useState<OrgAdminItem | null>(null);
  const [payoutModal, setPayoutModal] = useState<OrgAdminItem | null>(null);

  const [orgForm, setOrgForm] = useState({ name: '', slug: '', document: '', contact_email: '', platform_fee_percent: '10' });
  const [memberForm, setMemberForm] = useState({ email: '', role: 'owner' });
  const [payoutForm, setPayoutForm] = useState({
    event_id: '', period_start: '', period_end: '',
    gross_amount: '', platform_fee: '', mp_fees: '0', net_amount: '', notes: '',
  });

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Erro na operação.');
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('Erro de conexão.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const handleCreateOrg = async () => {
    const ok = await call('/api/admin/plataforma/organizacoes', 'POST', orgForm);
    if (ok) {
      setOrgModal(false);
      setOrgForm({ name: '', slug: '', document: '', contact_email: '', platform_fee_percent: '10' });
      flash('Organização criada. Agora adicione o dono em "Membros".');
    }
  };

  const handleUpdateFee = async (org: OrgAdminItem) => {
    const raw = window.prompt(`Nova taxa da plataforma para ${org.name} (%):`, String(org.platform_fee_percent));
    if (raw === null) return;
    const ok = await call('/api/admin/plataforma/organizacoes', 'PATCH', { id: org.id, platform_fee_percent: raw });
    if (ok) flash('Taxa atualizada.');
  };

  const handleToggleActive = async (org: OrgAdminItem) => {
    const ok = await call('/api/admin/plataforma/organizacoes', 'PATCH', { id: org.id, is_active: !org.is_active });
    if (ok) flash(org.is_active ? 'Organização desativada.' : 'Organização reativada.');
  };

  const handleAddMember = async () => {
    if (!memberModal) return;
    const ok = await call('/api/admin/plataforma/membros', 'POST', {
      organization_id: memberModal.id, ...memberForm,
    });
    if (ok) {
      setMemberModal(null);
      setMemberForm({ email: '', role: 'owner' });
      flash('Membro adicionado.');
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Remover ${name} da organização?`)) return;
    const ok = await call(`/api/admin/plataforma/membros?id=${memberId}`, 'DELETE');
    if (ok) flash('Membro removido.');
  };

  const handleCreatePayout = async () => {
    if (!payoutModal) return;
    const ok = await call('/api/admin/plataforma/repasses', 'POST', {
      organization_id: payoutModal.id, ...payoutForm,
    });
    if (ok) {
      setPayoutModal(null);
      setPayoutForm({ event_id: '', period_start: '', period_end: '', gross_amount: '', platform_fee: '', mp_fees: '0', net_amount: '', notes: '' });
      flash('Repasse registrado como pendente.');
    }
  };

  const handleMarkPaid = async (payoutId: string) => {
    const receipt = window.prompt('URL do comprovante (opcional):') ?? '';
    const ok = await call('/api/admin/plataforma/repasses', 'PATCH', {
      id: payoutId, action: 'mark_paid', receipt_url: receipt,
    });
    if (ok) flash('Repasse marcado como pago.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream-400">
          {items.length} {items.length === 1 ? 'organização' : 'organizações'}
        </p>
        <button
          onClick={() => { setError(null); setOrgModal(true); }}
          className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-surface-900 font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          <Plus size={16} /> Nova organização
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-emerald-900/30 border border-emerald-700/50 text-emerald-200 text-sm rounded-lg px-3 py-2">
          <Check size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-cream-400 py-16">
          Nenhuma organização ainda. Crie a primeira para cadastrar um produtor.
        </p>
      ) : (
        items.map((org) => (
          <div key={org.id} className={`bg-surface-700 border rounded-xl p-5 ${org.is_active ? 'border-muted-700' : 'border-red-800/60 opacity-70'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-cream-200">{org.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 border border-muted-600 text-cream-300 font-mono">
                    /{org.slug}
                  </span>
                  {!org.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">Inativa</span>
                  )}
                </div>
                <p className="text-xs text-cream-400 mt-1">
                  {org.document ? `Doc: ${org.document} · ` : ''}
                  {org.contact_email ?? 'sem e-mail de contato'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleUpdateFee(org)} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg border border-muted-600 bg-surface-800 hover:bg-surface-900 text-cream-300 transition">
                  Taxa: {org.platform_fee_percent}%
                </button>
                <button onClick={() => { setError(null); setMemberModal(org); }} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg border border-muted-600 bg-surface-800 hover:bg-surface-900 text-cream-300 transition">
                  + Membro
                </button>
                <button onClick={() => { setError(null); setPayoutModal(org); }} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-900 font-semibold transition">
                  Registrar repasse
                </button>
                <button onClick={() => handleToggleActive(org)} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg border border-muted-600 bg-surface-800 hover:bg-surface-900 text-cream-400 transition">
                  {org.is_active ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2.5">
                <p className="text-xs text-cream-400">GMV (vendas brutas)</p>
                <p className="text-lg font-bold text-cream-200">{fmtBRL(org.gmv)}</p>
              </div>
              <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2.5">
                <p className="text-xs text-cream-400">Taxa estimada ({org.platform_fee_percent}%)</p>
                <p className="text-lg font-bold text-accent-400">{fmtBRL(org.estimated_fee)}</p>
              </div>
              <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2.5">
                <p className="text-xs text-cream-400">Eventos</p>
                <p className="text-lg font-bold text-cream-200">{org.events.length}</p>
              </div>
              <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2.5">
                <p className="text-xs text-cream-400">Repasses pagos</p>
                <p className="text-lg font-bold text-cream-200">
                  {fmtBRL(org.payouts.filter((p) => p.status === 'paid').reduce((a, p) => a + p.net_amount, 0))}
                </p>
              </div>
            </div>

            {/* Membros */}
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider text-cream-400 mb-1.5">Membros</p>
              {org.members.length === 0 ? (
                <p className="text-sm text-cream-400">Nenhum membro — adicione o dono da organização.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {org.members.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 text-xs bg-surface-800 border border-muted-600 rounded-full px-3 py-1 text-cream-300">
                      {m.name} · {ROLE_LABEL[m.role] ?? m.role}
                      <button
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        className="text-cream-400 hover:text-red-300 transition"
                        aria-label={`Remover ${m.name}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Repasses pendentes */}
            {org.payouts.some((p) => p.status === 'pending') && (
              <div>
                <p className="text-xs uppercase tracking-wider text-cream-400 mb-1.5">Repasses pendentes</p>
                <div className="space-y-1.5">
                  {org.payouts.filter((p) => p.status === 'pending').map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-surface-800 border border-yellow-800/50 rounded-lg px-3 py-2">
                      <span className="text-cream-300">
                        {p.event_title ?? [p.period_start, p.period_end].filter(Boolean).join(' a ') ?? '—'}
                        {' — '}líquido <strong className="text-cream-200">{fmtBRL(p.net_amount)}</strong>
                      </span>
                      <button onClick={() => handleMarkPaid(p.id)} disabled={saving} className="text-xs px-3 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 transition">
                        Marcar como pago
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Modal: nova organização */}
      {orgModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-surface-700 border border-muted-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-cream-200">Nova organização</h3>
              <button onClick={() => setOrgModal(false)} className="text-cream-400 hover:text-cream-200" aria-label="Fechar"><X size={20} /></button>
            </div>
            <div>
              <label className={labelCls}>Nome *</label>
              <input
                type="text"
                value={orgForm.name}
                onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Slug *</label>
              <input type="text" value={orgForm.slug} onChange={(e) => setOrgForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>CNPJ/CPF (repasse e fiscal)</label>
              <input type="text" value={orgForm.document} onChange={(e) => setOrgForm((f) => ({ ...f, document: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>E-mail de contato</label>
              <input type="email" value={orgForm.contact_email} onChange={(e) => setOrgForm((f) => ({ ...f, contact_email: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Taxa da plataforma (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={orgForm.platform_fee_percent} onChange={(e) => setOrgForm((f) => ({ ...f, platform_fee_percent: e.target.value }))} className={inputCls} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setOrgModal(false)} className={btnGhost}>Cancelar</button>
              <button onClick={handleCreateOrg} disabled={saving} className={btnPrimary}>
                {saving ? 'Criando…' : 'Criar organização'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: adicionar membro */}
      {memberModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-surface-700 border border-muted-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-cream-200">Membro em {memberModal.name}</h3>
              <button onClick={() => setMemberModal(null)} className="text-cream-400 hover:text-cream-200" aria-label="Fechar"><X size={20} /></button>
            </div>
            <p className="text-xs text-cream-400">
              A pessoa precisa já ter conta na plataforma (cadastro normal de comprador).
              Ao entrar numa organização, ela ganha acesso ao painel.
            </p>
            <div>
              <label className={labelCls}>E-mail da conta *</label>
              <input type="email" value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Papel na organização</label>
              <select value={memberForm.role} onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
                <option value="owner">Dono (gerencia tudo + financeiro)</option>
                <option value="admin">Admin (eventos, lotes, cupons, afiliados)</option>
                <option value="staff">Staff (cortesias, venda offline)</option>
                <option value="checkin">Check-in (só o app de check-in)</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setMemberModal(null)} className={btnGhost}>Cancelar</button>
              <button onClick={handleAddMember} disabled={saving} className={btnPrimary}>
                {saving ? 'Adicionando…' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: registrar repasse */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-surface-700 border border-muted-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-cream-200">Repasse — {payoutModal.name}</h3>
              <button onClick={() => setPayoutModal(null)} className="text-cream-400 hover:text-cream-200" aria-label="Fechar"><X size={20} /></button>
            </div>
            <div>
              <label className={labelCls}>Evento (opcional; vazio = consolidado)</label>
              <select value={payoutForm.event_id} onChange={(e) => setPayoutForm((f) => ({ ...f, event_id: e.target.value }))} className={inputCls}>
                <option value="">— Consolidado por período —</option>
                {payoutModal.events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Período: início</label>
                <input type="date" value={payoutForm.period_start} onChange={(e) => setPayoutForm((f) => ({ ...f, period_start: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Período: fim</label>
                <input type="date" value={payoutForm.period_end} onChange={(e) => setPayoutForm((f) => ({ ...f, period_end: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Bruto (R$) *</label>
                <input type="number" min="0" step="0.01" value={payoutForm.gross_amount} onChange={(e) => setPayoutForm((f) => ({ ...f, gross_amount: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Taxa da plataforma (R$) *</label>
                <input type="number" min="0" step="0.01" value={payoutForm.platform_fee} onChange={(e) => setPayoutForm((f) => ({ ...f, platform_fee: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tarifas MP (R$)</label>
                <input type="number" min="0" step="0.01" value={payoutForm.mp_fees} onChange={(e) => setPayoutForm((f) => ({ ...f, mp_fees: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Líquido a transferir (R$) *</label>
                <input type="number" min="0" step="0.01" value={payoutForm.net_amount} onChange={(e) => setPayoutForm((f) => ({ ...f, net_amount: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Observações</label>
              <textarea rows={2} value={payoutForm.notes} onChange={(e) => setPayoutForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setPayoutModal(null)} className={btnGhost}>Cancelar</button>
              <button onClick={handleCreatePayout} disabled={saving} className={btnPrimary}>
                {saving ? 'Registrando…' : 'Registrar repasse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
