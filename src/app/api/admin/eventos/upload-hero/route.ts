// app/api/admin/eventos/upload-hero/route.ts
// Upload da imagem hero (banner 2:1) de um evento para o bucket público
// "event-assets". Exige papel de admin na organização (ou superadmin) — é a
// mesma barreira de quem cria/edita evento. Valida tipo, tamanho e DIMENSÕES
// no servidor (2:1, a partir de 1200×600).
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelApi } from '@/lib/auth/panel';
import { imageSize, validateHeroSize } from '@/lib/images/dimensions';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (limite do bucket)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo maior que 5MB.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato não permitido (use JPG, PNG ou WEBP).' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const dims = imageSize(buffer);
  if (!dims) {
    return NextResponse.json({ error: 'Não consegui ler as dimensões da imagem. Envie um JPG/PNG/WEBP válido.' }, { status: 400 });
  }
  const sizeError = validateHeroSize(dims.width, dims.height);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const filename = `heroes/${auth.ctx.user.id}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('event-assets')
    .upload(filename, buffer, { contentType: file.type, cacheControl: '31536000' });
  if (uploadError) {
    console.error('[upload-hero]', uploadError);
    return NextResponse.json({ error: 'Erro ao enviar imagem.' }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from('event-assets').getPublicUrl(filename);
  return NextResponse.json({ ok: true, url: pub.publicUrl, width: dims.width, height: dims.height });
}
