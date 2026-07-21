// SERVER-ONLY — não importar em componente client (usa sanitize-html/Node).
// Limpa o HTML da copy do evento (vindo do editor do produtor) antes de gravar,
// já que ele é renderizado na página pública. Allowlist restrita = sem XSS.
import sanitizeHtml from 'sanitize-html';

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'h3', 'blockquote', 'span'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Todo link externo abre em nova aba e sem passar referência/pagerank.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: 'a',
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
    }),
  },
  // Remove atributos de estilo/eventos (não estão na allowlist) e tags vazias sobrando.
  exclusiveFilter: (frame) =>
    ['p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's'].includes(frame.tag) &&
    !frame.text.trim() &&
    !frame.mediaChildren.length,
};

export function sanitizeEventHtml(dirty: string): string {
  return sanitizeHtml(dirty ?? '', OPTIONS).trim();
}

// Extrai texto plano do HTML (para events.description → meta description / SEO).
export function htmlToPlainText(html: string): string {
  const withBreaks = (html ?? '')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '$&\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const text = sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} });
  return text.replace(/\n{2,}/g, '\n').replace(/[ \t]+/g, ' ').trim();
}
