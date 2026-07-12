import type { Metadata } from "next";
import { platform } from "@/lib/config";
import { TermosContent } from "@/components/legal/TermosContent";

export const metadata: Metadata = {
  title: `Termos de Uso e Condições de Compra | ${platform.name}`,
  description: `Termos de Uso e Condições de Compra da plataforma ${platform.name} para aquisição de ingressos.`,
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Termos de Uso e Condições de Compra
          </h1>
          <p className="mt-2 text-base text-zinc-600">Plataforma {platform.name}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Versão 2.0 — Vigência a partir de 12 de julho de 2026
          </p>
        </header>
        <TermosContent darkBg={false} />
      </article>
    </main>
  );
}
