import type { DragEndEvent } from '@dnd-kit/core';
import { songWithSyncedLegacyDriveIds } from '../utils/songAttachments';
import type { EncoreMediaLink, EncoreMiscResource, EncoreSong, EncoreSongAttachment } from '../types';
import {
  findMediaLinkInSong,
  isDriveMediaLink,
  linkSectionForSong,
  parsePracticeResourceDragId,
  sectionAcceptsLinkDrop,
  sectionForAttachmentKind,
  type ParsedPracticeResourceDragId,
  type PracticeResourceLinkSection,
} from './practiceResourceDragIds';
import { miscResourceFromAttachment, miscResourceFromMediaLink } from './practiceResourceConversions';
import { ensureSongHasDerivedMediaLinks, syncSongLegacyMediaIds, appendDriveBackingLink } from './songMediaLinks';

function moveArrayItemByKey<T>(
  items: T[],
  activeKey: string,
  overKey: string | null,
  getKey: (item: T) => string,
): T[] {
  const from = items.findIndex((item) => getKey(item) === activeKey);
  if (from < 0) return items;
  const removed = items[from]!;
  const without = items.filter((_, index) => index !== from);
  if (overKey) {
    const to = without.findIndex((item) => getKey(item) === overKey);
    if (to >= 0) {
      const next = [...without];
      next.splice(to, 0, removed);
      return next;
    }
  }
  return [...without, removed];
}

function normalizeLinkForSection(
  link: EncoreMediaLink,
  section: PracticeResourceLinkSection,
  makePrimary: boolean,
): EncoreMediaLink {
  const next: EncoreMediaLink = { ...link };
  if (section === 'listen') {
    next.isPrimaryReference = makePrimary;
    delete next.isPrimaryBacking;
    if (next.source === 'youtube') {
      next.youtubeKind = 'reference';
    }
  } else {
    next.isPrimaryBacking = makePrimary;
    delete next.isPrimaryReference;
    if (next.source === 'youtube') {
      next.youtubeKind = 'karaoke';
    }
  }
  return next;
}

export function reorderReferenceLinks(
  song: EncoreSong,
  activeLinkId: string,
  overLinkId: string | null,
): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(song);
  const refs = base.referenceLinks ?? [];
  const nextRefs = moveArrayItemByKey(refs, activeLinkId, overLinkId, (l) => l.id);
  if (nextRefs === refs) return song;
  return syncSongLegacyMediaIds({ ...base, referenceLinks: nextRefs });
}

export function reorderBackingLinks(
  song: EncoreSong,
  activeLinkId: string,
  overLinkId: string | null,
): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(song);
  const backing = base.backingLinks ?? [];
  const nextBacking = moveArrayItemByKey(backing, activeLinkId, overLinkId, (l) => l.id);
  if (nextBacking === backing) return song;
  return syncSongLegacyMediaIds({ ...base, backingLinks: nextBacking });
}

export function moveMediaLinkToSection(
  song: EncoreSong,
  linkId: string,
  targetSection: PracticeResourceLinkSection,
  insertBeforeLinkId?: string | null,
): EncoreSong {
  const base = ensureSongHasDerivedMediaLinks(song);
  const sourceSection = linkSectionForSong(base, linkId);
  if (!sourceSection) return song;

  let refs = [...(base.referenceLinks ?? [])];
  let backing = [...(base.backingLinks ?? [])];
  const fromRefs = sourceSection === 'listen';
  const sourceList = fromRefs ? refs : backing;
  const linkIndex = sourceList.findIndex((l) => l.id === linkId);
  if (linkIndex < 0) return song;
  const [link] = sourceList.splice(linkIndex, 1);
  if (!link) return song;

  if (fromRefs) refs = sourceList;
  else backing = sourceList;

  if (sourceSection === targetSection) {
    // Link was already removed from targetList — re-insert before reordering.
    const targetList = targetSection === 'listen' ? [...refs] : [...backing];
    if (insertBeforeLinkId) {
      const insertAt = targetList.findIndex((l) => l.id === insertBeforeLinkId);
      if (insertAt >= 0) targetList.splice(insertAt, 0, link);
      else targetList.push(link);
    } else {
      targetList.push(link);
    }
    if (targetSection === 'listen') refs = targetList;
    else backing = targetList;
    return syncSongLegacyMediaIds({ ...base, referenceLinks: refs, backingLinks: backing });
  }

  const targetList = targetSection === 'listen' ? refs : backing;
  const makePrimary =
    targetSection === 'listen'
      ? !targetList.some((l) => l.isPrimaryReference)
      : !targetList.some((l) => l.isPrimaryBacking);
  const moved = normalizeLinkForSection(link, targetSection, makePrimary);

  if (insertBeforeLinkId) {
    const insertAt = targetList.findIndex((l) => l.id === insertBeforeLinkId);
    if (insertAt >= 0) targetList.splice(insertAt, 0, moved);
    else targetList.push(moved);
  } else {
    targetList.push(moved);
  }

  if (targetSection === 'listen') refs = targetList;
  else backing = targetList;

  if (sourceSection === 'listen' && refs.length > 0 && !refs.some((l) => l.isPrimaryReference)) {
    refs = refs.map((l, i) => ({ ...l, isPrimaryReference: i === 0 }));
  }
  if (sourceSection === 'play' && backing.length > 0 && !backing.some((l) => l.isPrimaryBacking)) {
    backing = backing.map((l, i) => ({ ...l, isPrimaryBacking: i === 0 }));
  }

  return syncSongLegacyMediaIds({ ...base, referenceLinks: refs, backingLinks: backing });
}

