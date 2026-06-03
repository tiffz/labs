/**
 * Universal Audio Buffer Interface
 * 
 * This interface defines the minimal audio buffer API needed for tempo detection.
 * It can be satisfied by:
 * - Browser's native AudioBuffer
 * - Node.js MockAudioBuffer (for CLI tools)
 * 
 * This allows our tempo detection algorithms to run in both environments.
 */

/**
 * Minimal audio buffer interface for cross-platform compatibility
 */
export interface UniversalAudioBuffer {
  /** Sample rate in Hz (e.g., 44100) */
  sampleRate: number;
  /** Duration in seconds */
  duration: number;
  /** Number of audio channels */
  numberOfChannels: number;
  /** Total number of samples */
  length: number;
  /** Get audio samples for a specific channel */
  getChannelData(channel: number): Float32Array;
}

/**
 * Create a UniversalAudioBuffer from raw audio samples
 */
export function createAudioBuffer(
  samples: Float32Array,
  sampleRate: number
): UniversalAudioBuffer {
  return {
    sampleRate,
    duration: samples.length / sampleRate,
    numberOfChannels: 1,
    length: samples.length,
    getChannelData: (channel: number) => {
      if (channel !== 0) {
        throw new Error('Only mono audio supported');
      }
      return samples;
    },
  };
}

/**
 * Type guard to check if an object is a UniversalAudioBuffer
 */
export function isAudioBuffer(obj: unknown): obj is UniversalAudioBuffer {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof (obj as UniversalAudioBuffer).sampleRate === 'number' &&
    typeof (obj as UniversalAudioBuffer).duration === 'number' &&
    typeof (obj as UniversalAudioBuffer).getChannelData === 'function'
  );
}
