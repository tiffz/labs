import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import {
  dragPayloadRelevantToMediaHub,
  hasPotentialUrlPayload,
} from '../components/song/encoreDragPayload';
import {
  ORIGINALS_SONG_FILE_SLOTS,
  type OriginalsSongFileSlot,
} from './originalsSongFileSlots';

function mimeCategories(mime: string): { audio: boolean; video: boolean; doc: boolean } {
  const m = mime.toLowerCase();
  const audio = m.startsWith('audio/') || m === 'application/ogg';
  const video = m.startsWith('video/');
  const doc =
    m === 'application/pdf' ||
    m.startsWith('image/') ||
    m.startsWith('text/') ||
    m.includes('document') ||
    m.includes('opendocument') ||
    m.includes('sheet') ||
    m.endsWith('xml') ||
    m.includes('musicxml');
  return { audio, video, doc };
}

/** True for a file a demo take can hold — audio or video. Twin of `ORIGINALS_DEMO_TAKE_ACCEPT`. */
export function isOriginalsTakeMediaFile(file: Pick<File, 'name' | 'type'>): boolean {
  const { audio, video } = mimeCategories(inferMediaMimeType(file));
  return audio || video;
}

export function eligibleOriginalsSlotsForFiles(files: File[]): Set<OriginalsSongFileSlot> | null {
  if (files.length === 0) return null;
  let audioOk = true;
  let mediaOk = true;
  let docOk = true;
  for (const f of files) {
    const mime = inferMediaMimeType(f);
    const { audio, video, doc } = mimeCategories(mime);
    const unknown = !audio && !video && !doc && !f.type && mime === 'application/octet-stream';
    if (unknown) return new Set(ORIGINALS_SONG_FILE_SLOTS);
    audioOk &&= audio;
    mediaOk &&= audio || video;
    docOk &&= doc;
  }
  const out = new Set<OriginalsSongFileSlot>();
  if (mediaOk) out.add('demoTakes');
  if (audioOk) out.add('references');
  if (docOk) {
    out.add('references');
    out.add('brainstormRefs');
  }
  return out.size > 0 ? out : new Set(ORIGINALS_SONG_FILE_SLOTS);
}

export function eligibleOriginalsSlotsForUrlDrop(): Set<OriginalsSongFileSlot> {
  return new Set(['references', 'brainstormRefs']);
}

export function eligibleOriginalsSlotsForDragDataTransfer(
  dt: DataTransfer | null,
): Set<OriginalsSongFileSlot> | null {
  if (!dt) return null;
  if (dt.types.includes('Files')) {
    const { files } = dt;
    if (files && files.length > 0) {
      return eligibleOriginalsSlotsForFiles(Array.from(files));
    }
    if (dt.items) {
      const faux: File[] = [];
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i];
        if (item?.kind === 'file') {
          const f = item.getAsFile();
          if (f) faux.push(f);
        }
      }
      if (faux.length > 0) return eligibleOriginalsSlotsForFiles(faux);
    }
    return new Set(ORIGINALS_SONG_FILE_SLOTS);
  }
  if (hasPotentialUrlPayload(dt)) {
    return eligibleOriginalsSlotsForUrlDrop();
  }
  return null;
}

export function originalsFileDragRelevant(dt: DataTransfer | null): boolean {
  return dragPayloadRelevantToMediaHub(dt);
}