export function reorderAttachmentsOfKind(
  song: EncoreSong,
  kind: EncoreSongAttachment['kind'],
  activeDriveFileId: string,
  overDriveFileId: string | null,
): EncoreSong {
  const attachments = [...(song.attachments ?? [])];
  const ofKind = attachments.filter((a) => a.kind === kind);
  const reordered = moveArrayItemByKey(
    ofKind,
    activeDriveFileId,
    overDriveFileId,
    (a) => a.driveFileId,
  );
  if (reordered === ofKind) return song;
  let kindIndex = 0;
  const next = attachments.map((a) => {
    if (a.kind !== kind) return a;
    return reordered[kindIndex++]!;
  });
  return songWithSyncedLegacyDriveIds({
    ...song,
    attachments: next,
    updatedAt: new Date().toISOString(),
  });
}

function repairPrimaryLinkFlags(
  base: EncoreSong,
  refs: EncoreMediaLink[],
  backing: EncoreMediaLink[],
): { referenceLinks: EncoreMediaLink[]; backingLinks: EncoreMediaLink[] } {
  let nextRefs = refs;
  let nextBacking = backing;
  if (nextRefs.length > 0 && !nextRefs.some((l) => l.isPrimaryReference)) {
    nextRefs = nextRefs.map((l, i) => ({ ...l, isPrimaryReference: i === 0 }));
  }
  if (nextBacking.length > 0 && !nextBacking.some((l) => l.isPrimaryBacking)) {
    nextBacking = nextBacking.map((l, i) => ({ ...l, isPrimaryBacking: i === 0 }));
  }
  return { referenceLinks: nextRefs, backingLinks: nextBacking };
}

function removeMediaLinkFromSong(
  song: EncoreSong,
  linkId: string,
): { song: EncoreSong; link: EncoreMediaLink; sourceSection: PracticeResourceLinkSection } | null {
  const base = ensureSongHasDerivedMediaLinks(song);
  const sourceSection = linkSectionForSong(base, linkId);
  if (!sourceSection) return null;

  let refs = [...(base.referenceLinks ?? [])];
  let backing = [...(base.backingLinks ?? [])];
  const fromRefs = sourceSection === 'listen';
  const sourceList = fromRefs ? refs : backing;
  const linkIndex = sourceList.findIndex((l) => l.id === linkId);
  if (linkIndex < 0) return null;
  const [link] = sourceList.splice(linkIndex, 1);
  if (!link) return null;

  if (fromRefs) refs = sourceList;
  else backing = sourceList;

  const repaired = repairPrimaryLinkFlags(base, refs, backing);
  return {
    song: syncSongLegacyMediaIds({
      ...base,
      referenceLinks: repaired.referenceLinks,
      backingLinks: repaired.backingLinks,
    }),
    link,
    sourceSection,
  };
}

