import type { TwoColumnChartExport } from './chordChartTwoColumnExport';

const CHORD_LINE_TOKEN_RE =
  /^[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus2|sus4|add2|add9|m7|maj7|7|9|11|13|6|\+|\([^)]+\))?(?:\/[A-G](?:#|b)?)?$/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlPreservingSpaces(text: string): string {
  return escapeHtml(text).replace(/ /g, '&nbsp;');
}

/** True when every whitespace-separated token on the line is a chord symbol. */
export function isAsciiChartChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\[[^\]]+\]$/.test(trimmed)) return false;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => CHORD_LINE_TOKEN_RE.test(token));
}

function chartLineClass(line: string): string {
  if (line.length === 0) return 'chart-line empty';
  const trimmed = line.trim();
  if (/^\[[^\]]+\]$/.test(trimmed)) return 'chart-line section-header';
  if (isAsciiChartChordLine(line)) return 'chart-line chord-line';
  return 'chart-line';
}

/** Render monospace ASCII chart text as styled HTML lines for print/PDF. */
export function asciiChartTextToPrintHtml(text: string): string {
  return text.split('\n').map((line) => {
    const className = chartLineClass(line);
    const content = line.length === 0 ? '&nbsp;' : escapeHtmlPreservingSpaces(line);
    return `<div class="${className}">${content}</div>`;
  }).join('');
}

const PRINT_STYLES = `
  @page { margin: 0; size: letter portrait; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", Courier, monospace;
    font-size: 10pt;
    line-height: 1.35;
    color: #111;
    margin: 0;
    padding: 0.75in;
    box-sizing: border-box;
    min-height: 100vh;
  }
  .chart { margin: 0; }
  .title {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 13pt;
    font-weight: 700;
    margin: 0 0 0.85rem;
    line-height: 1.25;
  }
  .chart-line {
    white-space: pre;
    font-size: inherit;
    line-height: 1.55;
    margin: 0;
    font-weight: 500;
  }
  .chart-line.chord-line { font-weight: 800; }
  .chart-line.section-header { font-weight: 700; }
  .chart-line.empty { line-height: 1.15; }
  .cols { display: flex; gap: 1.5rem; align-items: flex-start; }
  .col { flex: 1; min-width: 0; }
  @media print {
    body { padding: 0.75in; }
  }
`;

function buildPrintDocumentHtml(bodyHtml: string, title: string): string {
  const safeTitle = title.replace(/</g, '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`;
}

/** Open a print-friendly view for a chord chart (Save as PDF via browser print). */
export function openMonospaceChartPrintWindow(
  exportData: TwoColumnChartExport | string,
  title: string,
): void {
  const single = typeof exportData === 'string' ? exportData : exportData.single;
  if (!single.trim()) return;

  const twoColumn =
    typeof exportData === 'string' ? null : exportData.right.trim() ? exportData : null;

  const safeTitle = escapeHtml(title.trim() || 'Chord chart');
  const bodyHtml = twoColumn
    ? `<article class="chart"><h1 class="title">${safeTitle}</h1><div class="cols"><div class="col">${asciiChartTextToPrintHtml(twoColumn.left)}</div><div class="col">${asciiChartTextToPrintHtml(twoColumn.right)}</div></div></article>`
    : `<article class="chart"><h1 class="title">${safeTitle}</h1><div class="content">${asciiChartTextToPrintHtml(single)}</div></article>`;

  const html = buildPrintDocumentHtml(bodyHtml, title.trim() || 'Chord chart');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const triggerPrint = () => {
    win.focus();
    win.print();
    win.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);
  };

  if (doc.readyState === 'complete') {
    window.setTimeout(triggerPrint, 150);
  } else {
    iframe.onload = () => window.setTimeout(triggerPrint, 150);
  }
}
