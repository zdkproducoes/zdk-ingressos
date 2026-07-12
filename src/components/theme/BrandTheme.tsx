// Aplica o tema da organização (organizations.brand.colors) na página do
// evento via override das CSS vars --brand-* (definidas em globals.css).
// Sem cores configuradas, não renderiza nada — vale o tema da plataforma.
//
// Tailwind 3 não re-gera classes em runtime, então o override atua nas
// variáveis semânticas (--background, --accent, ...) e nas --brand-* que
// alimentam elementos estilizados por CSS vars.
import { brandCssVars, type OrgBrand } from '@/lib/brand'

export function BrandTheme({ brand }: { brand: OrgBrand | null | undefined }) {
  const vars = brandCssVars(brand)
  if (Object.keys(vars).length === 0) return null

  const css = `:root {\n${Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')}\n}`

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
