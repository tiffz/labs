const MUSIC_EXTS = ['.musicxml', '.xml', '.mxl', '.mid', '.midi', '.mscz', '.mscx'];
const MEDIA_EXTS = ['.mp3', '.mp4', '.wav', '.ogg', '.webm', '.m4a', '.aac', '.flac', '.aiff'];
const MIDI_MIME_TYPES = new Set([
  'audio/midi',
  'audio/x-midi',
  'audio/mid',
  'application/x-midi',
  'application/midi',
]);

function getFileExt(name: string): string {
  return name.toLowerCase().replace(/^.*(\.[^.]+)$/, '$1');
}

function isMusicMimeType(type: string): boolean {
  return MIDI_MIME_TYPES.has(type.toLowerCase());
}

export function isMusicFile(file: File): boolean {
  if (isMusicMimeType(file.type)) return true;
  return MUSIC_EXTS.includes(getFileExt(file.name));
}

export function isMediaFile(file: File): boolean {
  if (isMusicFile(file)) return false;
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) return true;
  return MEDIA_EXTS.includes(getFileExt(file.name));
}

export function getImportFileKind(file: File): 'music' | 'media' | 'unsupported' {
  if (isMusicFile(file)) return 'music';
  if (isMediaFile(file)) return 'media';
  return 'unsupported';
}

