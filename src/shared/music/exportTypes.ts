export type ExportFormat = 'midi' | 'wav' | 'mp3' | 'ogg' | 'flac' | 'png' | 'pdf';

export interface ExportFormatDescriptor {
  id: ExportFormat;
  label: string;
  extension: string;
  description: string;
  category: 'audio' | 'midi' | 'image' | 'document';
}

export interface ExportStem {
  id: string;
  label: string;
  description?: string;
  defaultSelected?: boolean;
}

export interface ExportPreview {
  singleLoopSeconds: number;
  loopCount: number;
  totalSeconds: number;
}

export interface ExportQualitySettings {
  mp3BitrateKbps: number;
}

export interface ExportMetadata {
  title?: string;
  artist?: string;
  comments?: string;
}

export interface ExportAudioRenderRequest {
  loopCount: number;
  selectedStemIds: string[];
  quality: ExportQualitySettings;
}

export interface ExportAudioRenderResult {
  mix?: AudioBuffer;
  stems?: Record<string, AudioBuffer>;
}

export interface ExportMidiRenderRequest {
  loopCount: number;
  selectedStemIds: string[];
}

export interface ExportScoreSheetRenderRequest {
  format: 'png' | 'pdf';
  title: string;
}

export type MidiRenderPayload = Uint8Array;

export interface ExportSourceAdapter {
  id: string;
  title: string;
  /** Human-readable download stem — use {@link buildLabsDownloadFileName} (e.g. `Song Title - Audio`). */
  fileBaseName: string;
  stems: ExportStem[];
  defaultFormat?: ExportFormat;
  supportsFormat: (format: ExportFormat) => boolean;
  estimateDurationSeconds: (loopCount: number, selectedStemIds: string[]) => number;
  renderAudio?: (
    request: ExportAudioRenderRequest
  ) => Promise<ExportAudioRenderResult>;
  renderMidi?: (
    request: ExportMidiRenderRequest
  ) => Promise<MidiRenderPayload>;
  renderScoreSheet?: (
    request: ExportScoreSheetRenderRequest
  ) => Promise<Blob>;
  /** Default title for PNG/PDF score sheet exports. */
  defaultScoreTitle?: string;
  metadata?: ExportMetadata;
}

export interface ExportExecutionRequest {
  adapter: ExportSourceAdapter;
  format: ExportFormat;
  loopCount: number;
  selectedStemIds: string[];
  separateStemFiles: boolean;
  quality: ExportQualitySettings;
  /** Custom sheet title for PNG/PDF score exports. */
  scoreTitle?: string;
}

export interface ExportExecutionResult {
  downloadedFiles: string[];
}

export const EXPORT_FORMATS: ExportFormatDescriptor[] = [
  {
    id: 'midi',
    label: 'MIDI',
    extension: 'mid',
    category: 'midi',
    description: 'Tiny note/event file for DAWs and notation editors.',
  },
  {
    id: 'wav',
    label: 'WAV',
    extension: 'wav',
    category: 'audio',
    description: 'Lossless PCM audio; best for mastering and editing.',
  },
  {
    id: 'mp3',
    label: 'MP3',
    extension: 'mp3',
    category: 'audio',
    description: 'Small lossy audio; best for quick sharing.',
  },
  {
    id: 'ogg',
    label: 'OGG',
    extension: 'ogg',
    category: 'audio',
    description: 'Open compressed audio; better quality/size than MP3.',
  },
  {
    id: 'flac',
    label: 'FLAC',
    extension: 'flac',
    category: 'audio',
    description: 'Lossless compressed audio with smaller files than WAV.',
  },
  {
    id: 'png',
    label: 'PNG',
    extension: 'png',
    category: 'image',
    description: 'Print-ready score image for messages and slides.',
  },
  {
    id: 'pdf',
    label: 'PDF',
    extension: 'pdf',
    category: 'document',
    description: 'Print-ready score sheet for email and handouts.',
  },
];

export const DEFAULT_EXPORT_QUALITY: ExportQualitySettings = {
  mp3BitrateKbps: 160,
};

export function isScoreExportFormat(format: ExportFormat): format is 'png' | 'pdf' {
  return format === 'png' || format === 'pdf';
}
