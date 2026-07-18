import type { CharacterArrangementId, PanelCharacterId } from './types';
import { PANEL_CHARACTER_IDS } from './types';

/** Normalized slot inside a panel (0–1). */
export type ArrangementSlot = {
  x: number;
  y: number;
  /** Relative emoji scale (1 = default marker size). */
  scale: number;
};

export type ArrangementDef = {
  id: CharacterArrangementId;
  label: string;
  speakerCount: 1 | 2 | 3;
  slots: ArrangementSlot[];
};

export const CHARACTER_ARRANGEMENTS: ArrangementDef[] = [
  /* y kept mid-lower so paint-extent clamp has room above the panel stroke. */
  { id: 'closeup', label: 'Close-up', speakerCount: 1, slots: [{ x: 0.5, y: 0.55, scale: 1.65 }] },
  { id: 'medium', label: 'Medium', speakerCount: 1, slots: [{ x: 0.5, y: 0.66, scale: 1.35 }] },
  { id: 'full-center', label: 'Full center', speakerCount: 1, slots: [{ x: 0.5, y: 0.72, scale: 1.2 }] },
  { id: 'full-left', label: 'Full left', speakerCount: 1, slots: [{ x: 0.3, y: 0.72, scale: 1.2 }] },
  {
    id: 'small-distant',
    label: 'Small distant',
    speakerCount: 1,
    slots: [{ x: 0.5, y: 0.7, scale: 0.7 }],
  },
  {
    id: 'facing',
    label: 'Facing',
    speakerCount: 2,
    slots: [
      { x: 0.28, y: 0.72, scale: 1.2 },
      { x: 0.72, y: 0.72, scale: 1.2 },
    ],
  },
  {
    id: 'side-by-side',
    label: 'Side by side',
    speakerCount: 2,
    slots: [
      { x: 0.38, y: 0.72, scale: 1.15 },
      { x: 0.62, y: 0.72, scale: 1.15 },
    ],
  },
  {
    id: 'over-shoulder',
    label: 'Over shoulder',
    speakerCount: 2,
    slots: [
      { x: 0.28, y: 0.72, scale: 1.25 },
      { x: 0.68, y: 0.64, scale: 1.0 },
    ],
  },
  {
    id: 'staggered',
    label: 'Staggered',
    speakerCount: 2,
    slots: [
      { x: 0.32, y: 0.68, scale: 1.2 },
      { x: 0.7, y: 0.72, scale: 1.1 },
    ],
  },
  {
    id: 'trio-row',
    label: 'Trio row',
    speakerCount: 3,
    slots: [
      { x: 0.24, y: 0.72, scale: 1.05 },
      { x: 0.5, y: 0.72, scale: 1.05 },
      { x: 0.76, y: 0.72, scale: 1.05 },
    ],
  },
  {
    id: 'triangle',
    label: 'Triangle',
    speakerCount: 3,
    slots: [
      { x: 0.5, y: 0.6, scale: 1.15 },
      { x: 0.28, y: 0.72, scale: 1.05 },
      { x: 0.72, y: 0.72, scale: 1.05 },
    ],
  },
  {
    id: 'two-plus-one',
    label: 'Two + one',
    speakerCount: 3,
    slots: [
      { x: 0.28, y: 0.72, scale: 1.15 },
      { x: 0.5, y: 0.72, scale: 1.15 },
      { x: 0.76, y: 0.66, scale: 0.95 },
    ],
  },
];

const BY_ID = new Map(CHARACTER_ARRANGEMENTS.map((row) => [row.id, row]));

export function arrangementDef(id: CharacterArrangementId): ArrangementDef | undefined {
  return BY_ID.get(id);
}

export function arrangementsForSpeakerCount(count: number): ArrangementDef[] {
  const clamped = Math.max(1, Math.min(3, Math.round(count))) as 1 | 2 | 3;
  return CHARACTER_ARRANGEMENTS.filter((row) => row.speakerCount === clamped);
}

export function defaultArrangementForCount(count: number): CharacterArrangementId {
  const list = arrangementsForSpeakerCount(count);
  return list[0]?.id ?? 'full-center';
}

/** Map arrangement slots onto placement slots a/b/c for bubble geometry. */
export type MarkerPlacement = Partial<
  Record<PanelCharacterId, { x: number; y: number; scale: number }>
>;

export function markerPlacementFromArrangement(
  arrangementId: CharacterArrangementId | undefined,
  speakerCount: number,
): MarkerPlacement {
  const count = Math.max(1, Math.min(3, speakerCount));
  const def =
    (arrangementId ? BY_ID.get(arrangementId) : undefined) ??
    BY_ID.get(defaultArrangementForCount(count));
  if (!def) return {};
  const placement: MarkerPlacement = {};
  for (let i = 0; i < Math.min(def.slots.length, count); i++) {
    const slotId = PANEL_CHARACTER_IDS[i];
    const slot = def.slots[i];
    if (!slotId || !slot) continue;
    placement[slotId] = { x: slot.x, y: slot.y, scale: slot.scale };
  }
  return placement;
}

export function characterIdForSpeakerIndex(index: number): PanelCharacterId | null {
  return PANEL_CHARACTER_IDS[index] ?? null;
}
