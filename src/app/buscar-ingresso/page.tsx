import type { Metadata } from 'next';
import { BuscarIngressoForm } from '@/components/BuscarIngressoForm';

export const metadata: Metadata = {
  title: 'Localizar Ingresso',
  description: 'Encontre seus ingressos informando o CPF e o número do pedido.',
};

export default function BuscarIngressoPage() {
  return (
    <main className="min-h-screen bg-surface-800 py-16 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-cream-200 mb-2">Localizar meu ingresso</h1>
        <p className="text-cream-400 text-sm mb-8">
          Informe o CPF cadastrado e o número do pedido para recuperar seus QR codes.
        </p>
        <BuscarIngressoForm />
      </div>
    </main>
  );
}
