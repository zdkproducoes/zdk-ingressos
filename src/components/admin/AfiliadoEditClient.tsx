'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import type { AfiliadoDetail, AfiliadoSale } from '@/app/admin/afiliados/[id]/page';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const CODE_REGEX = /^[a-z0-9-]+$/;

export function AfiliadoEditClient({
  afiliado,
  sales,
  baseUrl,
}: {
  afiliado: AfiliadoDetail;
  sales: AfiliadoSale[];
  baseUrl: string;
}) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(afiliado.name);
  const [code, setCode] = useState(afiliado.code);
  const [email, setEmail] = useState(afiliado.email ?? '');
  const [phone, setPhone] = useState(afiliado.phone ?? '');
  const [commission, setCommission] = useState(String(afiliado.commission_percent));
  const [notes, setNotes] = useState(afiliado.notes ?? '');
  const [isActive, setIsActive] = useState(afiliado.is_active);
  const [isStaff, setIsStaff] = useState(afiliado.is_staff);
  const [panelToken, setPanelToken] = useState(afiliado.panel_token);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<'share' | 'panel' | null>(null);

  const shareUrl = `${baseUrl}/evento/${afiliado.event_slug}?ref=${code}`;
  const panelUrl = `${baseUrl}/afiliado/${code}?token=${panelToken}`;

  const codeValid = CODE_REGEX.test(code);

  // Totais
  const totalRevenue = sales.reduce((s, x) => s + (x.total - x.service_fee), 0);
  const totalCommission = totalRevenue * (afiliado.commission_percent / 100);

  const copy = async (text: string, which: 'share' | 'panel') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* silencioso */
    }
  };

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2500);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError('Nome é obrigatório.');
    if (!code.trim()) return setError('Code é obrigatório.');
    if (!CODE_REGEX.test(code)) return setError('Code deve conter apenas letras minúsculas, números e hífen.');
    const commissionNum = Number(commission);
    if (Number.isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      return setError('Comissão deve ser um número entre 0 e 100.');
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/afiliados/${afiliado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          name: name.trim(),
          code: code.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          commission_percent: commissionNum,
          notes: notes.trim() || null,
          is_staff: isStaff,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao salvar.');
        setSaving(false);
        return;
      }
      flashSuccess('Alterações salvas.');
      router.refresh();
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    setError(null);
    setSuccess(null);
    const newStatus = !isActive;
    if (!confirm(newStatus ? 'Reativar este afiliado?' : 'Desativar este afiliado? Novos cliques no link dele não serão mais atribuídos.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/afiliados/${afiliado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', is_active: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) return setError(json.error || 'Erro ao alterar status.');
      setIsActive(newStatus);
      flashSuccess(newStatus ? 'Afiliado reativado.' : 'Afiliado desativado.');
      router.refresh();
    } catch {
      setError('Erro de conexão.');
    }
  };

  const handleRegenerateToken = async () => {
    setError(null);
    setSuccess(null);
    if (!confirm('Gerar um novo token do painel? O link mágico antigo deixará de funcionar imediatamente.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/afiliados/${afiliado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_token' }),
      });
      const json = await res.json();
      if (!res.ok) return setError(json.error || 'Erro ao regenerar token.');
      setPanelToken(json.panel_token);
      flashSuccess('Novo token gerado. Envie o novo link ao afiliado.');
    } catch {
      setError('Erro de conexão.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-cream-200">{afiliado.name}</h2>
          <p className="text-sm text-cream-400">
            {afiliado.event_title} · <span className="font-mono">{afiliado.code}</span> ·{' '}
            {afiliado.visits} visitas
          </p>
        </div>
        <button
          onClick={handleToggleActive}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            isActive
              ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
              : 'bg-muted-800/60 text-cream-400 border-muted-600 hover:bg-muted-700'
          }`}
        >
          {isActive ? '● Ativo (clique para desativar)' : '○ Inativo (clique para reativar)'}
        </button>
      </div>

      {/* Alertas */}
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

      {/* Links */}
      <div className="bg-surface-700 border border-muted-700 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-cream-200 uppercase tracking-wider">Links</h3>

        <div>
          <label className="block text-xs text-cream-400 mb-1">Link de divulgação (público)</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-xs font-mono"
            />
            <button
              onClick={() => copy(shareUrl, 'share')}
              className="inline-flex items-center gap-1.5 bg-surface-800 hover:bg-surface-900 text-cream-200 text-xs px-3 py-2 rounded border border-muted-600 transition"
            >
              {copied === 'share' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'share' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-cream-400 mb-1">
            Link mágico do painel <span className="text-accent-400">(envie só ao afiliado)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={panelUrl}
              className="flex-1 bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-xs font-mono"
            />
            <button
              onClick={() => copy(panelUrl, 'panel')}
              className="inline-flex items-center gap-1.5 bg-surface-800 hover:bg-surface-900 text-cream-200 text-xs px-3 py-2 rounded border border-muted-600 transition"
            >
              {copied === 'panel' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'panel' ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={handleRegenerateToken}
              title="Gerar novo token (invalida o link atual)"
              className="inline-flex items-center gap-1.5 bg-surface-800 hover:bg-surface-900 text-cream-300 text-xs px-3 py-2 rounded border border-muted-600 transition"
            >
              <RefreshCw size={14} /> Regenerar
            </button>
          </div>
          <p className="text-xs text-cream-400 mt-1">
            Painel do embaixador: visitas, vendas, comissão e link de divulgação com botão de copiar.
          </p>
        </div>
      </div>

      {/* Form de edição */}
      <div className="bg-surface-700 border border-muted-700 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-cream-200 uppercase tracking-wider">Dados</h3>

        <div>
          <label className="block text-sm text-cream-300 mb-1">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        <div>
          <label className="block text-sm text-cream-300 mb-1">Code *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            className={`w-full bg-surface-800 text-cream-200 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 ${
              codeValid ? 'border-muted-600 focus:ring-accent-400' : 'border-red-600 focus:ring-red-500'
            }`}
          />
          {!codeValid && (
            <p className="text-xs text-red-300 mt-1">
              Apenas letras minúsculas, números e hífen.
            </p>
          )}
          <p className="text-xs text-cream-400 mt-1">
            Mudar o code quebra links já distribuídos. Vendas antigas continuam atribuídas (gravadas no pedido).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-cream-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
            />
          </div>
          <div>
            <label className="block text-sm text-cream-300 mb-1">Telefone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-cream-300 mb-1">Comissão (%) *</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer bg-surface-800 border border-muted-600 rounded-lg px-3 py-2.5">
          <input
            type="checkbox"
            checked={isStaff}
            onChange={(e) => setIsStaff(e.target.checked)}
            className="mt-0.5 accent-accent-400"
          />
          <span className="text-sm text-cream-300">
            Link da organização
            <span className="block text-xs text-cream-400 mt-0.5">
              Marque para links da própria produção (Instagram oficial, equipe etc.). Fica
              fora do pódio e das metas dos embaixadores — as vendas continuam sendo
              atribuídas normalmente.
            </span>
          </span>
        </label>

        <div>
          <label className="block text-sm text-cream-300 mb-1">Notas internas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition"
        >
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>

      {/* Resumo de vendas */}
      <div className="bg-surface-700 border border-muted-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-cream-200 uppercase tracking-wider">
            Vendas atribuídas
          </h3>
          <div className="text-right">
            <p className="text-xs text-cream-400">
              {sales.length} {sales.length === 1 ? 'venda' : 'vendas'} · {fmtCurrency(totalRevenue)}
            </p>
            <p className="text-sm text-accent-400 font-semibold">
              Comissão: {fmtCurrency(totalCommission)}
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <p className="text-center text-cream-400 py-6 text-sm">
            Nenhuma venda atribuída ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-cream-400 text-xs uppercase tracking-wider border-b border-muted-700">
                <tr>
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Comprador</th>
                  <th className="text-right py-2">Líquido</th>
                  <th className="text-right py-2">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const net = s.total - s.service_fee;
                  const comm = net * (afiliado.commission_percent / 100);
                  return (
                    <tr key={s.order_id} className="border-b border-muted-700/50">
                      <td className="py-2 text-cream-300">{fmtDateTime(s.created_at)}</td>
                      <td className="py-2 text-cream-200">
                        {s.buyer_name ?? '—'}
                        {s.buyer_email && (
                          <span className="block text-xs text-cream-400">{s.buyer_email}</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-cream-300">{fmtCurrency(net)}</td>
                      <td className="py-2 text-right text-accent-400 font-semibold">
                        {fmtCurrency(comm)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sales.length === 50 && (
              <p className="text-xs text-cream-400 mt-3 text-center">
                Mostrando as 50 mais recentes.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