function insertRecordingAttachment(
  song: EncoreSong,
  att: EncoreSongAttachment,
  insertBeforeDriveFileId?: string | null,
): EncoreSong {
  const attachments = (song.attachments ?? []).filter((a) => a.driveFileId !== att.driveFileId);
  const recordings = attachments.filter((a) => a.kind === 'recording');
  const others = attachments.filter((a) => a.kind !== 'recording');
  const reorderedRecs = moveArrayItemByKey(
    [...recordings, att],
    att.driveFileId,
    insertBeforeDriveFileId ?? null,
    (a) => a.driveFileId,
  );
  return songWithSyncedLegacyDriveIds({
    ...song,
    attachments: [...others, ...reorderedRecs],
    updatedAt: new Date().toISOString(),
  });
}

export function moveMediaLinkToTakes(
  song: EncoreSong,
  linkId: string,
  insertBeforeDriveFileId?: string | null,
): EncoreSong {
  const removed = removeMediaLinkFromSong(song, linkId);
  if (!removed || !isDriveMediaLink(removed.link) || !removed.link.driveFileId?.trim()) return song;
  const fid = removed.link.driveFileId.trim();
  const att: EncoreSongAttachment = {
    kind: 'recording',
    driveFileId: fid,
    label: removed.link.label,
    notes: removed.link.notes,
    encoreShortcutDriveFileId: removed.link.encoreShortcutDriveFileId,
  };
  return insertRecordingAttachment(removed.song, att, insertBeforeDriveFileId);
}

export function moveMediaLinkToMisc(
  song: EncoreSong,
  linkId: string,
  insertBeforeMiscId?: string | null,
): EncoreSong {
  const removed = removeMediaLinkFromSong(song, linkId);
  if (!removed) return song;
  const misc = miscResourceFromMediaLink(removed.link);
  return appendMiscResourceOrdered(removed.song, misc, insertBeforeMiscId);
}

function appendMiscResourceOrdered(
  song: EncoreSong,
  resource: EncoreMiscResource,
  insertBeforeMiscId?: string | null,
): EncoreSong {
  const without = (song.miscResources ?? []).filter((r) => r.id !== resource.id);
  if (insertBeforeMiscId) {
    const insertAt = without.findIndex((r) => r.id === insertBeforeMiscId);
    if (insertAt >= 0) {
      const next = [...without];
      next.splice(insertAt, 0, resource);
      return { ...song, miscResources: next, updatedAt: new Date().toISOString() };
    }
  }
  return {
    ...song,
    miscResources: [...without, resource],
    updatedAt: new Date().toISOString(),
  };
}

export function reorderMiscResources(
  song: EncoreSong,
  activeResourceId: string,
  overResourceId: string | null,
): EncoreSong {
  const cur = song.miscResources ?? [];
  const next = moveArrayItemByKey(cur, activeResourceId, overResourceId, (r) => r.id);
  if (next === cur) return song;
  return { ...song, miscResources: next, updatedAt: new Date().toISOString() };
}

function removeAttachmentFromSong(
  song: EncoreSong,
  kind: EncoreSongAttachment['kind'],
  driveFileId: string,
): { song: EncoreSong; attachment: EncoreSongAttachment } | null {
  const fid = driveFileId.trim();
  const attachments = [...(song.attachments ?? [])];
  const index = attachments.findIndex((a) => a.kind === kind && a.driveFileId === fid);
  if (index < 0) return null;
  const [attachment] = attachments.splice(index, 1);
  if (!attachment) return null;

  let next = attachments;
  if (kind === 'chart' && attachment.isPrimaryChart) {
    const nextChart = next.find((a) => a.kind === 'chart');
    if (nextChart) {
      next = next.map((a) =>
        a.kind === 'chart' ? { ...a, isPrimaryChart: a.driveFileId === nextChart.driveFileId } : a,
      );
    }
  }

  return {
    song: songWithSyncedLegacyDriveIds({
      ...song,
      attachments: next,
      updatedAt: new Date().toISOString(),
    }),
    attachment,
  };
}

export function moveAttachmentToTakes(
  song: EncoreSong,
  fromKind: EncoreSongAttachment['kind'],
  driveFileId: string,
  insertBeforeDriveFileId?: string | null,
): EncoreSong {
  if (fromKind === 'recording') {
    return reorderAttachmentsOfKind(song, 'recording', driveFileId, insertBeforeDriveFileId ?? null);
  }
  const removed = removeAttachmentFromSong(song, fromKind, driveFileId);
  if (!removed) return song;
  const att: EncoreSongAttachment = {
    kind: 'recording',
    driveFileId: removed.attachment.driveFileId,
    label: removed.attachment.label,
    notes: removed.attachment.notes,
    encoreShortcutDriveFileId: removed.attachment.encoreShortcutDriveFileId,
  };
  return insertRecordingAttachment(removed.song, att, insertBeforeDriveFileId);
}

