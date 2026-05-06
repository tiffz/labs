import type { StanzaSong } from './stanzaDb';

/**
 * Helpers that turn a browser `File` (or a drag-and-drop `DataTransfer`) into a Stanza-shaped
 * song row, without touching Dexie. Pulled out of `StanzaWorkspace` so the drop pipeline and the
 * button-pickers go through the same validation + row construction, and so the rules can be
 * unit-tested without spinning up the workspace component.
 *
 * Design notes:
 * - Stanza only handles audio today (`<audio>` element + YouTube iframe). Video files are filtered
 *   out so a stray `.mov` drop doesn't end up in the library producing a silent track.
 * - We make a fresh `Blob` from `arrayBuffer()` rather than keeping the `File` reference; this lets
 *   IndexedDB own the bytes outright (no implicit lifetime tie to the picked DOM `File`).
 */

/**
 * Generous audio sniff: MIME prefix `audio/` is the primary signal, with an extension fallback
 * because some browsers (Safari especially) hand us empty `file.type` for less-common formats.
 */
const AUDIO_EXTENSION_FALLBACK = /\.(mp3|m4a|aac|flac|wav|wave|ogg|oga|opus|webm|aiff?|caf|amr|wma)$/i;

export function isAudioFileForStanza(file: File): boolean {
  if (!file) return false;
  if (typeof file.type === 'string' && file.type.toLowerCase().startsWith('audio/')) return true;
  if (typeof file.name === 'string' && AUDIO_EXTENSION_FALLBACK.test(file.name)) return true;
  return false;
}

/**
 * Extracts the first audio-like file from a drag-and-drop payload, ignoring non-audio entries
 * (e.g. an accidental .mov sibling). Returns null when the payload is missing or has no audio.
 */
export function firstAudioFileFromDataTransfer(dt: DataTransfer | null | undefined): File | null {
  const files = dt?.files;
  if (!files || files.length === 0) return null;
  for (let i = 0; i < files.length; i += 1) {
    const f = files.item(i);
    if (f && isAudioFileForStanza(f)) return f;
  }
  return null;
}

/** Strip the trailing extension when titling a song from a filename (`.mp3` -> ``). */
export function stanzaSongTitleFromFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Local audio';
  return trimmed.replace(/\.[^/.]+$/, '') || trimmed;
}

/**
 * Build a Stanza-shaped song row from a picked or dropped file. Caller is responsible for
 * persisting via `stanzaDb.songs.put(row)` and for selecting it. Pure (no IndexedDB / no React)
 * so this can be exercised in jsdom tests without faking Dexie.
 *
 * @throws if `crypto.randomUUID` is unavailable (very old browsers); no other failure modes.
 */
export async function buildLocalAudioStanzaSong(file: File): Promise<StanzaSong> {
  if (!isAudioFileForStanza(file)) {
    throw new Error(`Not an audio file: ${file.name || 'unnamed file'}`);
  }
  const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' });
  return {
    id: crypto.randomUUID(),
    ytId: null,
    title: stanzaSongTitleFromFileName(file.name),
    markers: [],
    stats: {},
    updatedAt: Date.now(),
    localAudioBlob: blob,
  };
}
