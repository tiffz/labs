import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeExport, formatDuration } from './exportService';
import type { ExportSourceAdapter } from './exportTypes';

vi.mock('./audioCodecs', () => ({
  encodeAudioBuffer: vi.fn(async () => new Blob(['audio'], { type: 'audio/wav' })),
}));

describe('exportService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const originalCreateElement = document.createElement.bind(document);
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-export');
    global.URL.revokeObjectURL = vi.fn();
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
          remove: vi.fn(),
        } as unknown as HTMLElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  it('exports midi when adapter supports midi', async () => {
    const renderMidi = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const adapter: ExportSourceAdapter = {
      id: 'test-midi',
      title: 'MIDI Export',
      fileBaseName: 'midi-export',
      stems: [{ id: 'mix', label: 'Mix' }],
      supportsFormat: (format) => format === 'midi',
      estimateDurationSeconds: () => 10,
      renderMidi,
    };
    const result = await executeExport({
      adapter,
      format: 'midi',
      loopCount: 2,
      selectedStemIds: ['mix'],
      separateStemFiles: false,
      quality: { mp3BitrateKbps: 160 },
    });
    expect(renderMidi).toHaveBeenCalled();
    expect(result.downloadedFiles[0]).toContain('.mid');
  });

  it('exports separate stem files for audio when requested', async () => {
    const fakeBuffer = {
      length: 1200,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(1200),
    } as unknown as AudioBuffer;
    const renderAudio = vi.fn(async () => ({
      stems: {
        drums: fakeBuffer,
        piano: fakeBuffer,
      },
    }));
    const adapter: ExportSourceAdapter = {
      id: 'test-audio',
      title: 'Audio Export',
      fileBaseName: 'audio-export',
      stems: [
        { id: 'drums', label: 'Drums' },
        { id: 'piano', label: 'Piano' },
      ],
      supportsFormat: (format) => format !== 'midi',
      estimateDurationSeconds: () => 8,
      renderAudio,
    };
    const result = await executeExport({
      adapter,
      format: 'wav',
      loopCount: 1,
      selectedStemIds: ['drums', 'piano'],
      separateStemFiles: true,
      quality: { mp3BitrateKbps: 160 },
    });
    expect(renderAudio).toHaveBeenCalled();
    expect(result.downloadedFiles.length).toBeGreaterThanOrEqual(2);
  });

  it('formats duration for UI previews', () => {
    expect(formatDuration(9.28)).toBe('9.3s');
    expect(formatDuration(132)).toBe('2m 12s');
  });
});
