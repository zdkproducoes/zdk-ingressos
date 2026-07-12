// Gate central do painel (admin + check-in).
// Substitui os ~18 blocos "getUser + profiles.role" duplicados nas rotas.
//
// Modelo de acesso da plataforma:
//   profiles.role = 'admin'    → superadmin da PLATAFORMA (vê tudo)
//   profiles.role = 'producer' → acessa o painel; o escopo vem de
//                                organization_members (ver lib/auth/scope.ts)
//   profiles.role = 'checkin'  → apenas o app de check-in
//   profiles.role = 'customer' → comprador, sem painel
//
// ⚠️ As rotas do painel usam service_role (bypassa RLS): o isolamento por
// organização TEM que ser aplicado via lib/auth/scope.ts em toda query.
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type OrgRole = 'owner' | 'admin' | 'staff' | 'checkin';

// Hierarquia: owner > admin > staff > checkin
const ORG_ROLE_LEVEL: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  staff: 2,
  checkin: 1,
};

export type Membership = {
  organization_id: string;
  role: OrgRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    platform_fee_percent: number;
    brand: Record<string, unknown>;
  };
};

export type PanelProfile = {
  id: string;
  role: 'customer' | 'producer' | 'admin' | 'checkin';
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type PanelContext = {
  user: { id: string; email: string | null };
  profile: PanelProfile;
  /** profiles.role === 'admin' → superadmin da plataforma */
  isSuperadmin: boolean;
  memberships: Membership[];
  /** null = superadmin (sem restrição); array = organizações do usuário */
  orgIds: string[] | null;
};

type PanelOptions = {
  /** Papel mínimo exigido DENTRO da organização (ignorado para superadmin). */
  minOrgRole?: OrgRole;
  /** Aceita profiles.role === 'checkin' (app de check-in). */
  allowCheckinRole?: boolean;
};

/** true se o contexto atinge o papel mínimo em ALGUMA organização */
export function hasMinOrgRole(ctx: PanelContext, min: OrgRole): boolean {
  if (ctx.isSuperadmin) return true;
  return ctx.memberships.some((m) => ORG_ROLE_LEVEL[m.role] >= ORG_ROLE_LEVEL[min]);
}

/**
 * Núcleo: resolve usuário + profile + organizações numa passada.
 * Retorna null quando não autenticado ou sem acesso ao painel.
 */
export async function getPanelContext(opts: PanelOptions = {}): Promise<PanelContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberRows }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, first_name, last_name, email')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('organization_members')
      .select('organization_id, role, organizations(id, name, slug, platform_fee_percent, brand)')
      .eq('user_id', user.id),
  ]);

  if (!profile) return null;

  const allowedRoles = opts.allowCheckinRole
    ? ['admin', 'producer', 'checkin']
    : ['admin', 'producer'];
  if (!allowedRoles.includes(profile.role)) return null;

  const memberships: Membership[] = (memberRows ?? []).map((m) => {
    const raw = m as unknown as {
      organization_id: string;
      role: OrgRole;
      organizations: Membership['organization'] | Membership['organization'][];
    };
    const org = Array.isArray(raw.organizations) ? raw.organizations[0] : raw.organizations;
    return { organization_id: raw.organization_id, role: raw.role, organization: org };
  });

  const isSuperadmin = profile.role === 'admin';

  const ctx: PanelContext = {
    user: { id: user.id, email: user.email ?? null },
    profile: profile as PanelProfile,
    isSuperadmin,
    memberships,
    orgIds: isSuperadmin ? null : memberships.map((m) => m.organization_id),
  };

  if (opts.minOrgRole && !hasMinOrgRole(ctx, opts.minOrgRole)) return null;

  return ctx;
}

/**
 * Para páginas/layouts (Server Components): redireciona em falha.
 */
export async function requirePanelContext(
  opts: PanelOptions & { redirectTo?: string } = {},
): Promise<PanelContext> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(opts.redirectTo ?? '/admin')}`);

  const ctx = await getPanelContext(opts);
  if (!ctx) redirect('/');
  return ctx;
}

export type PanelApiResult =
  | { ok: true; ctx: PanelContext }
  | { ok: false; error: string; status: 401 | 403 };

/**
 * Para Route Handlers: retorna união discriminada em vez de redirecionar.
 */
export async function requirePanelApi(opts: PanelOptions = {}): Promise<PanelApiResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado', status: 401 };

  const ctx = await getPanelContext(opts);
  if (!ctx) return { ok: false, error: 'Sem permissão', status: 403 };
  return { ok: true, ctx };
}
