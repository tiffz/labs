export type EncoreMediaPlaybackAdjustments = {
  playbackRate: number;
  transposeSemitones: number;
  loopEnabled: boolean;
};

export const DEFAULT_ENCORE_MEDIA_PLAYBACK_ADJUSTMENTS: EncoreMediaPlaybackAdjustments = {
  playbackRate: 1,
  transposeSemitones: 0,
  loopEnabled: false,
};

/** Session-scoped playback tool settings keyed by {@link EncoreMediaPlaybackTarget.playbackId}. */
export class EncoreMediaPlaybackAdjustmentStore {
  private readonly byPlaybackId = new Map<string, EncoreMediaPlaybackAdjustments>();

  get(playbackId: string): EncoreMediaPlaybackAdjustments {
    return this.byPlaybackId.get(playbackId) ?? DEFAULT_ENCORE_MEDIA_PLAYBACK_ADJUSTMENTS;
  }

  save(playbackId: string, adjustments: EncoreMediaPlaybackAdjustments): void {
    this.byPlaybackId.set(playbackId, adjustments);
  }

  patch(playbackId: string, patch: Partial<EncoreMediaPlaybackAdjustments>): void {
    this.save(playbackId, { ...this.get(playbackId), ...patch });
  }
}
