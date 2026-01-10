/**
 * Sample Loader Utility
 * 
 * Handles loading and caching of audio samples for sampled instruments.
 * Supports multiple velocity layers and efficient caching.
 */

/**
 * Velocity layer configuration
 */
export interface VelocityLayer {
  name: string;           // e.g., 'pp', 'mf', 'ff'
  velocityMin: number;    // Minimum velocity (0-1)
  velocityMax: number;    // Maximum velocity (0-1)
  suffix: string;         // URL suffix for this layer
}

/**
 * Sample map entry
 */
export interface SampleEntry {
  note: string;           // e.g., 'A0', 'C4'
  midiNote: number;       // MIDI note number
  url: string;            // Full URL to sample
  velocityLayer: string;  // Which velocity layer
}

/**
 * Loaded sample with decoded buffer
 */
export interface LoadedSample {
  note: string;
  midiNote: number;
  buffer: AudioBuffer;
  velocityLayer: string;
}

/**
 * Loading progress callback
 */
export type LoadingProgressCallback = (loaded: number, total: number) => void;

/**
 * Sample cache - singleton to share across instances
 */
const sampleCache = new Map<string, AudioBuffer>();

/**
 * Convert note name to MIDI number
 */
export function noteToMidi(note: string): number {
  const noteNames: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };
  
  const match = note.match(/^([A-G])([#b]?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid note name: ${note}`);
  }
  
  const [, noteName, accidental, octaveStr] = match;
  let midiNote = noteNames[noteName] + (parseInt(octaveStr, 10) + 1) * 12;
  
  if (accidental === '#') midiNote += 1;
  else if (accidental === 'b') midiNote -= 1;
  
  return midiNote;
}

/**
 * Get cache key for a sample
 */
function getCacheKey(url: string): string {
  return url;
}

/**
 * Load a single audio sample
 */
async function loadSample(
  audioContext: AudioContext,
  url: string
): Promise<AudioBuffer> {
  // Check cache first
  const cacheKey = getCacheKey(url);
  const cached = sampleCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch and decode
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load sample: ${url} (${response.status})`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Cache the decoded buffer
  sampleCache.set(cacheKey, audioBuffer);
  
  return audioBuffer;
}

/**
 * Load multiple samples with progress tracking
 */
export async function loadSamples(
  audioContext: AudioContext,
  samples: SampleEntry[],
  onProgress?: LoadingProgressCallback
): Promise<LoadedSample[]> {
  const loadedSamples: LoadedSample[] = [];
  let loaded = 0;
  
  // Load samples in parallel batches to balance speed and memory
  const batchSize = 4;
  
  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = samples.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (sample) => {
        try {
          const buffer = await loadSample(audioContext, sample.url);
          loaded++;
          onProgress?.(loaded, samples.length);
          
          return {
            note: sample.note,
            midiNote: sample.midiNote,
            buffer,
            velocityLayer: sample.velocityLayer,
          };
        } catch (error) {
          console.warn(`Failed to load sample ${sample.note}:`, error);
          loaded++;
          onProgress?.(loaded, samples.length);
          return null;
        }
      })
    );
    
    // Filter out failed samples
    loadedSamples.push(...batchResults.filter((s): s is LoadedSample => s !== null));
  }
  
  return loadedSamples;
}

/**
 * Find the best sample for a given MIDI note from loaded samples
 * Returns the sample and the pitch shift needed (in semitones)
 */
export function findBestSample(
  midiNote: number,
  velocity: number,
  samples: LoadedSample[],
  velocityLayers: VelocityLayer[]
): { sample: LoadedSample; pitchShift: number } | null {
  if (samples.length === 0) return null;
  
  // Find appropriate velocity layer
  const velocityLayer = velocityLayers.find(
    layer => velocity >= layer.velocityMin && velocity <= layer.velocityMax
  ) || velocityLayers[velocityLayers.length - 1];
  
  // Filter samples by velocity layer
  const layerSamples = samples.filter(s => s.velocityLayer === velocityLayer.name);
  const samplesToSearch = layerSamples.length > 0 ? layerSamples : samples;
  
  // Find closest sample by MIDI note
  let bestSample: LoadedSample | null = null;
  let smallestDiff = Infinity;
  
  for (const sample of samplesToSearch) {
    const diff = Math.abs(sample.midiNote - midiNote);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      bestSample = sample;
    }
  }
  
  if (!bestSample) return null;
  
  // Calculate pitch shift needed
  const pitchShift = midiNote - bestSample.midiNote;
  
  return { sample: bestSample, pitchShift };
}
