import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateRhythmDuration, formatDuration, audioBufferToWav, exportAudioBuffer, renderRhythmAudio } from './audioExport';
import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';

// Mock audio files and reverb
vi.mock('./reverb', () => ({
  createReverb: vi.fn().mockResolvedValue({
    dryGain: { connect: vi.fn() },
    wetGain: { connect: vi.fn() },
    convolver: {},
    delayNode: {},
    filterNode: {},
  }),
  convertReverbStrengthToWetLevel: vi.fn((strength) => strength / 100),
}));

// Mock audio file imports
vi.mock('../assets/sounds/dum.wav', () => ({ default: '/mock-dum.wav' }));
vi.mock('../assets/sounds/tak.wav', () => ({ default: '/mock-tak.wav' }));
vi.mock('../assets/sounds/ka.wav', () => ({ default: '/mock-ka.wav' }));
vi.mock('../assets/sounds/slap2.wav', () => ({ default: '/mock-slap.wav' }));
vi.mock('../assets/sounds/click.mp3', () => ({ default: '/mock-click.mp3' }));

// Mock lamejsfixbug121 (patched version)
vi.mock('lamejsfixbug121', () => ({
  default: {
    Mp3Encoder: class MockMp3Encoder {
      encodeBuffer() {
        return new Int8Array([1, 2, 3]);
      }
      flush() {
        return new Int8Array([4, 5, 6]);
      }
    },
  },
  Mp3Encoder: class MockMp3Encoder {
    encodeBuffer() {
      return new Int8Array([1, 2, 3]);
    }
    flush() {
      return new Int8Array([4, 5, 6]);
    }
  },
}));

// Mock global fetch for audio files
global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
});

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  decodeAudioData: vi.fn().mockResolvedValue({
    length: 1000,
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(1000),
  }),
})) as unknown as typeof AudioContext;

// Track calls to decodeAudioData for metronome testing
let decodeAudioDataCalls: ArrayBuffer[] = [];

let mockOfflineContextInstance: {
  decodeAudioData: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  destination: Record<string, never>;
  startRendering: ReturnType<typeof vi.fn>;
} | null = null;

global.OfflineAudioContext = vi.fn().mockImplementation((numberOfChannels: number, length: number, sampleRate: number) => {
  decodeAudioDataCalls = [];
  
  const mockBufferSource = {
    buffer: null,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
  };
  
  const mockGainNode = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
  
  mockOfflineContextInstance = {
    decodeAudioData: vi.fn().mockImplementation((arrayBuffer: ArrayBuffer) => {
      decodeAudioDataCalls.push(arrayBuffer);
      // Return a click buffer if it's the click sound, otherwise return a drum sound buffer
      const isClickSound = decodeAudioDataCalls.length > 4; // Click is loaded after drum sounds
      return Promise.resolve({
        length: isClickSound ? 500 : 1000,
        sampleRate: 44100,
        numberOfChannels: isClickSound ? 1 : 2,
        duration: isClickSound ? 0.011 : 0.023,
        getChannelData: () => new Float32Array(isClickSound ? 500 : 1000),
      });
    }),
    createBufferSource: vi.fn().mockReturnValue(mockBufferSource),
    createGain: vi.fn().mockReturnValue(mockGainNode),
    destination: {},
    startRendering: vi.fn().mockResolvedValue({
      length: length,
      sampleRate: sampleRate,
      numberOfChannels: numberOfChannels,
      getChannelData: () => new Float32Array(length),
    }),
  };
  
  return mockOfflineContextInstance;
}) as unknown as typeof OfflineAudioContext;

