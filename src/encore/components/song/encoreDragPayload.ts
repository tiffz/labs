import { inferMediaMimeType } from '../../../shared/drive/inferMediaMimeType';
import type { SongMediaUploadSlot } from './songMediaUploadSlot';

const ALL_SLOTS: SongMediaUploadSlot[] = ['listen', 'play', 'charts', 'takes', 'misc'];

function mimeToCategories(mime: string): { chart: boolean; av: boolean } {
  const m = mime.toLowerCase();
  const chart =
    m === 'application/pdf' ||
    m.startsWith('image/') ||
    m.includes('opendocument') ||
    m.includes('sheet') ||
    m.endsWith('xml') ||
    m.includes('musicxml');
  const av =
    m.startsWith('audio/') ||
    m.startsWith('video/') ||
    m === 'application/ogg' ||
    m.includes('webm');
  return { chart, av };
}

export function eligibleSlotsForFiles(files: File[]): Set<SongMediaUploadSlot> | null {
  if (files.length === 0) return null;
  let chartOk = true;
  let avOk = true;
  for (const f of files) {
    const effectiveMime = inferMediaMimeType(f);
    const { chart, av } = mimeToCategories(effectiveMime);
    const unknown = !chart && !av && !f.type && effectiveMime === 'application/octet-stream';
    if (unknown) {
      return new Set(ALL_SLOTS);
    }
    chartOk &&= chart;
    avOk &&= av;
  }
  const out = new Set<SongMediaUploadSlot>();
  if (chartOk) out.add('charts');
  if (avOk) {
    out.add('listen');
    out.add('play');
    out.add('takes');
  }
  out.add('misc');
  return out.size > 0 ? out : new Set(ALL_SLOTS);
}

export function eligibleSlotsForUrlDrop(): Set<SongMediaUploadSlot> {
  return new Set(ALL_SLOTS);
}

export function hasPotentialUrlPayload(dt: DataTransfer | null): boolean {
  if (!dt?.types) return false;
  if (dt.types.includes('text/uri-list')) return true;
  if (dt.types.includes('text/plain')) {
    const t = dt.getData('text/plain')?.trim() ?? '';
    return /^https?:\/\//i.test(t);
  }
  return false;
}

export function eligibleSlotsForDragDataTransfer(dt: DataTransfer | null): Set<SongMediaUploadSlot> | null {
  if (!dt) return null;
  if (dt.types.includes('Files')) {
    const { files } = dt;
    if (files && files.length > 0) {
      return eligibleSlotsForFiles(Array.from(files));
    }
    if (dt.items) {
      const faux: File[] = [];
      for (let i = 0; i < dt.items.length; i++) {
        const it = dt.items[i];
        if (it?.kind === 'file') {
          const f = it.getAsFile();
          if (f) faux.push(f);
        }
      }
      if (faux.length > 0) return eligibleSlotsForFiles(faux);
    }
    return new Set(ALL_SLOTS);
  }
  if (hasPotentialUrlPayload(dt)) {
    return eligibleSlotsForUrlDrop();
  }
  return null;
}

export function dragPayloadRelevantToMediaHub(dt: DataTransfer | null): boolean {
  return Boolean(dt?.types?.includes('Files')) || hasPotentialUrlPayload(dt);
}
