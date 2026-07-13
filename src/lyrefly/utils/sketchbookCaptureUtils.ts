import type { SketchbookSeedKind } from '../types';

const URL_RE = /^https?:\/\//i;

export type SketchbookCaptureDraft = {
  kind: SketchbookSeedKind;
  title: string;
  bodyHtml?: string;
  url?: string;
  occurredOn?: string;
  fileName?: string;
  mimeType?: string;
};

export function inferSketchbookCaptureFromText(text: string): SketchbookCaptureDraft | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const firstToken = trimmed.split(/\s+/)[0] ?? '';
  if (URL_RE.test(firstToken)) {
    let title = firstToken;
    try {
      title = new URL(firstToken).hostname.replace(/^www\./, '');
    } catch {
      /* keep raw url host fragment */
    }
    const rest = trimmed.slice(firstToken.length).trim();
    return {
      kind: 'link',
      title: rest ? rest.split('\n')[0]!.slice(0, 120) : title,
      url: firstToken,
      bodyHtml: rest || undefined,
    };
  }

  const firstLine = trimmed.split('\n')[0] ?? 'Untitled';
  const isShortFlash = !trimmed.includes('\n\n') && trimmed.length <= 480;
  if (isShortFlash) {
    return {
      kind: 'daily_flash',
      title: firstLine.slice(0, 120) || 'Daily flash',
      bodyHtml: trimmed,
      occurredOn: new Date().toISOString().slice(0, 10),
    };
  }

  return {
    kind: 'idea',
    title: firstLine.slice(0, 120) || 'Untitled idea',
    bodyHtml: trimmed,
  };
}

export function sketchbookKindLabel(kind: SketchbookSeedKind): string {
  switch (kind) {
    case 'image':
      return 'Concept art';
    case 'file':
      return 'File';
    case 'link':
      return 'Link';
    case 'daily_flash':
      return 'Daily flash';
    default:
      return 'Note';
  }
}

export function isSketchbookImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isSketchbookAttachableFile(file: File): boolean {
  if (isSketchbookImageFile(file)) return true;
  const type = file.type.toLowerCase();
  if (type === 'application/pdf') return true;
  if (type.includes('document') || type.includes('text')) return true;
  const name = file.name.toLowerCase();
  return /\.(pdf|doc|docx|txt|md|rtf|gdoc)$/i.test(name);
}