export function moveAttachmentToMisc(
  song: EncoreSong,
  kind: EncoreSongAttachment['kind'],
  driveFileId: string,
  insertBeforeMiscId?: string | null,
): EncoreSong {
  const removed = removeAttachmentFromSong(song, kind, driveFileId);
  if (!removed) return song;
  const misc = miscResourceFromAttachment(removed.attachment);
  return appendMiscResourceOrdered(removed.song, misc, insertBeforeMiscId);
}

export function moveAttachmentToPlay(
  song: EncoreSong,
  fromKind: EncoreSongAttachment['kind'],
  driveFileId: string,
  insertBeforeLinkId?: string | null,
): EncoreSong {
  const removed = removeAttachmentFromSong(song, fromKind, driveFileId);
  if (!removed) return song;
  const fid = removed.attachment.driveFileId;
  const label = removed.attachment.label;
  const next = appendDriveBackingLink(removed.song, fid, { label });
  if (!insertBeforeLinkId) return next;
  const backing = [...(next.backingLinks ?? [])];
  const added = backing.find((l) => l.source === 'drive' && l.driveFileId === fid);
  if (!added) return next;
  const without = backing.filter((l) => l.id !== added.id);
  const insertAt = without.findIndex((l) => l.id === insertBeforeLinkId);
  const reordered =
    insertAt >= 0
      ? [...without.slice(0, insertAt), added, ...without.slice(insertAt)]
      : [...without, added];
  return syncSongLegacyMediaIds({ ...next, backingLinks: reordered });
}

type PracticeResourceDropResolution =
  | { kind: 'link-section'; section: PracticeResourceLinkSection; insertBeforeLinkId: string | null }
  | { kind: 'attachment-reorder'; attachmentKind: EncoreSongAttachment['kind']; overDriveFileId: string | null }
  | { kind: 'takes'; insertBeforeDriveFileId: string | null }
  | { kind: 'play'; insertBeforeLinkId: string | null }
  | { kind: 'misc'; insertBeforeMiscId: string | null };

function resolvePracticeResourceDrop(
  song: EncoreSong,
  active: ParsedPracticeResourceDragId,
  over: ParsedPracticeResourceDragId,
): PracticeResourceDropResolution | null {
  if (active.kind === 'link') {
    const link = findMediaLinkInSong(song, active.linkId);
    if (!link) return null;

    if (over.kind === 'link') {
      const section = linkSectionForSong(song, over.linkId);
      if (!section) return null;
      return { kind: 'link-section', section, insertBeforeLinkId: over.linkId };
    }
    if (over.kind === 'section') {
      if (sectionAcceptsLinkDrop(over.section)) {
        return { kind: 'link-section', section: over.section, insertBeforeLinkId: null };
      }
      if (over.section === 'takes' && isDriveMediaLink(link)) {
        return { kind: 'takes', insertBeforeDriveFileId: null };
      }
      if (over.section === 'misc') {
        return { kind: 'misc', insertBeforeMiscId: null };
      }
      return null;
    }
    if (over.kind === 'misc') {
      return { kind: 'misc', insertBeforeMiscId: over.resourceId };
    }
    if (over.kind === 'attachment' && over.attachmentKind === 'recording' && isDriveMediaLink(link)) {
      return { kind: 'takes', insertBeforeDriveFileId: over.driveFileId };
    }
    return null;
  }

  if (active.kind === 'attachment') {
    const home = sectionForAttachmentKind(active.attachmentKind);

    if (over.kind === 'section') {
      if (home && over.section === home) {
        return { kind: 'attachment-reorder', attachmentKind: active.attachmentKind, overDriveFileId: null };
      }
      if (over.section === 'takes' && (active.attachmentKind === 'chart' || active.attachmentKind === 'recording')) {
        return { kind: 'takes', insertBeforeDriveFileId: null };
      }
      if (over.section === 'play' && active.attachmentKind === 'chart') {
        return { kind: 'play', insertBeforeLinkId: null };
      }
      if (over.section === 'misc') {
        return { kind: 'misc', insertBeforeMiscId: null };
      }
      return null;
    }
    if (over.kind === 'attachment') {
      if (over.attachmentKind === active.attachmentKind) {
        return {
          kind: 'attachment-reorder',
          attachmentKind: active.attachmentKind,
          overDriveFileId: over.driveFileId,
        };
      }
      if (over.attachmentKind === 'recording' && active.attachmentKind === 'chart') {
        return { kind: 'takes', insertBeforeDriveFileId: over.driveFileId };
      }
      return null;
    }
    if (over.kind === 'link') {
      const section = linkSectionForSong(song, over.linkId);
      if (section === 'play' && active.attachmentKind === 'chart') {
        return { kind: 'play', insertBeforeLinkId: over.linkId };
      }
      return null;
    }
    if (over.kind === 'misc') {
      return { kind: 'misc', insertBeforeMiscId: over.resourceId };
    }
    return null;
  }

  if (active.kind === 'misc') {
    if (over.kind === 'section' && over.section === 'misc') {
      return { kind: 'misc', insertBeforeMiscId: null };
    }
    if (over.kind === 'misc') {
      return { kind: 'misc', insertBeforeMiscId: over.resourceId };
    }
    return null;
  }

  return null;
}

