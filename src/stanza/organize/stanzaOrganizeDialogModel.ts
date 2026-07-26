/**
 * stanzaOrganizeDialogModel — pure helpers for the Organize review dialog. Kept out of the `.tsx`
 * so the presentational logic is unit-testable and the component file stays Fast-Refresh clean.
 */

import type { StanzaSong } from '../db/stanzaDb';
import { stanzaFingerprintDurationSec } from '../utils/stanzaLocalMediaFingerprint';
import { stanzaSongPracticeCustomizationScore } from '../utils/stanzaSongCustomizationScore';
import type { StanzaDuplicateGroup, StanzaDuplicateTier } from './stanzaDuplicateHeuristics';
import type { StanzaOrganizeGroupPreview, StanzaOrganizeSelection } from './stanzaOrganizeMerge';

/** Per-group UI state: whether to merge it, which row survives, which source plays. */
export interface StanzaOrganizeGroupSelectionState {
  checked: boolean;
  canonicalId: string;
  playFromId: string;
}

/** Tier-1 (exact) groups are pre-checked; Tier-2 (likely) are opt-in. Canonical = suggested winner. */
export function initialStanzaOrganizeGroupState(
  group: StanzaDuplicateGroup,
): StanzaOrganizeGroupSelectionState {
  return {
    checked: group.tier === 1,
    canonicalId: group.suggestedCanonicalId,
    playFromId: group.suggestedCanonicalId,
  };
}

export function stanzaOrganizeSelectionFromState(
  group: StanzaDuplicateGroup,
  state: StanzaOrganizeGroupSelectionState,
): StanzaOrganizeSelection {
  return {
    memberIds: group.memberIds,
    canonicalId: state.canonicalId,
    playFromId: state.playFromId,
  };
}

export function stanzaOrganizeTierLabel(tier: StanzaDuplicateTier): string {
  return tier === 1 ? 'Exact match' : 'Likely duplicate';
}

/** De-duplicated reason strings for a group, e.g. "Same YouTube video". */
export function stanzaOrganizeReasonSummary(group: StanzaDuplicateGroup): string {
  const seen = new Set<string>();
  for (const r of group.reasons) seen.add(r.reason);
  return [...seen].join(' · ');
}

function pluralSections(count: number): string {
  return `${count} section${count === 1 ? '' : 's'}`;
}

/**
 * Plain sentences describing the merged result for the preview. Empty for a refused group (the
 * caller shows `preview.refusedReason` instead). Straight apostrophes, no em dash per COPY_STYLE.
 */
export function stanzaOrganizePreviewLines(preview: StanzaOrganizeGroupPreview): string[] {
  if (preview.refusedReason) return [];
  const lines = [`Keeps "${preview.finalTitle || 'Untitled'}". ${pluralSections(preview.mergedMarkerCount)}.`];
  if (preview.discardedSources.length > 0) {
    lines.push(`Removes the other copy's ${preview.discardedSources.join(' and ')}.`);
  }
  if (preview.dropsDonorPracticeData) {
    lines.push("The other copy's per-section tempo and practice data won't carry over.");
  }
  return lines;
}

/** `m:ss` from the local-upload fingerprint duration, or null when unknown (e.g. YouTube). */
export function formatStanzaOrganizeDuration(song: StanzaSong): string | null {
  const sec = stanzaFingerprintDurationSec(song.localMediaFingerprint);
  if (sec == null) return null;
  const mins = Math.floor(sec / 60);
  const secs = Math.round(sec % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Member with the most practice customization (sections, calibration, drums) — the "Richest" tag. */
export function stanzaOrganizeRichestMemberId(
  rows: readonly StanzaSong[],
  memberIds: readonly string[],
): string | null {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let bestId: string | null = null;
  let bestScore = -1;
  for (const id of memberIds) {
    const song = byId.get(id);
    if (!song) continue;
    const score = stanzaSongPracticeCustomizationScore(song);
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  // Only worth flagging when one copy is genuinely richer than the others.
  return bestScore > 0 ? bestId : null;
}
