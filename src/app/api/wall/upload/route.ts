// app/api/wall/upload/route.ts
// Upload de imagem para o Supabase Storage (bucket "wall-images")
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/turnstile/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`wall-upload:${ip}`, 20))) {
    return NextResponse.json({ error: 'Muitos uploads. Aguarde.' }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const eventId = formData.get('eventId') as string | null;
  if (!file) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 });
  if (!eventId) return NextResponse.json({ error: 'eventId obrigatório' }, { status: 400 });

  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Arquivo maior que 5MB' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Formato não permitido (use JPG, PNG, WEBP ou GIF)' }, { status: 400 });

  // Verifica que comprou ingresso
  const { data: hasTicket } = await supabaseAdmin.rpc('user_has_paid_ticket', {
    p_user_id: user.id, p_event_id: eventId,
  });
  if (!hasTicket) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const filename = `${eventId}/${user.id}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from('wall-images').upload(filename, buffer, {
    contentType: file.type, cacheControl: '31536000',
  });
  if (error) { console.error(error); return NextResponse.json({ error: 'Erro ao enviar imagem' }, { status: 500 }); }

  const { data: pub } = supabaseAdmin.storage.from('wall-images').getPublicUrl(filename);
  return NextResponse.json({ ok: true, url: pub.publicUrl, path: filename });
}
