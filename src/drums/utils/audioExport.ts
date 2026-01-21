import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { getDefaultBeatGrouping, getBeatGroupInfo, getBeatGroupingInSixteenths, getSixteenthsPerMeasure } from './timeSignatureUtils';
import { createReverb, convertReverbStrengthToWetLevel } from './reverb';
// @ts-expect-error - lamejs doesn't have TypeScript definitions
// Use patched version to fix MPEGMode error
import * as lamejs from 'lamejsfixbug121';

// Import audio files
import dumSound from '../assets/sounds/dum.wav';
import takSound from '../assets/sounds/tak.wav';
import kaSound from '../assets/sounds/ka.wav';
import slapSound from '../assets/sounds/slap2.wav';
import clickSound from '../assets/sounds/click.mp3';

type DrumSound = 'dum' | 'tak' | 'ka' | 'slap' | 'rest';

const SOUND_FILES: Record<Exclude<DrumSound, 'rest'>, string> = {
  dum: dumSound,
  tak: takSound,
  ka: kaSound,
  slap: slapSound,
};

/**
 * Calculate the duration of a rhythm in seconds
 */
export function calculateRhythmDuration(rhythm: ParsedRhythm, bpm: number): number {
  const msPerSixteenth = (60000 / bpm) / 4;
  let totalDuration = 0;

  rhythm.measures.forEach(measure => {
    measure.notes.forEach(note => {
      totalDuration += note.durationInSixteenths * msPerSixteenth;
    });
  });

  return totalDuration / 1000; // Convert to seconds
}

/**
 * Load audio buffers for offline rendering
 */
async function loadAudioBuffers(offlineContext: OfflineAudioContext): Promise<Map<DrumSound, AudioBuffer>> {
  const buffers = new Map<DrumSound, AudioBuffer>();

  for (const [sound, src] of Object.entries(SOUND_FILES)) {
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await offlineContext.decodeAudioData(arrayBuffer);
    buffers.set(sound as DrumSound, buffer);
  }

  return buffers;
}

/**
 * Load metronome click buffer for offline rendering
 */