/** Whether `overDragId` is a valid drop target for the active chip (UI + collision). */
export function canDropPracticeResource(
  song: EncoreSong,
  activeDragId: string,
  overDragId: string,
): boolean {
  if (activeDragId === overDragId) return false;
  const activeParsed = parsePracticeResourceDragId(activeDragId);
  const overParsed = parsePracticeResourceDragId(overDragId);
  if (!activeParsed || !overParsed) return false;
  return resolvePracticeResourceDrop(song, activeParsed, overParsed) !== null;
}

/** Applies a completed chip drag to song draft state. */
export function applyPracticeResourceDragEnd(song: EncoreSong, event: DragEndEvent): EncoreSong {
  const activeId = event.active?.id;
  const overId = event.over?.id;
  if (activeId == null || overId == null || activeId === overId) return song;

  const activeParsed = parsePracticeResourceDragId(String(activeId));
  const overParsed = parsePracticeResourceDragId(String(overId));
  if (!activeParsed || !overParsed) return song;

  const drop = resolvePracticeResourceDrop(song, activeParsed, overParsed);
  if (!drop) return song;

  if (activeParsed.kind === 'link') {
    if (drop.kind === 'link-section') {
      const sourceSection = linkSectionForSong(song, activeParsed.linkId);
      if (!sourceSection) return song;
      if (sourceSection === drop.section) {
        return drop.section === 'listen'
          ? reorderReferenceLinks(song, activeParsed.linkId, drop.insertBeforeLinkId)
          : reorderBackingLinks(song, activeParsed.linkId, drop.insertBeforeLinkId);
      }
      return moveMediaLinkToSection(
        song,
        activeParsed.linkId,
        drop.section,
        drop.insertBeforeLinkId,
      );
    }
    if (drop.kind === 'takes') {
      return moveMediaLinkToTakes(song, activeParsed.linkId, drop.insertBeforeDriveFileId);
    }
    if (drop.kind === 'misc') {
      return moveMediaLinkToMisc(song, activeParsed.linkId, drop.insertBeforeMiscId);
    }
    return song;
  }

  if (activeParsed.kind === 'attachment') {
    if (drop.kind === 'attachment-reorder') {
      return reorderAttachmentsOfKind(
        song,
        drop.attachmentKind,
        activeParsed.driveFileId,
        drop.overDriveFileId,
      );
    }
    if (drop.kind === 'takes') {
      return moveAttachmentToTakes(
        song,
        activeParsed.attachmentKind,
        activeParsed.driveFileId,
        drop.insertBeforeDriveFileId,
      );
    }
    if (drop.kind === 'play') {
      return moveAttachmentToPlay(
        song,
        activeParsed.attachmentKind,
        activeParsed.driveFileId,
        drop.insertBeforeLinkId,
      );
    }
    if (drop.kind === 'misc') {
      return moveAttachmentToMisc(
        song,
        activeParsed.attachmentKind,
        activeParsed.driveFileId,
        drop.insertBeforeMiscId,
      );
    }
    return song;
  }

  if (activeParsed.kind === 'misc') {
    if (drop.kind === 'misc') {
      return reorderMiscResources(song, activeParsed.resourceId, drop.insertBeforeMiscId);
    }
  }

  return song;
}
