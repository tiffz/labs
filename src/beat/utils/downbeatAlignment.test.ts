import { describe, it, expect } from 'vitest';
import { alignBeatGridToDownbeat } from './downbeatAlignment';

/**
 * Create a mock audio buffer with synthetic audio containing
 * energy peaks at specified times to simulate beats/onsets.
 */
function createMockAudioBuffer(
  duration: number,
  sampleRate: number,
  peakTimes: number[],
  peakEnergy: number = 0.8
): { getChannelData: (channel: number) => Float32Array; sampleRate: number } {
  const numSamples = Math.floor(duration * sampleRate);
  const data = new Float32Array(numSamples);
  
  // Fill with low-level noise
  for (let i = 0; i < numSamples; i++) {
    data[i] = (Math.random() - 0.5) * 0.02;
  }
  
  // Add energy peaks at specified times
  const peakWidth = Math.floor(sampleRate * 0.02); // 20ms wide peaks
  for (const peakTime of peakTimes) {
    const peakSample = Math.floor(peakTime * sampleRate);
    for (let i = 0; i < peakWidth && peakSample + i < numSamples; i++) {
      // Gaussian-like envelope
      const envelope = Math.exp(-((i - peakWidth / 2) ** 2) / (2 * (peakWidth / 4) ** 2));
      data[peakSample + i] = peakEnergy * envelope * (Math.random() * 0.2 + 0.8);
    }
  }
  
  return {
    getChannelData: () => data,
    sampleRate,
  };
}

/**
 * Generate beat times starting from a given offset.
 */
function generateBeatTimes(startTime: number, bpm: number, numBeats: number): number[] {
  const beatInterval = 60 / bpm;
  const times: number[] = [];
  for (let i = 0; i < numBeats; i++) {
    times.push(startTime + i * beatInterval);
  }
  return times;
}

