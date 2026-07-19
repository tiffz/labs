/**
 * Deterministic onset regression for the OfflineAudioContext render path.
 * Captures every scheduled source start and asserts exact sample positions —
 * catches scheduling drift a "did it render?" smoke test cannot.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderRhythmAudio } from './audioExport';
import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';

vi.mock('./reverb', () => ({
  createReverb: vi.fn(),
  convertReverbStrengthToWetLevel: vi.fn((strength: number) => strength / 100),
}));

vi.mock('../assets/sounds/dum.wav', () => ({ default: '/mock-dum.wav' }));
vi.mock('../assets/sounds/tak.wav', () => ({ default: '/mock-tak.wav' }));
vi.mock('../assets/sounds/ka.wav', () => ({ default: '/mock-ka.wav' }));
vi.mock('../assets/sounds/slap2.wav', () => ({ default: '/mock-slap.wav' }));
vi.mock('../assets/sounds/click.mp3', () => ({ default: '/mock-click.mp3' }));

const SAMPLE_RATE = 44100;

type ScheduledStart = { url: string; timeSec: number; volume: number };

let scheduledStarts: ScheduledStart[] = [];

beforeEach(() => {
  scheduledStarts = [];

  global.fetch = vi.fn(async (url: RequestInfo | URL) => ({
    ok: true,
    arrayBuffer: async () => {
      // Encode the source URL length so decodeAudioData can tag buffers.
      const buf = new ArrayBuffer(String(url).length);
      (buf as ArrayBuffer & { _url?: string })._url = String(url);
      return buf;
    },
  })) as unknown as typeof fetch;

  global.OfflineAudioContext = vi.fn().mockImplementation(function (
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ) {
    return {
      decodeAudioData: vi.fn(async (arrayBuffer: ArrayBuffer) => ({
        length: 1000,
        sampleRate,
        numberOfChannels: 2,
        duration: 1000 / sampleRate,
        getChannelData: () => new Float32Array(1000),
        _url: (arrayBuffer as ArrayBuffer & { _url?: string })._url ?? 'unknown',
      })),
      createBufferSource: vi.fn(() => {
        const source = {
          buffer: null as ({ _url?: string } | null),
          connect: vi.fn(),
          start: vi.fn((timeSec: number) => {
            scheduledStarts.push({
              url: source.buffer?._url ?? 'unknown',
              timeSec,
              volume: NaN,
            });
          }),
          stop: vi.fn(),
        };
        return source;
      }),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      destination: {},
      startRendering: vi.fn(async () => ({
        length,
        sampleRate,
        numberOfChannels,
        duration: length / sampleRate,
        getChannelData: () => new Float32Array(length),
      })),
    };
  }) as unknown as typeof OfflineAudioContext;
});

const settings: PlaybackSettings = {
  measureAccentVolume: 100,
  beatGroupAccentVolume: 80,
  nonAccentVolume: 60,
  emphasizeSimpleRhythms: false,
  reverbStrength: 0,
  metronomeVolume: 100,
} as PlaybackSettings;

/** 4/4 measure of four quarter notes: dum tak ka slap (16 sixteenths total). */
const rhythm: ParsedRhythm = {
  isValid: true,
  measures: [
    {
      notes: (['dum', 'tak', 'ka', 'slap'] as const).map((sound) => ({
        sound,
        duration: 'quarter',
        durationInSixteenths: 4,
        isDotted: false,
      })),
      totalDuration: 16,
    },
  ],
  timeSignature: { numerator: 4, denominator: 4 },
  measureMapping: [{ sourceMeasureIndex: 0, sourceStringIndex: 0 }],
} as unknown as ParsedRhythm;

function onsetSamples(starts: ScheduledStart[]): number[] {
  return starts.map((s) => Math.round(s.timeSec * SAMPLE_RATE)).sort((a, b) => a - b);
}

describe('renderRhythmAudio onset regression', () => {
  it('schedules drum onsets at exact sample positions across loops (120 BPM)', async () => {
    await renderRhythmAudio(rhythm, 120, 2, settings, false);

    const drumStarts = scheduledStarts.filter((s) => !s.url.includes('click'));
    // 120 BPM → 0.5s per quarter → onsets at 0, .5, 1, 1.5 then loop at 2s.
    expect(onsetSamples(drumStarts)).toEqual([
      0, 22050, 44100, 66150, 88200, 110250, 132300, 154350,
    ]);
  });

  it('schedules metronome clicks on every beat including the downbeat', async () => {
    await renderRhythmAudio(rhythm, 120, 1, settings, true);

    const clickStarts = scheduledStarts.filter((s) => s.url.includes('click'));
    expect(onsetSamples(clickStarts)).toEqual([0, 22050, 44100, 66150]);
  });

  it('tempo scales onset spacing exactly (60 BPM doubles every gap)', async () => {
    await renderRhythmAudio(rhythm, 60, 1, settings, false);

    const drumStarts = scheduledStarts.filter((s) => !s.url.includes('click'));
    expect(onsetSamples(drumStarts)).toEqual([0, 44100, 88200, 132300]);
  });
});
