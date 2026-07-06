import type { StanzaSegmentMetronomeCalibration, StanzaSong } from '../db/stanzaDb';
import { STANZA_DRUMS_DEFAULT_PATTERN } from '../components/stanzaWorkspace/stanzaPracticeRailConstants';

export type StanzaScopeBreadcrumbBpms = {
  songBpm: number | null;
  sectionBpm: number | null;
};

function stanzaScopeBpmIsValid(bpm: number | undefined): bpm is number {
  return bpm != null && bpm > 40 && bpm < 360;
}

function roundScopeBpm(bpm: number): number {
  return Math.round(bpm);
}

export function resolveStanzaScopeBreadcrumbBpms(opts: {
  songCalibration?: StanzaSegmentMetronomeCalibration;
  segmentCalibration?: StanzaSegmentMetronomeCalibration;
  timingScope: 'song' | 'section';
  liveRailBpm?: number;
}): StanzaScopeBreadcrumbBpms {
  const persistedSongBpm = stanzaScopeBpmIsValid(opts.songCalibration?.bpm)
    ? roundScopeBpm(opts.songCalibration.bpm)
    : null;
  const persistedSectionBpm =
    opts.segmentCalibration && stanzaScopeBpmIsValid(opts.segmentCalibration.bpm)
      ? roundScopeBpm(opts.segmentCalibration.bpm)
      : null;

  const liveBpm = stanzaScopeBpmIsValid(opts.liveRailBpm) ? roundScopeBpm(opts.liveRailBpm) : null;

  const songBpm =
    opts.timingScope === 'song' && liveBpm != null ? liveBpm : persistedSongBpm;

  let sectionEffectiveBpm: number | null = persistedSectionBpm ?? persistedSongBpm;
  if (opts.timingScope === 'section' && liveBpm != null) {
    sectionEffectiveBpm = liveBpm;
  }

  const sectionBpm =
    songBpm != null && sectionEffectiveBpm != null && sectionEffectiveBpm !== songBpm
      ? sectionEffectiveBpm
      : null;

  return { songBpm, sectionBpm };
}

export function stanzaSongDrumPattern(
  song: Pick<StanzaSong, 'drumPattern'>,
): string {
  const trimmed = song.drumPattern?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : STANZA_DRUMS_DEFAULT_PATTERN;
}

export function stanzaSectionHasCustomDrumPattern(
  segmentId: string,
  drumPatternBySegmentId: StanzaSong['drumPatternBySegmentId'],
): boolean {
  const raw = drumPatternBySegmentId?.[segmentId]?.trim();
  return Boolean(raw);
}

export function stanzaEffectiveDrumPatternForSection(
  song: Pick<StanzaSong, 'drumPattern' | 'drumPatternBySegmentId'>,
  segmentId: string,
): { pattern: string; source: 'song' | 'section' } {
  const songPattern = stanzaSongDrumPattern(song);
  const sectionOverride = song.drumPatternBySegmentId?.[segmentId]?.trim();
  if (sectionOverride) {
    return { pattern: sectionOverride, source: 'section' };
  }
  return { pattern: songPattern, source: 'song' };
}

export function stanzaDrumPatternsDiffer(a: string, b: string): boolean {
  return a.trim() !== b.trim();
}

export type StanzaScopeInheritanceMode = 'direct' | 'inherit' | 'custom';

export function resolveStanzaTempoInheritanceMode(opts: {
  timingScope: 'song' | 'section';
  segmentCalibration?: StanzaSegmentMetronomeCalibration;
  songCalibration?: StanzaSegmentMetronomeCalibration;
}): StanzaScopeInheritanceMode {
  if (opts.timingScope === 'song') return 'direct';
  if (opts.segmentCalibration) return 'custom';
  if (stanzaScopeBpmIsValid(opts.songCalibration?.bpm)) return 'inherit';
  return 'direct';
}

export function resolveStanzaDrumInheritanceMode(opts: {
  timingScope: 'song' | 'section';
  segmentId: string;
  song: Pick<StanzaSong, 'drumPattern' | 'drumPatternBySegmentId'>;
}): StanzaScopeInheritanceMode {
  if (opts.timingScope === 'song') return 'direct';
  return stanzaSectionHasCustomDrumPattern(opts.segmentId, opts.song.drumPatternBySegmentId)
    ? 'custom'
    : 'inherit';
}