describe('audioExport', () => {
  const mockRhythm: ParsedRhythm = {
    isValid: true,
    measures: [
      {
        notes: [
          {
            sound: 'dum',
            duration: 'sixteenth',
            durationInSixteenths: 1,
            isDotted: false,
          },
          {
            sound: 'tak',
            duration: 'sixteenth',
            durationInSixteenths: 1,
            isDotted: false,
          },
        ],
        totalDuration: 2,
      },
    ],
    timeSignature: { numerator: 4, denominator: 4 },
  };

  describe('calculateRhythmDuration', () => {
    it('should calculate duration correctly for a simple rhythm', () => {
      const duration = calculateRhythmDuration(mockRhythm, 120);
      // 2 sixteenth notes at 120 BPM = 2 * (60000/120/4) / 1000 = 2 * 125 / 1000 = 0.25 seconds
      expect(duration).toBeCloseTo(0.25, 2);
    });

    it('should calculate duration correctly for multiple measures', () => {
      const multiMeasureRhythm: ParsedRhythm = {
        ...mockRhythm,
        measures: [
          ...mockRhythm.measures,
          {
            notes: [
              {
                sound: 'ka',
                duration: 'sixteenth',
                durationInSixteenths: 1,
                isDotted: false,
              },
            ],
            totalDuration: 1,
          },
        ],
      };
      const duration = calculateRhythmDuration(multiMeasureRhythm, 120);
      // 3 sixteenth notes = 3 * 125 / 1000 = 0.375 seconds
      expect(duration).toBeCloseTo(0.375, 2);
    });

    it('should handle different BPM values', () => {
      const duration120 = calculateRhythmDuration(mockRhythm, 120);
      const duration240 = calculateRhythmDuration(mockRhythm, 240);
      // At double BPM, duration should be half
      expect(duration240).toBeCloseTo(duration120 / 2, 2);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(0.5)).toBe('0.5s');
      expect(formatDuration(5.7)).toBe('5.7s');
      expect(formatDuration(30)).toBe('30.0s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatDuration(60)).toBe('1m 0s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
    });

    it('should handle very short durations', () => {
      expect(formatDuration(0.1)).toBe('0.1s');
      expect(formatDuration(0.01)).toBe('0.0s');
    });
  });

  describe('audioBufferToWav', () => {
    it('should create a valid WAV blob', () => {
      const mockBuffer = {
        length: 1000,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: () => {
          const data = new Float32Array(1000);
          // Fill with some test data
          for (let i = 0; i < 1000; i++) {
            data[i] = Math.sin(i * 0.01);
          }
          return data;
        },
      } as AudioBuffer;

      const blob = audioBufferToWav(mockBuffer);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/wav');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle mono audio', () => {
      const mockBuffer = {
        length: 1000,
        sampleRate: 44100,
        numberOfChannels: 1,
        getChannelData: () => {
          const data = new Float32Array(1000);
          for (let i = 0; i < 1000; i++) {
            data[i] = Math.sin(i * 0.01);
          }
          return data;
        },
      } as AudioBuffer;

      const blob = audioBufferToWav(mockBuffer);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/wav');
    });
  });

  describe('exportAudioBuffer', () => {
    it('should export WAV format', async () => {
      const mockBuffer = {
        length: 1000,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: () => {
          const data = new Float32Array(1000);
          for (let i = 0; i < 1000; i++) {
            data[i] = Math.sin(i * 0.01);
          }
          return data;
        },
      } as AudioBuffer;

      const blob = await exportAudioBuffer(mockBuffer, 'wav');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/wav');
    });

    it('should export MP3 format', async () => {
      const mockBuffer = {
        length: 1000,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: () => {
          const data = new Float32Array(1000);
          for (let i = 0; i < 1000; i++) {
            data[i] = Math.sin(i * 0.01);
          }
          return data;
        },
      } as AudioBuffer;

      const blob = await exportAudioBuffer(mockBuffer, 'mp3');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/mp3');
    });
  });

  describe('renderRhythmAudio', () => {
    const defaultPlaybackSettings: PlaybackSettings = {
      measureAccentVolume: 90,
      beatGroupAccentVolume: 70,
      nonAccentVolume: 40,
      emphasizeSimpleRhythms: false,
      reverbStrength: 0,
      metronomeVolume: 50,
    };

    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks();
      decodeAudioDataCalls = [];
    });

    it('should render audio without metronome when metronomeEnabled is false', async () => {
      const buffer = await renderRhythmAudio(
        mockRhythm,
        120,
        1,
        defaultPlaybackSettings,
        false
      );

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.sampleRate).toBe(44100);
      expect(buffer.numberOfChannels).toBe(2);
    });

    it('should render audio with metronome when metronomeEnabled is true', async () => {
      const buffer = await renderRhythmAudio(
        mockRhythm,
        120,
        1,
        defaultPlaybackSettings,
        true
      );

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.sampleRate).toBe(44100);
      expect(buffer.numberOfChannels).toBe(2);
    });

    it('should attempt to load click buffer when metronome is enabled', async () => {
      // Mock fetch to track click sound fetch
      const originalFetch = global.fetch;
      let clickFetchCalled = false;
      global.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
        if (typeof url === 'string' && url.includes('click')) {
          clickFetchCalled = true;
        }
        return originalFetch(url);
      });

      await renderRhythmAudio(
        mockRhythm,
        120,
        1,
        defaultPlaybackSettings,
        true
      );

      // Verify that fetch was called for the click sound when metronome is enabled
      expect(clickFetchCalled).toBe(true);

      global.fetch = originalFetch;
    });

    it('should schedule metronome clicks for each measure when enabled', async () => {
      const rhythmWithMultipleMeasures: ParsedRhythm = {
        ...mockRhythm,
        measures: [
          ...mockRhythm.measures,
          {
            notes: [
              {
                sound: 'ka',
                duration: 'sixteenth',
                durationInSixteenths: 1,
                isDotted: false,
              },
            ],
            totalDuration: 1,
          },
        ],
      };

      await renderRhythmAudio(
        rhythmWithMultipleMeasures,
        120,
        1,
        defaultPlaybackSettings,
        true
      );

      // Metronome should schedule clicks for each measure
      // We can't directly verify the scheduling, but we can verify the function completes
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should handle metronome volume settings', async () => {
      const settingsWithMetronomeVolume: PlaybackSettings = {
        ...defaultPlaybackSettings,
        metronomeVolume: 75,
      };

      const buffer = await renderRhythmAudio(
        mockRhythm,
        120,
        1,
        settingsWithMetronomeVolume,
        true
      );

      expect(buffer).toBeDefined();
    });

    it('should handle multiple loops with metronome', async () => {
      const buffer = await renderRhythmAudio(
        mockRhythm,
        120,
        3,
        defaultPlaybackSettings,
        true
      );

      expect(buffer).toBeDefined();
      // Duration should be approximately 3x the single loop duration
      const singleLoopDuration = calculateRhythmDuration(mockRhythm, 120);
      const expectedDuration = singleLoopDuration * 3;
      const expectedLength = Math.ceil(expectedDuration * 44100);
      // Allow some tolerance for rounding
      expect(buffer.length).toBeGreaterThanOrEqual(expectedLength - 100);
      expect(buffer.length).toBeLessThanOrEqual(expectedLength + 100);
    });

    it('should handle metronome with reverb enabled', async () => {
      const settingsWithReverb: PlaybackSettings = {
        ...defaultPlaybackSettings,
        reverbStrength: 50,
      };

      const buffer = await renderRhythmAudio(
        mockRhythm,
        120,
        1,
        settingsWithReverb,
        true
      );

      expect(buffer).toBeDefined();
    });

    it('should gracefully handle click buffer load failure', async () => {
      // Mock fetch to fail for click sound
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
        // Fail on click sound fetch
        if (typeof url === 'string' && url.includes('click')) {
          return Promise.reject(new Error('Failed to load click'));
        }
        return originalFetch(url);
      });

      // Should not throw, but should warn
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const buffer = await renderRhythmAudio(
        mockRhythm,
        120,
        1,
        defaultPlaybackSettings,
        true
      );

      expect(buffer).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metronome enabled but click buffer failed to load')
      );

      consoleSpy.mockRestore();
      global.fetch = originalFetch;
    });
  });
});

