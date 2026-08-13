// app/api/admin/cortesias/buscar/route.ts
// Busca convidado por CPF ou e-mail para emissão de cortesia.
//
// ⚠️ Esta é a única rota do painel que consulta `profiles` SEM escopo de
// organização — e tem que ser assim: o convidado de uma cortesia normalmente
// nunca comprou nada da organização, então filtrar por pedidos da org
// quebraria a função. A proteção aqui é outra: a busca é por identificador
// EXATO (CPF completo ou e-mail completo), nunca por prefixo/nome, e a
// resposta devolve o MÍNIMO — só o necessário para o operador confirmar que
// achou a pessoa certa e nomear o ingresso. Nada de telefone, e e-mail/CPF
// voltam mascarados: sem isso, um staff de qualquer organização usava a busca
// como oráculo (e-mail → CPF, CPF → e-mail/telefone) sobre a base inteira.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelApi } from '@/lib/auth/panel';

export const runtime = 'nodejs';

/** joao.silva@gmail.com → jo****va@gmail.com */
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split('@');
  if (!domain) return null;
  if (user.length <= 4) return `${user.slice(0, 1)}***@${domain}`;
  return `${user.slice(0, 2)}****${user.slice(-2)}@${domain}`;
}

/** 12345678901 → ***.456.789-** */
function maskCpf(cpf: string | null): string | null {
  const d = (cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11) return null;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export async function GET(req: NextRequest) {
  // Auth central do painel (emissão de cortesia é operação de staff)
  const auth = await requirePanelApi({ minOrgRole: 'staff' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ found: false });

  // Detecta se é CPF (só números, 11 dígitos quando limpo) ou e-mail
  const cpfDigits = q.replace(/\D/g, '');
  const isCpf = cpfDigits.length === 11;
  const isEmail = q.includes('@');

  let query = supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email, cpf')
    .limit(1);

  if (isCpf) {
    query = query.eq('cpf', cpfDigits);
  } else if (isEmail) {
    query = query.ilike('email', q.toLowerCase());
  } else {
    return NextResponse.json({
      found: false,
      error: 'Digite um CPF (11 dígitos) ou e-mail válido'
    });
  }

  const { data, error } = await query.single();
  if (error || !data) {
    return NextResponse.json({ found: false });
  }

  // Só o mínimo: o nome (vira o nome no ingresso) + e-mail/CPF mascarados
  // para o operador conferir que é a pessoa certa. Ver o cabeçalho do arquivo.
  return NextResponse.json({
    found: true,
    profile: {
      id: data.id,
      name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
      email: maskEmail(data.email),
      cpf: maskCpf(data.cpf),
    }
  });
}
