function escapePlainLineForHtml(line: string): string {
  return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * TipTap `setContent` input: empty → empty doc; values that already look like HTML pass through;
 * otherwise treated as legacy plain text (paragraphs split on blank lines).
 */
export function plainOrHtmlToEditorHtml(stored: string | undefined): string {
  const s = stored ?? '';
  const t = s.trim();
  if (!t) return '<p></p>';
  if (t.startsWith('<')) return s;
  const blocks = s.split(/\r?\n\r?\n/);
  return blocks
    .map((block) => {
      const inner = block.split(/\r?\n/).map((line) => escapePlainLineForHtml(line)).join('<br>');
      return `<p>${inner || '<br>'}</p>`;
    })
    .join('');
}

/** Plain text for previews / counts. Not a security sanitizer. */
export function richTextPlainText(htmlOrPlain: string | undefined): string {
  if (!htmlOrPlain) return '';
  const t = htmlOrPlain.trim();
  if (!t) return '';
  if (!t.includes('<')) return t;
  return t
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isRichTextEmpty(htmlOrPlain: string | undefined): boolean {
  return richTextPlainText(htmlOrPlain).length === 0;
}

export type RichTextLinkPreview = {
  href: string;
  /** Primary line (usually hostname). */
  title: string;
  /** Secondary line (full URL, may wrap). */
  subtitle: string;
};

/** Human-readable lines for link hover cards (hostname + full URL). */
export function richTextLinkPreview(href: string): RichTextLinkPreview {
  const trimmed = href.trim();
  if (!trimmed) return { href: '', title: '', subtitle: '' };
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./i, '');
    const path = `${u.pathname}${u.search}`.replace(/\/$/, '') || '';
    const title = host || trimmed;
    const subtitle = path && path !== '/' ? `${host}${path}` : u.href;
    return { href: u.href, title, subtitle };
  } catch {
    return { href: trimmed, title: trimmed, subtitle: trimmed };
  }
}

/** Normalize user-entered URLs for TipTap link marks (blocks script/data URLs). */
export function normalizeRichTextLinkHref(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(javascript|data|vbscript):/i.test(url)) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^mailto:/i.test(url)) return url;
  return `https://${url}`;
}
