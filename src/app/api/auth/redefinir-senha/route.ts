// app/api/auth/redefinir-senha/route.ts
// Route Handler server-side para redefinir senha.
// Roda no servidor (sem navigator.locks), eliminando conflito de locks de auth.
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Requisição inválida.' },
      { status: 400 }
    );
  }

  const password = body.password;

  // Validação server-side (defesa em profundidade — o client também valida)
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Senha deve ter no mínimo 8 caracteres.' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Garante que existe sessão (vinda do callback de recuperação)
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json(
      { error: 'Sessão expirada. Solicite um novo link de recuperação.' },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const code = (error as { code?: string }).code;
    let message = 'Erro ao redefinir senha. Tente novamente.';
    let status = 400;

    if (code === 'same_password') {
      message = 'A nova senha deve ser diferente da senha atual.';
      status = 422;
    } else if (code === 'weak_password') {
      message = 'Senha muito fraca. Use pelo menos 8 caracteres.';
      status = 422;
    }

    console.error('[api/redefinir-senha] updateUser error:', error);
    return NextResponse.json({ error: message, code }, { status });
  }

  // Senha redefinida com sucesso. Encerra a sessão de recuperação:
  // 1) Força o usuário a logar com a senha nova (UX correto)
  // 2) Elimina sessão fantasma que pode travar o próximo login
  // 3) Em devices compartilhados, evita que o token de recuperação fique vivo
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}