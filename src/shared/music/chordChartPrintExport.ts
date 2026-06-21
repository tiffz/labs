import {
  buildChordChartDownloadFileName,
  sanitizeLabsDownloadFileStem,
} from '../utils/labsDownloadFileName';
import { isAsciiChartChordLine, type TwoColumnChartExport } from './chordChartTwoColumnExport';

export type ChartPrintExportOptions = {
  /** Visible H1 in the print view */
  displayTitle: string;
  /** Optional line under the title (e.g. key + tempo) */
  subtitle?: string;
  /** Browser Save-as-PDF suggested name (no extension) */
  suggestedFileName: string;
};

export { isAsciiChartChordLine };

export function buildChartPrintExportOptions(songTitle: string): ChartPrintExportOptions {
  const displayTitle = sanitizeLabsDownloadFileStem(songTitle.trim()) || 'Untitled';
  return {
    displayTitle,
    suggestedFileName: buildChordChartDownloadFileName(songTitle),
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlPreservingSpaces(text: string): string {
  return escapeHtml(text).replace(/ /g, '&nbsp;');
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
  @page { margin: 0; size: letter landscape; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", Courier, monospace;
    font-size: 10pt;
    line-height: 1.35;
    color: #111;
    margin: 0;
    padding: 0.6in 0.75in;
    box-sizing: border-box;
    min-height: 100vh;
  }
  .chart { margin: 0; }
  .chart-header { margin: 0 0 0.85rem; }
  .title {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 20pt;
    font-weight: 400;
    margin: 0;
    line-height: 1.2;
  }
  .subtitle {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 12pt;
    font-weight: 400;
    color: #444;
    margin: 0.35rem 0 0;
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
    body { padding: 0.6in 0.75in; }
  }
`;

export function buildChartPrintHeaderHtml(options: ChartPrintExportOptions): string {
  const safeTitle = escapeHtml(options.displayTitle);
  const subtitleHtml = options.subtitle?.trim()
    ? `<p class="subtitle">${escapeHtml(options.subtitle.trim())}</p>`
    : '';
  return `<header class="chart-header"><h1 class="title">${safeTitle}</h1>${subtitleHtml}</header>`;
}

function buildPrintDocumentHtml(bodyHtml: string, documentTitle: string): string {
  const safeTitle = documentTitle.replace(/</g, '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`;
}

function openPrintHtmlInHiddenIframe(html: string, onPrint: (win: Window) => void): void {
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
    onPrint(win);
    win.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);
  };

  if (doc.readyState === 'complete') {
    window.setTimeout(triggerPrint, 150);
  } else {
    iframe.onload = () => window.setTimeout(triggerPrint, 150);
  }
}

/** Open a print-friendly view for a chord chart (Save as PDF via browser print). */
export function openMonospaceChartPrintWindow(
  exportData: TwoColumnChartExport | string,
  titleOrOptions: string | ChartPrintExportOptions,
): void {
  const single = typeof exportData === 'string' ? exportData : exportData.single;
  if (!single.trim()) return;

  const options =
    typeof titleOrOptions === 'string'
      ? buildChartPrintExportOptions(titleOrOptions)
      : titleOrOptions;

  const twoColumn =
    typeof exportData === 'string' ? null : exportData.right.trim() ? exportData : null;

  const headerHtml = buildChartPrintHeaderHtml(options);
  const bodyHtml = twoColumn
    ? `<article class="chart">${headerHtml}<div class="cols"><div class="col">${asciiChartTextToPrintHtml(twoColumn.left)}</div><div class="col">${asciiChartTextToPrintHtml(twoColumn.right)}</div></div></article>`
    : `<article class="chart">${headerHtml}<div class="content">${asciiChartTextToPrintHtml(single)}</div></article>`;

  const html = buildPrintDocumentHtml(bodyHtml, options.suggestedFileName);
  const printWin = window.open('about:blank', '_blank', 'noopener,noreferrer');

  if (printWin) {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.document.title = options.suggestedFileName;

    const triggerPrint = () => {
      printWin.focus();
      printWin.print();
      printWin.addEventListener('afterprint', () => printWin.close(), { once: true });
    };

    if (printWin.document.readyState === 'complete') {
      window.setTimeout(triggerPrint, 150);
    } else {
      printWin.onload = () => window.setTimeout(triggerPrint, 150);
    }
    return;
  }

  openPrintHtmlInHiddenIframe(html, (win) => {
    win.document.title = options.suggestedFileName;
    win.focus();
    win.print();
  });
}
