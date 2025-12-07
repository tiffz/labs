/**
 * Reverb utility using Web Audio API ConvolverNode
 * Uses impulse response from OpenAir library for DomesticLivingRoom reverb
 */

import domesticLivingRoomIR from '../assets/sounds/domestic-living-room.mp4';

/**
 * Load impulse response from OpenAir library
 * DomesticLivingRoom: Real impulse response from OpenAir's domestic living room recording
 */
async function loadImpulseResponse(
  audioContext: AudioContext,
  url: string
): Promise<AudioBuffer> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Error loading impulse response:', error);
    // Fallback to generated impulse response if loading fails
    return generateFallbackImpulseResponse(audioContext);
  }
}

/**
 * Generate a simple impulse response buffer for reverb (fallback)
 * Creates a decaying noise burst that simulates room reverb
 */
function generateFallbackImpulseResponse(
  audioContext: AudioContext,
  duration: number = 0.5,
  decay: number = 2.5,
  sampleRate: number = audioContext.sampleRate
): AudioBuffer {
  const length = sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  // Generate decaying noise with high-frequency damping for warmer tone
  for (let i = 0; i < length; i++) {
    const progress = i / length;
    // Apply exponential decay
    const decayFactor = Math.pow(1 - progress, decay);
    // Apply high-frequency damping (low-pass filter effect) for warmer living room sound
    const dampingFactor = Math.pow(1 - progress * 0.7, 2);
    const n = (Math.random() * 2 - 1) * decayFactor * dampingFactor;
    leftChannel[i] = n;
    rightChannel[i] = n;
  }

  return impulse;
}

/**
 * Create a reverb node with dry/wet mix control
 * Uses DomesticLivingRoom impulse response from OpenAir library
 * @param audioContext - The audio context to use
 * @param wetLevel - Wet signal level (0.0 to 1.0)
 * @returns Promise that resolves to object with dryGain, wetGain, and convolver nodes, and cleanup function
 */
export async function createReverb(
  audioContext: AudioContext,
  wetLevel: number = 0.3
): Promise<{
  dryGain: GainNode;
  wetGain: GainNode;
  convolver: ConvolverNode;
  cleanup: () => void;
}> {
  // Load DomesticLivingRoom impulse response from OpenAir library
  // Using the imported file from assets
  let impulseResponse: AudioBuffer;
  
  try {
    // Load the imported impulse response file
    impulseResponse = await loadImpulseResponse(audioContext, domesticLivingRoomIR);
  } catch {
    // Fallback to generated impulse response if loading fails
    console.warn(
      'Could not load DomesticLivingRoom impulse response file.\n' +
      'Using fallback generated impulse response.'
    );
    impulseResponse = generateFallbackImpulseResponse(audioContext);
  }

  // Create convolver node
  const convolver = audioContext.createConvolver();
  convolver.buffer = impulseResponse;
  convolver.normalize = true;

  // Create gain nodes for dry/wet mix
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();

  // Set initial gain values
  const normalizedWet = Math.max(0, Math.min(1, wetLevel));
  dryGain.gain.value = 1 - normalizedWet;
  wetGain.gain.value = normalizedWet;

  // Connect: convolver -> wetGain
  // Note: wetGain and dryGain connections to destination are managed by audioPlayer
  convolver.connect(wetGain);

  return {
    dryGain,
    wetGain,
    convolver,
    cleanup: () => {
      // Disconnect nodes
      try {
        convolver.disconnect();
        dryGain.disconnect();
        wetGain.disconnect();
      } catch {
        // Ignore errors if already disconnected
      }
    },
  };
}

/**
 * Update reverb wet level
 * @param wetGain - The wet gain node
 * @param dryGain - The dry gain node
 * @param wetLevel - New wet level (0.0 to 1.0)
 */
export function updateReverbLevel(
  wetGain: GainNode,
  dryGain: GainNode,
  wetLevel: number
): void {
  const normalizedWet = Math.max(0, Math.min(1, wetLevel));
  const now = wetGain.context.currentTime;
  
  // Smooth transition
  wetGain.gain.setTargetAtTime(normalizedWet, now, 0.01);
  dryGain.gain.setTargetAtTime(1 - normalizedWet, now, 0.01);
}

