import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// -----------------------------------------------------------------------------
// Middleware da plataforma:
//   1. Split por Host: com NEXT_PUBLIC_PANEL_HOST definido (ex.:
//      painel.zdkingressos.com.br), o host do painel serve o admin/check-in e
//      o domínio público redireciona essas rotas pro painel. Sem a env
//      (dev/preview), tudo funciona por path como antes.
//   2. Auth: rotas não-públicas exigem login; /admin exige admin/producer.
// -----------------------------------------------------------------------------

// process.env é inlineado no build (edge runtime) — não usar lib/config aqui
// para manter o bundle do middleware mínimo.
const PANEL_HOST = process.env.NEXT_PUBLIC_PANEL_HOST ?? '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? '';

// Rotas que moram no host do painel
const PANEL_PAGE_PREFIXES = ['/admin', '/checkin'];
const PANEL_API_PREFIXES = ['/api/admin', '/api/checkin'];
// Rotas de autenticação/estáticas permitidas em qualquer host
const SHARED_PREFIXES = [
  '/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/auth',
  '/api/auth', '/icon.png',
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Roteamento por Host (retorna uma resposta quando o host não serve a rota) */
function routeByHost(request: NextRequest): NextResponse | null {
  if (!PANEL_HOST) return null; // dev/preview: sem split

  const host = (request.headers.get('host') ?? '').toLowerCase();
  const isPanelHost = host === PANEL_HOST.toLowerCase();
  const { pathname, search } = request.nextUrl;

  if (isPanelHost) {
    // Raiz do painel abre o admin
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    // Rotas de painel, auth e APIs do painel: seguem
    if (
      startsWithAny(pathname, PANEL_PAGE_PREFIXES) ||
      startsWithAny(pathname, PANEL_API_PREFIXES) ||
      startsWithAny(pathname, SHARED_PREFIXES) ||
      pathname.startsWith('/_next')
    ) {
      return null;
    }
    // Qualquer outra rota pertence ao site público
    if (SITE_URL) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, SITE_URL));
    }
    return null;
  }

  // Host público: páginas do painel redirecionam pro subdomínio…
  if (startsWithAny(pathname, PANEL_PAGE_PREFIXES)) {
    const proto = request.nextUrl.protocol || 'https:';
    return NextResponse.redirect(new URL(`${pathname}${search}`, `${proto}//${PANEL_HOST}`));
  }
  // …e as APIs do painel simplesmente não existem aqui
  if (startsWithAny(pathname, PANEL_API_PREFIXES)) {
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  }

  return null;
}

export async function middleware(request: NextRequest) {
  // Bypass para crawlers de redes sociais e search engines.
  // Sem isso, og:tags não funcionam pois bots recebem resposta inesperada do auth middleware.
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Googlebot|bingbot|Discordbot|SkypeUriPreview|Applebot/i.test(userAgent);
  if (isCrawler) {
    return NextResponse.next();
  }

  // 1) Split por Host (painel × site público)
  const hostResponse = routeByHost(request);
  if (hostResponse) return hostResponse;

  const { pathname } = request.nextUrl;

  // 2) Auth: só as áreas logadas passam pela checagem de sessão;
  //    todo o resto (home, evento, buscar-ingresso, afiliado…) é público.
  const needsAuthCheck =
    startsWithAny(pathname, ['/admin', '/checkin', '/checkout', '/minhas-compras', '/minha-conta']);

  if (!needsAuthCheck) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    const redirectTarget = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set('redirect', redirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  // Filtro de borda do painel: papel grosso via profiles.role.
  // O gate fino (organização/escopo) é feito nos layouts e rotas
  // (lib/auth/panel.ts + lib/auth/scope.ts).
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'producer') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  // Matcher amplo: o split por Host precisa ver todas as rotas de página.
  // Exclui estáticos (_next, arquivos com extensão).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)', '/api/admin/:path*', '/api/checkin/:path*'],
};
