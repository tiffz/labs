import { getEssentia } from './essentiaSingleton';
import { ALL_KEYS, type MusicKey } from '../music/musicInputConstants';

export interface DetectedSongKey {
  key: string;
  scale: 'major' | 'minor';
  confidence: number;
}

const ENHARMONIC_TO_DISPLAY: Record<string, MusicKey> = {
  'C#': 'Db',
  'D#': 'Eb',
  'Gb': 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

/** Map Essentia/chord key detection output to the shared 12-key display set. */
export function musicKeyFromDetected(detected: DetectedSongKey): MusicKey {
  const raw = detected.key;
  const mapped = ENHARMONIC_TO_DISPLAY[raw] ?? raw;
  if ((ALL_KEYS as readonly string[]).includes(mapped)) {
    return mapped as MusicKey;
  }
  return 'C';
}

/** @deprecated Prefer {@link musicKeyFromDetected} for UI that uses `KeyInput`. */
export function formatDetectedSongKey(detected: DetectedSongKey): string {
  const musicKey = musicKeyFromDetected(detected);
  if (detected.scale === 'minor') {
    return `${musicKey} minor`;
  }
  return `${musicKey} major`;
}

/**
 * Lightweight key guess from uploaded audio (Essentia KeyExtractor consensus).
 * Used by Stanza original-key field; tempo analysis stays separate.
 */
export async function detectSongKeyFromBuffer(audioBuffer: AudioBuffer): Promise<DetectedSongKey> {
  const essentia = await getEssentia();
  const channelData = audioBuffer.getChannelData(0);
  const signal = essentia.arrayToVector(channelData);

  const candidates: DetectedSongKey[] = [];

  try {
    for (const profile of ['krumhansl', 'temperley', 'bgate'] as const) {
      try {
        const keyResult = essentia.KeyExtractor(
          signal,
          true,
          4096,
          4096,
          36,
          3500,
          60,
          25,
          0.2,
          profile,
          audioBuffer.sampleRate,
          0.0001,
          440,
          'cosine',
          'hann',
        );
        candidates.push({
          key: keyResult.key,
          scale: keyResult.scale === 'minor' ? 'minor' : 'major',
          confidence: keyResult.strength,
        });
      } catch {
        // try next profile
      }
    }
  } finally {
    signal.delete();
  }

  if (candidates.length === 0) {
    return { key: 'C', scale: 'major', confidence: 0 };
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0]!;
}