describe('downbeatAlignment', () => {
  describe('alignBeatGridToDownbeat', () => {
    it('should align to a beat position when audio starts on beat 1', () => {
      const bpm = 120;
      const musicStartTime = 0;
      const beatInterval = 60 / bpm;
      const beatTimes = generateBeatTimes(musicStartTime, bpm, 16);
      
      const audioBuffer = createMockAudioBuffer(10, 44100, beatTimes);
      
      const result = alignBeatGridToDownbeat(audioBuffer, bpm, musicStartTime, 4);
      
      // Should align to one of the beat positions (within tolerance)
      // The aligned time should be a multiple of beat interval from music start
      const beatsFromStart = (result.alignedStartTime - musicStartTime) / beatInterval;
      const nearestBeat = Math.round(beatsFromStart);
      const offsetFromBeat = Math.abs(beatsFromStart - nearestBeat) * beatInterval;
      
      expect(offsetFromBeat).toBeLessThan(0.1);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect pickup notes and align to actual beat 1', () => {
      const bpm = 120;
      const beatInterval = 60 / bpm; // 0.5s
      const actualBeat1Time = 0.3; // Beat 1 starts at 0.3s
      const pickupTime = 0.05; // Pickup note at 0.05s
      
      // Create peaks: pickup, then regular beats starting at beat 1
      const beatTimes = [pickupTime, ...generateBeatTimes(actualBeat1Time, bpm, 16)];
      
      const audioBuffer = createMockAudioBuffer(10, 44100, beatTimes);
      
      const result = alignBeatGridToDownbeat(audioBuffer, bpm, 0, 4);
      
      // Should align closer to the actual beat 1 (0.3s) rather than the pickup (0.05s)
      // Allow some tolerance since alignment is heuristic
      expect(result.alignedStartTime).toBeGreaterThan(pickupTime + 0.1);
      expect(result.alignedStartTime).toBeLessThan(actualBeat1Time + beatInterval);
      
      // May or may not detect as pickup depending on confidence
      // The key is that it aligns better with the beat pattern
    });

    it('should handle music starting after silence', () => {
      const bpm = 120;
      const musicStartTime = 2.0; // Music starts at 2 seconds
      const beatTimes = generateBeatTimes(musicStartTime, bpm, 16);
      
      const audioBuffer = createMockAudioBuffer(15, 44100, beatTimes);
      
      const result = alignBeatGridToDownbeat(audioBuffer, bpm, musicStartTime, 4);
      
      // Should stay close to the music start time
      expect(result.alignedStartTime).toBeGreaterThanOrEqual(musicStartTime - 0.1);
      expect(result.alignedStartTime).toBeLessThan(musicStartTime + 0.5);
    });

    it('should return original time when no clear onsets are found', () => {
      const bpm = 120;
      const musicStartTime = 0;
      
      // Create nearly silent audio (no peaks)
      const audioBuffer = createMockAudioBuffer(5, 44100, [], 0);
      
      const result = alignBeatGridToDownbeat(audioBuffer, bpm, musicStartTime, 4);
      
      // Should fall back to original start time
      expect(result.alignedStartTime).toBe(musicStartTime);
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should handle different BPMs correctly', () => {
      // Test at slow tempo (60 BPM)
      const slowBpm = 60;
      const slowBeatInterval = 60 / slowBpm;
      const slowBeatTimes = generateBeatTimes(0, slowBpm, 8);
      const slowBuffer = createMockAudioBuffer(10, 44100, slowBeatTimes);
      
      const slowResult = alignBeatGridToDownbeat(slowBuffer, slowBpm, 0, 4);
      // Should align to a beat position
      const slowBeatsFromStart = slowResult.alignedStartTime / slowBeatInterval;
      const slowNearestBeat = Math.round(slowBeatsFromStart);
      const slowOffset = Math.abs(slowBeatsFromStart - slowNearestBeat) * slowBeatInterval;
      expect(slowOffset).toBeLessThan(0.1);

      // Test at fast tempo (180 BPM)
      const fastBpm = 180;
      const fastBeatInterval = 60 / fastBpm;
      const fastBeatTimes = generateBeatTimes(0, fastBpm, 24);
      const fastBuffer = createMockAudioBuffer(10, 44100, fastBeatTimes);
      
      const fastResult = alignBeatGridToDownbeat(fastBuffer, fastBpm, 0, 4);
      // Should align to a beat position
      const fastBeatsFromStart = fastResult.alignedStartTime / fastBeatInterval;
      const fastNearestBeat = Math.round(fastBeatsFromStart);
      const fastOffset = Math.abs(fastBeatsFromStart - fastNearestBeat) * fastBeatInterval;
      expect(fastOffset).toBeLessThan(0.1);
    });

    it('should handle 3/4 time signature', () => {
      const bpm = 120;
      const beatsPerMeasure = 3;
      const beatInterval = 60 / bpm;
      const beatTimes = generateBeatTimes(0, bpm, 18); // 6 measures
      
      const audioBuffer = createMockAudioBuffer(10, 44100, beatTimes);
      
      const result = alignBeatGridToDownbeat(audioBuffer, bpm, 0, beatsPerMeasure);
      
      // Should align to a beat position
      const beatsFromStart = result.alignedStartTime / beatInterval;
      const nearestBeat = Math.round(beatsFromStart);
      const offset = Math.abs(beatsFromStart - nearestBeat) * beatInterval;
      expect(offset).toBeLessThan(0.1);
    });

    it('should provide debug info when requested', () => {
      const bpm = 120;
      const beatTimes = generateBeatTimes(0, bpm, 16);
      const audioBuffer = createMockAudioBuffer(10, 44100, beatTimes);
      
      const result = alignBeatGridToDownbeat(audioBuffer, bpm, 0, 4);
      
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.candidateCount).toBeGreaterThan(0);
      expect(result.debugInfo?.originalMusicStart).toBe(0);
    });

    it('should handle edge case of very short audio', () => {
      const bpm = 120;
      const beatTimes = generateBeatTimes(0, bpm, 2); // Only 2 beats
      const audioBuffer = createMockAudioBuffer(1, 44100, beatTimes);
      
      const result = alignBeatGridToDownbeat(audioBuffer, bpm, 0, 4);
      
      // Should not crash and should return something reasonable
      expect(result.alignedStartTime).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