async function loadClickBuffer(offlineContext: OfflineAudioContext): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(clickSound);
    if (!response.ok) {
      throw new Error(`Failed to fetch click sound: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await offlineContext.decodeAudioData(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error('Failed to load metronome click sound:', error);
    return null;
  }
}

/**
 * Render rhythm audio using OfflineAudioContext
 * @param rhythm - The parsed rhythm to render
 * @param bpm - Beats per minute
 * @param loops - Number of times to loop the rhythm
 * @param playbackSettings - Playback settings for accents and reverb
 * @returns Promise resolving to AudioBuffer
 */
export async function renderRhythmAudio(
  rhythm: ParsedRhythm,
  bpm: number,
  loops: number,
  playbackSettings: PlaybackSettings,
  metronomeEnabled: boolean = false
): Promise<AudioBuffer> {
  // Calculate total duration
  const singleLoopDuration = calculateRhythmDuration(rhythm, bpm);
  const totalDuration = singleLoopDuration * loops;

  // Create offline audio context
  const sampleRate = 44100;
  const offlineContext = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

  // Load audio buffers
  const buffers = await loadAudioBuffers(offlineContext);

  // Load metronome click buffer if metronome is enabled
  let clickBuffer: AudioBuffer | null = null;
  if (metronomeEnabled) {
    clickBuffer = await loadClickBuffer(offlineContext);
    if (!clickBuffer) {
      console.warn('[Audio Export] Metronome enabled but click buffer failed to load. Metronome will not be included in export.');
    } else {
      // Verify click buffer is valid
      if (clickBuffer.length === 0 || clickBuffer.duration === 0) {
        console.warn('[Audio Export] Metronome click buffer is empty. Metronome will not be included in export.');
        clickBuffer = null;
      }
    }
  }

  // Set up reverb if enabled
  let reverbNodes: {
    dryGain: GainNode;
    wetGain: GainNode;
    convolver: ConvolverNode;
    delayNode: DelayNode;
    filterNode: BiquadFilterNode;
  } | null = null;

  if (playbackSettings.reverbStrength > 0) {
    const wetLevel = convertReverbStrengthToWetLevel(playbackSettings.reverbStrength);
    reverbNodes = await createReverb(offlineContext as unknown as AudioContext, undefined, wetLevel);
    // Connect reverb nodes to destination (dryGain and wetGain)
    reverbNodes.dryGain.connect(offlineContext.destination);
    reverbNodes.wetGain.connect(offlineContext.destination);
  }

  // Calculate milliseconds per sixteenth note
  const msPerSixteenth = (60000 / bpm) / 4;

  // Get beat grouping
  const beatGrouping = getDefaultBeatGrouping(rhythm.timeSignature);
  const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, rhythm.timeSignature);

  // Render each loop
  for (let loopIndex = 0; loopIndex < loops; loopIndex++) {
    const loopStartTime = loopIndex * singleLoopDuration;
    let currentTime = loopStartTime;

    rhythm.measures.forEach((measure) => {
      let positionInMeasure = 0;

      measure.notes.forEach((note) => {
        const noteStartTime = currentTime;

        // Calculate volume based on beat group position
        const settings = playbackSettings;
        const isSimpleRhythm = rhythm.timeSignature.denominator === 4;
        let volume = settings.nonAccentVolume / 100;

        if (positionInMeasure === 0) {
          volume = settings.measureAccentVolume / 100;
        } else {
          const groupInfo = getBeatGroupInfo(positionInMeasure, beatGroupingInSixteenths);
          if (groupInfo.isFirstOfGroup) {
            if (!isSimpleRhythm || settings.emphasizeSimpleRhythms) {
              volume = settings.beatGroupAccentVolume / 100;
            }
          }
        }

        // Schedule the note if it's not a rest and not a tied continuation
        // Tied notes (isTiedFrom) represent the continuation of a previous note's duration,
        // not a new sound attack. Only the first note in a tie chain should play.
        if (note.sound !== 'rest' && !note.isTiedFrom) {
          const buffer = buffers.get(note.sound);
          if (buffer) {
            const source = offlineContext.createBufferSource();
            source.buffer = buffer;

            // Create gain node for volume
            const gainNode = offlineContext.createGain();
            gainNode.gain.setValueAtTime(volume, noteStartTime);

            // Apply fade-out for very short notes (< 150ms)
            const noteDurationSeconds = (note.durationInSixteenths * msPerSixteenth) / 1000;
            if (noteDurationSeconds < 0.15) {
              const fadeStartTime = noteStartTime + (noteDurationSeconds * 0.8);
              const fadeEndTime = noteStartTime + noteDurationSeconds;
              gainNode.gain.setValueAtTime(volume, fadeStartTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, fadeEndTime);
            }

            // Connect audio chain
            if (reverbNodes && playbackSettings.reverbStrength > 0) {
              // With reverb: source -> gain -> (dryGain + convolver -> delay -> filter -> wetGain) -> destination
              source.connect(gainNode);
              gainNode.connect(reverbNodes.dryGain);
              gainNode.connect(reverbNodes.convolver);
              // dryGain and wetGain should already be connected to destination from createReverb
            } else {
              // Without reverb: source -> gain -> destination
              source.connect(gainNode);
              gainNode.connect(offlineContext.destination);
            }

            // Start playback
            source.start(noteStartTime);

            // Only stop source if we need to clip it (for fade-out on very short notes)
            // Otherwise let it play naturally - don't stop it early
            if (noteDurationSeconds < 0.15) {
              // For very short notes with fade-out, stop after fade completes
              source.stop(noteStartTime + noteDurationSeconds + 0.01);
            }
            // For longer notes, let the buffer play its full duration naturally
          }
        }

        // Advance time
        const noteDurationSeconds = (note.durationInSixteenths * msPerSixteenth) / 1000;
        currentTime += noteDurationSeconds;
        positionInMeasure += note.durationInSixteenths;
      });
    });

    // Schedule metronome clicks for this loop if enabled
    if (metronomeEnabled && clickBuffer) {
      const sixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);
      let measureStartTime = loopStartTime;

      rhythm.measures.forEach((measure) => {
        // Add downbeat (start of measure)
        const downbeatTime = measureStartTime;
        const baseVolume = 0.8; // Downbeat is louder
        const clickVolume = baseVolume * (playbackSettings.metronomeVolume / 100);

        if (clickVolume > 0 && clickBuffer) {
          const source = offlineContext.createBufferSource();
          source.buffer = clickBuffer;
          const gainNode = offlineContext.createGain();
          // Set gain before connecting to ensure it's applied
          gainNode.gain.setValueAtTime(clickVolume, downbeatTime);

          // Connect audio chain
          source.connect(gainNode);
          if (reverbNodes && playbackSettings.reverbStrength > 0) {
            gainNode.connect(reverbNodes.dryGain);
            gainNode.connect(reverbNodes.convolver);
          } else {
            gainNode.connect(offlineContext.destination);
          }

          source.start(downbeatTime);
        }

        // Add beat group starts (one click per beat group)
        let cumulativePosition = 0;
        beatGroupingInSixteenths.forEach((groupSize) => {
          cumulativePosition += groupSize;
          if (cumulativePosition < sixteenthsPerMeasure) {
            const beatTime = measureStartTime + (cumulativePosition * msPerSixteenth) / 1000;
            const baseVolume = 0.5; // Regular beats are quieter
            const clickVolume = baseVolume * (playbackSettings.metronomeVolume / 100);

            if (clickVolume > 0 && clickBuffer) {
              const source = offlineContext.createBufferSource();
              source.buffer = clickBuffer;
              const gainNode = offlineContext.createGain();
              // Set gain before connecting to ensure it's applied
              gainNode.gain.setValueAtTime(clickVolume, beatTime);

              // Connect audio chain
              source.connect(gainNode);
              if (reverbNodes && playbackSettings.reverbStrength > 0) {
                gainNode.connect(reverbNodes.dryGain);
                gainNode.connect(reverbNodes.convolver);
              } else {
                gainNode.connect(offlineContext.destination);
              }

              source.start(beatTime);
            }
          }
        });

        // Calculate measure duration
        let measureDuration = 0;
        measure.notes.forEach(note => {
          measureDuration += (note.durationInSixteenths * msPerSixteenth) / 1000;
        });
        measureStartTime += measureDuration;
      });
    } else if (metronomeEnabled && !clickBuffer) {
      console.warn('[Audio Export] Metronome enabled but click buffer failed to load. Metronome will not be included in export.');
    }
  }

  // Start rendering
  return offlineContext.startRendering();
}

/**
 * Convert AudioBuffer to MP3 blob
 */
export function audioBufferToMp3(buffer: AudioBuffer, bitrate: number = 128): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const sampleRate = buffer.sampleRate;
      const numberOfChannels = buffer.numberOfChannels;
      const length = buffer.length;

      if (length === 0) {
        reject(new Error('Audio buffer is empty'));
        return;
      }

      // Get audio data
      const leftChannel = buffer.getChannelData(0);
      const rightChannel = numberOfChannels > 1 ? buffer.getChannelData(1) : leftChannel;

      // Convert float samples to 16-bit PCM - separate arrays for left and right
      const leftSamples = new Int16Array(length);
      const rightSamples = new Int16Array(length);

      for (let i = 0; i < length; i++) {
        const left = Math.max(-1, Math.min(1, leftChannel[i]));
        const right = numberOfChannels > 1
          ? Math.max(-1, Math.min(1, rightChannel[i]))
          : left;

        leftSamples[i] = left < 0 ? left * 0x8000 : left * 0x7FFF;
        rightSamples[i] = right < 0 ? right * 0x8000 : right * 0x7FFF;
      }

      // Create MP3 encoder - lamejsfixbug121 exports Mp3Encoder directly
      // Define LameJs interface locally since no types are available
      interface LameJsEncoder {
        encodeBuffer(left: Int16Array, right: Int16Array): Int8Array | undefined;
        flush(): Int8Array | undefined;
      }

      interface LameJsLibrary {
        Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => LameJsEncoder;
      }

      const Mp3Encoder = (lamejs as unknown as LameJsLibrary).Mp3Encoder;

      if (!Mp3Encoder || typeof Mp3Encoder !== 'function') {
        reject(new Error('MP3 encoder not available. Please ensure lamejsfixbug121 is properly installed.'));
        return;
      }

      try {
        // Initialize encoder and encode
        const mp3encoder = new Mp3Encoder(numberOfChannels, sampleRate, bitrate);

        if (!mp3encoder || typeof mp3encoder.encodeBuffer !== 'function' || typeof mp3encoder.flush !== 'function') {
          reject(new Error('MP3 encoder initialization failed or encoder methods are not available'));
          return;
        }

        const sampleBlockSize = 1152;
        const mp3Data: Int8Array[] = [];

        // Encode in chunks - encodeBuffer expects separate left and right arrays
        for (let i = 0; i < length; i += sampleBlockSize) {
          const leftChunk = leftSamples.subarray(i, i + sampleBlockSize);
          const rightChunk = rightSamples.subarray(i, i + sampleBlockSize);

          try {
            const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            // encodeBuffer returns Int8Array or undefined
            if (mp3buf && (mp3buf instanceof Int8Array || Array.isArray(mp3buf)) && mp3buf.length > 0) {
              mp3Data.push(mp3buf);
            }
          } catch (encodeError) {
            console.error('Error encoding MP3 chunk:', encodeError);
            // Continue with next chunk
          }
        }

        // Flush remaining data
        try {
          const mp3buf = mp3encoder.flush();
          // flush returns Int8Array or undefined
          if (mp3buf && (mp3buf instanceof Int8Array || Array.isArray(mp3buf)) && mp3buf.length > 0) {
            mp3Data.push(mp3buf);
          }
        } catch (flushError) {
          console.error('Error flushing MP3 encoder:', flushError);
          // Continue even if flush fails
        }

        // Check if we have any MP3 data
        if (mp3Data.length === 0) {
          reject(new Error('MP3 encoding produced no data. The encoder may not be working correctly.'));
          return;
        }

        // Combine all MP3 data
        const totalLength = mp3Data.reduce((acc, arr) => acc + arr.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of mp3Data) {
          // Convert Int8Array to Uint8Array for blob
          const uint8Arr = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
          combined.set(uint8Arr, offset);
          offset += arr.length;
        }

        resolve(new Blob([combined], { type: 'audio/mp3' }));
      } catch (encoderError) {
        reject(new Error(`MP3 encoding failed: ${encoderError instanceof Error ? encoderError.message : String(encoderError)}`));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convert AudioBuffer to WAV blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Format duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Export audio buffer in the specified format
 */
export async function exportAudioBuffer(
  buffer: AudioBuffer,
  format: 'wav' | 'mp3',
  bitrate?: number
): Promise<Blob> {
  if (format === 'mp3') {
    return audioBufferToMp3(buffer, bitrate || 128);
  }
  return audioBufferToWav(buffer);
}
