// app/sitemap.ts
// Sitemap dinâmico servido em /sitemap.xml — o Google descobre e recruta
// as páginas por aqui (apontado também no robots.txt).
import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { platform } from '@/lib/config';

const BASE_URL = platform.baseUrl;

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Eventos ativos (páginas públicas de venda)
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('slug, updated_at')
    .eq('status', 'active');

  const eventEntries: MetadataRoute.Sitemap = (events ?? []).map((e) => ({
    url: `${BASE_URL}/evento/${e.slug}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 1,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...eventEntries,
    {
      url: `${BASE_URL}/buscar-ingresso`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cadastro`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/termos`,
      changeFrequency: 'yearly',
      priority: 0.1,
    },
    {
      url: `${BASE_URL}/privacidade`,
      changeFrequency: 'yearly',
      priority: 0.1,
    },
  ];
}
