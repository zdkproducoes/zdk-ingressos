// app/api/cron/reconciliar/route.ts
// Robo de reconciliacao. Chamado de hora em hora por um agendador externo
// (cron do cPanel da HostGator) com o cabecalho: Authorization: Bearer <CRON_SECRET>.
//
// PASSO 1: pedidos 'pending' criados ha mais de 24h -> consulta o status real no MP.
//          - achou pagamento aprovado -> marca approved + entrega (salva o caso
//            "pagou mas o webhook sumiu").
//          - nenhum aprovado -> marca 'abandoned' (PIX nao pago).
//          - erro de API do MP -> NAO mexe (evita falso abandono), tenta na proxima hora.
// PASSO 2: pedidos 'approved' com tickets_emailed_at null (entrega nunca concluida)
//          -> reenvia QR + e-mail (idempotente, sem recontar estoque).
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mpPayment } from '@/lib/mercadopago/client';
import { fulfillOrder } from '@/lib/checkout/fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PENDING = 100; // teto de pedidos pending processados por execucao
const MAX_REPAIR = 100;  // teto de pedidos approved-sem-entrega por execucao

export async function GET(req: NextRequest) {
  // Seguranca: so executa com o segredo correto.
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resumo = {
    verificadosPending: 0,
    aprovados: 0,
    abandonados: 0,
    reparados: 0,
    erros: 0,
  };
  // Um pedido só é considerado "não finalizado" (abandonado) depois de 24h
  // pendente — antes disso ainda pode ser um PIX que o cliente vai pagar.
  const vinteQuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // ---------- PASSO 1: pending ha mais de 24h ----------
  const { data: pendings } = await supabaseAdmin
    .from('orders')
    .select('id, payment_method, payment_gateway_data')
    .eq('payment_status', 'pending')
    .lt('created_at', vinteQuatroHorasAtras)
    .limit(MAX_PENDING);

  for (const order of pendings ?? []) {
    resumo.verificadosPending++;

    let results: any[] = [];
    try {
      const res = await mpPayment.search({ options: { external_reference: order.id } });
      results = res.results ?? [];
    } catch (err) {
      // Erro transitorio na API do MP: NAO abandona (poderia ser um pedido pago).
      console.error('[reconciliar] mpPayment.search falhou', order.id, err);
      resumo.erros++;
      continue;
    }

    const aprovado = results.find((p) => p.status === 'approved');

    if (aprovado) {
      // Pagou de verdade mas o webhook nao concluiu: corrige e entrega.
      await supabaseAdmin.from('orders').update({
        payment_status: 'approved',
        paid_at: new Date().toISOString(),
        payment_method: aprovado.payment_method_id === 'pix'
          ? 'pix'
          : (aprovado.payment_type_id === 'credit_card' ? 'credit_card' : order.payment_method),
        payment_gateway_data: {
          ...(order.payment_gateway_data || {}),
          payment_id: aprovado.id,
          status: aprovado.status,
          status_detail: aprovado.status_detail,
          reconciled: true,
        },
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);

      await fulfillOrder(order.id, { incrementStock: true });
      resumo.aprovados++;
    } else {
      // Nenhum pagamento aprovado -> PIX nao pago -> abandonado.
      const statuses = results.map((p) => p.status).join(',') || 'sem-pagamento';
      await supabaseAdmin.from('orders').update({
        payment_status: 'abandoned',
        cancellation_reason: `Reconciliacao automatica: nenhum pagamento aprovado no MP (status: ${statuses})`,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      // Devolve a reserva de estoque do carrinho abandonado (idempotente)
      await supabaseAdmin.rpc('release_order_reservation', { p_order_id: order.id });
      resumo.abandonados++;
    }
  }

  // ---------- PASSO 2: approved sem entrega concluida ----------
  // tickets_emailed_at null = QR e/ou e-mail nunca foram concluidos.
  const { data: semEntrega } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('payment_status', 'approved')
    .is('tickets_emailed_at', null)
    .limit(MAX_REPAIR);

  for (const order of semEntrega ?? []) {
    try {
      // incrementStock: false -> estoque ja foi contado quando virou approved.
      await fulfillOrder(order.id, { incrementStock: false });
      resumo.reparados++;
    } catch (err) {
      console.error('[reconciliar] reparo falhou', order.id, err);
      resumo.erros++;
    }
  }

  console.log('[reconciliar] resumo', resumo);
  return NextResponse.json({ ok: true, resumo });
}
