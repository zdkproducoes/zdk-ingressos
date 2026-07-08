import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Bypass para crawlers de redes sociais e search engines.
  // Sem isso, og:tags não funcionam pois bots recebem resposta inesperada do auth middleware.
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Googlebot|bingbot|Discordbot|SkypeUriPreview|Applebot/i.test(userAgent);
  if (isCrawler) {
    return NextResponse.next();
  }

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

  const isPublicRoute = request.nextUrl.pathname.startsWith('/evento');

  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    const redirectTarget = request.nextUrl.pathname + request.nextUrl.search;
    loginUrl.searchParams.set('redirect', redirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname.startsWith('/admin')) {
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
  matcher: ['/admin/:path*', '/checkout/:path*', '/minhas-compras/:path*', '/evento/:path*'],
};
