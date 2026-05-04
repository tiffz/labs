import type { EncorePerformance, EncoreSong } from '../../types';

/** Row model for the repertoire Material React Table (Library). */
export type EncoreRepertoireMrtRow = {
  song: EncoreSong;
  title: string;
  artist: string;
  keyDisplay: string;
  perfCount: number;
  venues: string;
  /** Per-row venue list, sorted alphabetically. Drives the chip rendering in the Venues column. */
  venuesList: string[];
  lastIso: string;
  lastDisplay: string;
  /** Most recent performance for this song (perf list is sorted newest-first). */
  latestPerf: EncorePerformance | null;
  /** Number of template + song-only milestones in `done` state (for sorting). */
  milestoneDone: number;
  milestoneShort: string;
  milestoneDetail: string;
  tags: string[];
  tagsLabel: string;
  refCount: number;
  backingCount: number;
  hasSpotifySource: boolean;
  spotifySourceLabel: string;
  chartCount: number;
  takeCount: number;
};
