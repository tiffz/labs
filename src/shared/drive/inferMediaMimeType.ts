/**
 * Maps common DAW / OS export extensions when the browser leaves `File.type` empty or uses
 * `application/octet-stream` (typical for Logic `.m4a` and some `.wav` exports).
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wave': 'audio/wav',
  '.aif': 'audio/aiff',
  '.aiff': 'audio/aiff',
  '.caf': 'audio/x-caf',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/opus',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
};

function extensionLower(name: string): string {
  const n = name.trim().toLowerCase();
  const dot = n.lastIndexOf('.');
  return dot >= 0 ? n.slice(dot) : '';
}

/**
 * Best-effort MIME for uploads and drag/drop routing. Trusts real `audio/*` and `video/*` types;
 * otherwise guesses from the filename extension.
 */
export function inferMediaMimeType(file: Pick<File, 'name' | 'type'>): string {
  const t = (file.type || '').trim();
  const tl = t.toLowerCase();
  if (tl.startsWith('audio/') || tl.startsWith('video/')) return t;
  if (tl === 'application/ogg') return t;

  const ext = extensionLower(file.name || '');
  const guessed = ext ? EXTENSION_TO_MIME[ext] : undefined;
  if (guessed) return guessed;

  if (tl && tl !== 'application/octet-stream') return t;
  return 'application/octet-stream';
}
