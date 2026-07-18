import {
  defaultArrangementForCount,
  type MarkerPlacement,
  markerPlacementFromArrangement,
} from './characterArrangements';
import type {
  CharacterArrangementId,
  ComicCastMember,
  PanelCharacterId,
  PanelFillSpec,
  PanelTextBlock,
} from './types';
import { PANEL_CHARACTER_IDS } from './types';

export const DEFAULT_CAST_EMOJIS = ['🧑', '👩', '🧒'] as const;
const DEFAULT_CAST_LABELS = ['Alex', 'Riley', 'Sam'] as const;

export function createDefaultCast(): ComicCastMember[] {
  return DEFAULT_CAST_EMOJIS.map((emoji, index) => ({
    id: `cast-${PANEL_CHARACTER_IDS[index] ?? index}`,
    emoji,
    label: DEFAULT_CAST_LABELS[index] ?? (PANEL_CHARACTER_IDS[index] ?? String(index)).toUpperCase(),
  }));
}

export function newCastMemberId(): string {
  return `cast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function castMemberById(
  cast: ComicCastMember[],
  id: string | undefined,
): ComicCastMember | undefined {
  if (!id) return undefined;
  return cast.find((row) => row.id === id);
}

/** Placement slot for a speaker index within the panel (0→a, 1→b, 2→c). */
export function slotForSpeakerIndex(index: number): PanelCharacterId {
  return PANEL_CHARACTER_IDS[Math.max(0, Math.min(2, index))] ?? 'a';
}

export function speakerIndexForSlot(slot: PanelCharacterId): number {
  return Math.max(0, PANEL_CHARACTER_IDS.indexOf(slot));
}

export function resolvePanelSpeakerIds(
  fill: PanelFillSpec | undefined,
  cast: ComicCastMember[],
): string[] {
  if (fill?.speakerIds && fill.speakerIds.length > 0) {
    return fill.speakerIds.filter((id) => cast.some((c) => c.id === id)).slice(0, 3);
  }
  const fromDialogue = new Set<string>();
  for (const block of fill?.blocks ?? []) {
    if (block.kind !== 'dialogue') continue;
    if (block.castMemberId && cast.some((c) => c.id === block.castMemberId)) {
      fromDialogue.add(block.castMemberId);
    } else {
      const idx = speakerIndexForSlot(block.characterId);
      const member = cast[idx];
      if (member) fromDialogue.add(member.id);
    }
  }
  if (fromDialogue.size > 0) return [...fromDialogue].slice(0, 3);
  return cast.slice(0, Math.min(2, cast.length)).map((c) => c.id);
}

export function resolvePanelArrangement(
  fill: PanelFillSpec | undefined,
  speakerCount: number,
): CharacterArrangementId {
  if (fill?.arrangement) return fill.arrangement;
  return defaultArrangementForCount(Math.max(1, speakerCount));
}

export function placementForFill(
  fill: PanelFillSpec | undefined,
  cast: ComicCastMember[],
): MarkerPlacement {
  const speakers = resolvePanelSpeakerIds(fill, cast);
  const arrangement = resolvePanelArrangement(fill, speakers.length || 1);
  return markerPlacementFromArrangement(arrangement, speakers.length || 1);
}

export function emojiBySlot(
  fill: PanelFillSpec | undefined,
  cast: ComicCastMember[],
): Partial<Record<PanelCharacterId, string>> {
  const speakers = resolvePanelSpeakerIds(fill, cast);
  const out: Partial<Record<PanelCharacterId, string>> = {};
  speakers.forEach((id, index) => {
    const slot = slotForSpeakerIndex(index);
    const member = castMemberById(cast, id);
    if (member) out[slot] = member.emoji;
  });
  return out;
}

/** Cast display names keyed by panel slot (for marker hover titles). */
export function castLabelBySlot(
  fill: PanelFillSpec | undefined,
  cast: ComicCastMember[],
): Partial<Record<PanelCharacterId, string>> {
  const speakers = resolvePanelSpeakerIds(fill, cast);
  const out: Partial<Record<PanelCharacterId, string>> = {};
  speakers.forEach((id, index) => {
    const slot = slotForSpeakerIndex(index);
    const member = castMemberById(cast, id);
    if (member) out[slot] = member.label?.trim() || member.emoji;
  });
  return out;
}

/** Ensure dialogue blocks have castMemberId + slot aligned with speakerIds. */
export function normalizeDialogueBlocks(
  blocks: PanelTextBlock[],
  speakerIds: string[],
  cast: ComicCastMember[],
): PanelTextBlock[] {
  return blocks.map((block) => {
    if (block.kind !== 'dialogue') return block;
    let castMemberId = block.castMemberId;
    if (!castMemberId || !cast.some((c) => c.id === castMemberId)) {
      const idx = speakerIndexForSlot(block.characterId);
      castMemberId = speakerIds[idx] ?? speakerIds[0] ?? cast[0]?.id;
    }
    const speakerIndex = Math.max(0, speakerIds.indexOf(castMemberId ?? ''));
    const characterId = slotForSpeakerIndex(speakerIndex >= 0 ? speakerIndex : 0);
    return { ...block, castMemberId, characterId };
  });
}

export function defaultFillForPanel(
  panelIndex: number,
  cast: ComicCastMember[],
  priorSpeakerIds?: string[],
): PanelFillSpec {
  const speakers =
    priorSpeakerIds && priorSpeakerIds.length > 0
      ? priorSpeakerIds.slice(0, 3)
      : cast.slice(0, Math.min(2, cast.length)).map((c) => c.id);
  return {
    panelIndex,
    speakerIds: speakers,
    arrangement: defaultArrangementForCount(speakers.length || 1),
    blocks: [],
    text: { kind: 'none' },
  };
}
