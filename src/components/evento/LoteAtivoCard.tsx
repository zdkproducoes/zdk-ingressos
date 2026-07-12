"use client"

import { useState } from "react"

export type LoteAtivo = {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  paid_count: number
  max_per_order: number
  min_per_order: number
}

export type LoteAtivoProps = {
  lote: LoteAtivo
  isUrgent: boolean
  onBuy: (loteId: string, quantity: number) => void
}

export function LoteAtivoCard({ lote, isUrgent, onBuy }: LoteAtivoProps) {
  const minQty = Math.max(1, lote.min_per_order ?? 1)
  const maxQty = Math.max(minQty, lote.max_per_order ?? 5)
  const [qty, setQty] = useState(minQty)

  const total = qty * lote.price
  const totalFormatted = total.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const inc = () => setQty((q) => Math.min(q + 1, maxQty))
  const dec = () => setQty((q) => Math.max(q - 1, minQty))

  return (
    <section id="ingressos" className="max-w-[700px] mx-auto px-5 pt-8 pb-20">
      <div className="font-display text-accent-400 tracking-[0.2em] text-[0.85rem] text-center mb-2">
        GARANTA SEU LUGAR
      </div>
      <h2 className="font-display-bold text-[clamp(2rem,4.5vw,2.75rem)] text-cream-200 text-center mb-2">
        Ingressos <span className="text-accent-400">disponíveis</span>
      </h2>
      <p className="text-center text-cream-400 mb-10 text-[0.9375rem]">
        Selecione a quantidade desejada
      </p>

      <div className="bg-gradient-to-br from-muted-700 to-surface-700
                      border-2 border-accent-400 rounded-2xl p-8
                      relative overflow-hidden
                      shadow-[0_12px_36px_-12px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 right-0 h-[6px]
                        bg-gradient-to-r from-muted-500 via-accent-400 to-muted-500" />

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-block px-3 py-1 bg-surface-600
                           border border-muted-500 text-cream-100
                           rounded text-[0.7rem] font-bold tracking-[0.1em] uppercase">
            <span className="inline-block mr-1.5 text-accent-300 animate-pulse">●</span>
            Vendendo agora
          </span>
          {isUrgent && (
            <span className="inline-block px-3 py-1 bg-accent-400 text-surface-900
                             rounded text-[0.7rem] font-bold tracking-[0.1em] uppercase">
              Quase esgotado
            </span>
          )}
        </div>

        <h3 className="font-display-bold text-4xl text-cream-200 tracking-wide leading-none mb-1.5">
          {lote.name}
        </h3>
        {lote.description && (
          <p className="text-[0.9375rem] text-cream-300 mb-6">{lote.description}</p>
        )}

        <div className="flex items-baseline gap-2 mb-7">
          <span className="text-lg text-cream-300">R$</span>
          <span className="font-display-bold text-[4rem] leading-none text-accent-400 tracking-tight">
            {lote.price}
          </span>
          <span className="text-[0.9375rem] text-cream-400">/ ingresso</span>
        </div>

        {isUrgent && (
          <div className="bg-accent-400/10 border border-accent-500
                          rounded-[10px] px-4 py-3 mb-5
                          text-accent-300 font-semibold text-sm
                          flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>Últimos ingressos disponíveis</span>
          </div>
        )}

        <div className="flex items-center justify-between bg-surface-900
                        border border-muted-700 rounded-[10px] px-3.5 py-2.5 mb-4">
          <span className="text-cream-300 text-sm">Quantidade</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={dec}
              disabled={qty <= minQty}
              aria-label="Diminuir quantidade"
              className="w-9 h-9 bg-surface-800 text-accent-400
                         border border-muted-600 rounded-lg
                         text-xl font-bold cursor-pointer
                         flex items-center justify-center transition-colors
                         hover:bg-surface-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="font-display text-[1.375rem] text-cream-200 min-w-[32px] text-center">
              {qty}
            </span>
            <button
              type="button"
              onClick={inc}
              disabled={qty >= maxQty}
              aria-label="Aumentar quantidade"
              className="w-9 h-9 bg-surface-800 text-accent-400
                         border border-muted-600 rounded-lg
                         text-xl font-bold cursor-pointer
                         flex items-center justify-center transition-colors
                         hover:bg-surface-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex justify-between items-baseline py-3.5
                        border-y border-dashed border-muted-600 mb-5">
          <span className="text-cream-300 text-[0.9375rem]">Total</span>
          <span className="font-display-bold text-2xl text-accent-400">
            R$ {totalFormatted}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onBuy(lote.id, qty)}
          className="w-full bg-accent-400 text-surface-900
                     py-4 rounded-[10px]
                     font-display-bold text-xl tracking-wider uppercase
                     cursor-pointer transition-all duration-200
                     shadow-[0_4px_0_#7C5A16]
                     hover:bg-accent-300 hover:-translate-y-0.5
                     hover:shadow-[0_6px_0_#7C5A16]
                     active:translate-y-0.5
                     active:shadow-[0_2px_0_#7C5A16]"
        >
          Comprar agora
        </button>

        <p className="text-center text-cream-400 text-xs mt-3.5">
          É necessário ter conta na plataforma para finalizar a compra
        </p>
      </div>
    </section>
  )
}
