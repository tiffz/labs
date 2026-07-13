import type { PanelCompositionId, PanelCharacterId, PanelFillSpec, PanelTextBlock } from './types';
import { STICK_POSE_IDS, type StickPoseId } from './stickFigures';

export function resolvePanelComposition(fill: PanelFillSpec | undefined): PanelCompositionId {
  if (fill?.composition) return fill.composition;
  if (!fill?.kind || fill.kind === 'empty') return 'empty';
  if (fill.kind === 'stick') return 'full-figure';
  if (fill.kind === 'silhouette') return 'silhouette-dark';
  return 'empty';
}

export function resolvePanelText(fill: PanelFillSpec | undefined): { kind: string; content: string } | null {
  if (fill?.text && fill.text.kind !== 'none') {
    return { kind: fill.text.kind, content: fill.text.content ?? '' };
  }
  if (fill?.kind === 'note' && fill.noteText) {
    return { kind: 'caption', content: fill.noteText };
  }
  return null;
}

/** Resolve ordered text blocks, migrating legacy single `text` overlay when needed. */
export function resolvePanelTextBlocks(fill: PanelFillSpec | undefined): PanelTextBlock[] {
  if (fill?.blocks) {
    return fill.blocks.filter((block) => block.content.trim().length > 0);
  }
  const legacy = resolvePanelText(fill);
  if (!legacy || !legacy.content.trim()) {
    if (legacy?.kind === 'dialogue') {
      return [{ kind: 'dialogue', characterId: 'a' as PanelCharacterId, content: '' }];
    }
    return [];
  }
  if (legacy.kind === 'dialogue') {
    return [{ kind: 'dialogue', characterId: 'a', content: legacy.content }];
  }
  if (legacy.kind === 'sfx') {
    return [{ kind: 'sfx', content: legacy.content }];
  }
  return [{ kind: 'caption', content: legacy.content, placement: 'after' }];
}

export function normalizePanelFill(fill: PanelFillSpec): PanelFillSpec {
  const blocks = resolvePanelTextBlocks(fill);
  return {
    ...fill,
    composition: resolvePanelComposition(fill),
    blocks,
    text: fill.text ?? (fill.kind === 'note' && fill.noteText
      ? { kind: 'caption', content: fill.noteText }
      : { kind: 'none' }),
  };
}

export function isLegacyStickFill(fill: PanelFillSpec): boolean {
  return !fill.composition && fill.kind === 'stick' && Boolean(fill.poseId);
}

export function legacyStickPose(fill: PanelFillSpec): StickPoseId {
  const pose = fill.poseId;
  if (pose && (STICK_POSE_IDS as readonly string[]).includes(pose)) {
    return pose as StickPoseId;
  }
  return 'standing';
}
