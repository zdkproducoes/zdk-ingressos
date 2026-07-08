'use client';

import { Download } from 'lucide-react';

export type BuyerData = {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  total_ingressos: number;
  total_gasto: number;
  primeira_compra: string;
};

export function ExportCSVButton({ buyers }: { buyers: BuyerData[] }) {
  function handleExport() {
    const bom = '﻿';
    const header = 'Nome;Email;Telefone;CPF;Ingressos;Total Gasto;Primeira Compra\n';
    const rows = buyers.map(b => {
      const cols = [
        b.full_name,
        b.email,
        b.phone,
        b.cpf,
        String(b.total_ingressos),
        b.total_gasto.toFixed(2).replace('.', ','),
        new Date(b.primeira_compra).toLocaleDateString('pt-BR'),
      ];
      return cols.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    });

    const csv = bom + header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compradores-sacode-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 bg-amber-sacode-400 hover:bg-amber-sacode-500 text-wine-800 px-4 py-2 rounded text-sm font-medium transition"
    >
      <Download size={16} />
      Exportar CSV
    </button>
  );
}
