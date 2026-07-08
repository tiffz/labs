import type { EncoreMediaLink, EncoreSong, EncoreSongAttachment } from '../types';
import type { SongMediaUploadSlot } from '../components/song/songMediaUploadSlot';

export type PracticeResourceLinkSection = 'listen' | 'play';

export type ParsedPracticeResourceDragId =
  | { kind: 'link'; linkId: string }
  | { kind: 'attachment'; attachmentKind: EncoreSongAttachment['kind']; driveFileId: string }
  | { kind: 'misc'; resourceId: string }
  | { kind: 'section'; section: SongMediaUploadSlot };

export function practiceResourceLinkDragId(linkId: string): string {
  return `link:${linkId}`;
}

export function practiceResourceAttachmentDragId(
  kind: EncoreSongAttachment['kind'],
  driveFileId: string,
): string {
  return `att:${kind}:${driveFileId}`;
}

export function practiceResourceMiscDragId(resourceId: string): string {
  return `misc:${resourceId}`;
}

export function practiceResourceSectionDragId(section: SongMediaUploadSlot): string {
  return `section:${section}`;
}

export function parsePracticeResourceDragId(raw: string): ParsedPracticeResourceDragId | null {
  if (raw.startsWith('link:')) {
    const linkId = raw.slice('link:'.length);
    if (!linkId) return null;
    return { kind: 'link', linkId };
  }
  if (raw.startsWith('att:')) {
    const rest = raw.slice('att:'.length);
    const sep = rest.indexOf(':');
    if (sep <= 0) return null;
    const attachmentKind = rest.slice(0, sep) as EncoreSongAttachment['kind'];
    const driveFileId = rest.slice(sep + 1);
    if (!driveFileId) return null;
    if (attachmentKind !== 'chart' && attachmentKind !== 'recording' && attachmentKind !== 'backing') {
      return null;
    }
    return { kind: 'attachment', attachmentKind, driveFileId };
  }
  if (raw.startsWith('misc:')) {
    const resourceId = raw.slice('misc:'.length);
    if (!resourceId) return null;
    return { kind: 'misc', resourceId };
  }
  if (raw.startsWith('section:')) {
    const section = raw.slice('section:'.length) as SongMediaUploadSlot;
    if (!section) return null;
    return { kind: 'section', section };
  }
  return null;
}

export function findMediaLinkInSong(
  song: { referenceLinks?: EncoreMediaLink[]; backingLinks?: EncoreMediaLink[] },
  linkId: string,
): EncoreMediaLink | null {
  const ref = (song.referenceLinks ?? []).find((l) => l.id === linkId);
  if (ref) return ref;
  return (song.backingLinks ?? []).find((l) => l.id === linkId) ?? null;
}

export function isDriveMediaLink(link: EncoreMediaLink): boolean {
  return link.source === 'drive' && Boolean(link.driveFileId?.trim());
}

/** Which panel section owns a media link row (reference vs backing). */
export function linkSectionForSong(
  song: { referenceLinks?: { id: string }[]; backingLinks?: { id: string }[] },
  linkId: string,
): PracticeResourceLinkSection | null {
  if ((song.referenceLinks ?? []).some((l) => l.id === linkId)) return 'listen';
  if ((song.backingLinks ?? []).some((l) => l.id === linkId)) return 'play';
  return null;
}

export function sectionAcceptsLinkDrop(section: SongMediaUploadSlot): section is PracticeResourceLinkSection {
  return section === 'listen' || section === 'play';
}

export function sectionForAttachmentKind(
  kind: EncoreSongAttachment['kind'],
): SongMediaUploadSlot | null {
  if (kind === 'chart') return 'charts';
  if (kind === 'recording') return 'takes';
  return null;
}

/** Panel sections that accept the currently dragged chip. */
export function eligibleSectionsForPracticeResourceDrag(
  active: ParsedPracticeResourceDragId,
  song: EncoreSong,
): ReadonlySet<SongMediaUploadSlot> {
  if (active.kind === 'misc') {
    return new Set(['misc']);
  }
  if (active.kind === 'link') {
    const link = findMediaLinkInSong(song, active.linkId);
    const sections = new Set<SongMediaUploadSlot>(['listen', 'play', 'misc']);
    if (link && isDriveMediaLink(link)) {
      sections.add('takes');
    }
    return sections;
  }
  if (active.kind === 'attachment') {
    const sections = new Set<SongMediaUploadSlot>(['misc']);
    const home = sectionForAttachmentKind(active.attachmentKind);
    if (home) sections.add(home);
    if (active.attachmentKind === 'chart' || active.attachmentKind === 'recording') {
      sections.add('takes');
    }
    return sections;
  }
  return new Set();
}

export function sectionAcceptsPracticeResourceDrag(
  section: SongMediaUploadSlot,
  active: ParsedPracticeResourceDragId | null,
  song: EncoreSong | null,
): boolean {
  if (!active) return true;
  if (!song) return false;
  return eligibleSectionsForPracticeResourceDrag(active, song).has(section);
}
