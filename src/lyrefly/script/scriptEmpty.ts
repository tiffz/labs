import { isScriptHtmlContent, parseScriptHtml } from './scriptHtmlParser';
import { parseScriptMarkdown } from './scriptLineParser';

/** True when the script has no parseable pages, panels, or lines. */
export function isScriptContentEmpty(markdown: string | undefined | null): boolean {
  const trimmed = (markdown ?? '').trim();
  if (!trimmed) return true;
  const blocks = isScriptHtmlContent(trimmed) ? parseScriptHtml(trimmed) : parseScriptMarkdown(trimmed);
  return blocks.length === 0;
}
