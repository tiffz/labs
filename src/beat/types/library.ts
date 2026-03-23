import type { BeatAnalysisResult } from '../utils/beatAnalyzer';

export type MediaSourceType = 'local' | 'youtube';
export type MediaKind = 'audio' | 'video';
export type AnalysisFreshness = 'fresh' | 'stale' | 'missing';

export interface LibraryCapabilities {
  advancedAnalysis: boolean;
  manualSections: boolean;
}

export interface AnalysisMetadata {
  analysisVersion: string;
  analyzedAt: number;
  stale: boolean;
  staleReason?: string;
}

export interface PersistedAnalysisBundle {
  beat: BeatAnalysisResult;
  metadata: AnalysisMetadata;
}

export interface BeatLibraryEntry {
  id: string;
  sourceType: MediaSourceType;
  mediaKind: MediaKind;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastViewedAt: number;
  sizeBytes: number;
  fingerprint: string;
  youtubeVideoId?: string;
  sourceUrl?: string;
  capabilities: LibraryCapabilities;
  analysis: AnalysisMetadata;
}

export interface UserPracticeSection {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
  laneId?: string;
  source: 'manual' | 'from-analysis';
}

export interface UserPracticeLane {
  id: string;
  name: string;
  createdAt: number;
}

export interface UserPracticeData {
  lanes: UserPracticeLane[];
  sections: UserPracticeSection[];
}

export interface BeatLibraryRecord {
  entry: BeatLibraryEntry;
  fileBlob?: Blob;
  analysisBundle?: PersistedAnalysisBundle;
  userPracticeData?: UserPracticeData;
}

export interface UploadTaskState {
  id: string;
  name: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  detail?: string;
}
