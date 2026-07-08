// app/robots.ts
// Servido em /robots.txt — libera as páginas públicas pro Google e
// bloqueia áreas privadas/transacionais (admin, checkout, painéis).
import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sacode.cantorcaiolacerda.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/afiliado/',
        '/minhas-compras',
        '/checkout',
        '/checkin',
        '/auth/',
        '/login',
        '/recuperar-senha',
        '/redefinir-senha',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
