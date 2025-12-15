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
 * Convert reverb strength (0-100) to wet level with non-linear curve
 * This curve preserves more dry signal at lower settings, similar to professional drum machines
 * @param strength - Reverb strength from 0 to 100
 * @returns Wet level from 0.0 to 1.0
 */
function strengthToWetLevel(strength: number): number {
  const normalized = Math.max(0, Math.min(100, strength)) / 100;
  // Use exponential curve: preserves dry signal at low settings, increases wet more at higher settings
  // This creates a more natural-sounding reverb mix similar to drumbit.app
  return Math.pow(normalized, 1.5);
}

/**
 * Create a reverb node with dry/wet mix control
 * Uses DomesticLivingRoom impulse response from OpenAir library
 * Enhanced with pre-delay and high-frequency damping for more natural sound
 * @param audioContext - The audio context to use
 * @param wetLevel - Wet signal level (0.0 to 1.0)
 * @returns Promise that resolves to object with dryGain, wetGain, convolver, delay, and filter nodes, and cleanup function
 */
export async function createReverb(
  audioContext: AudioContext,
  wetLevel: number = 0.3
): Promise<{
  dryGain: GainNode;
  wetGain: GainNode;
  convolver: ConvolverNode;
  delayNode: DelayNode;
  filterNode: BiquadFilterNode;
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

  // Add pre-delay (10-30ms) to make reverb sound more natural and less muddy
  // Pre-delay separates the dry signal from the reverb tail, improving clarity
  const delayNode = audioContext.createDelay(0.1); // Max 100ms delay
  delayNode.delayTime.value = 0.015; // 15ms pre-delay (typical for room reverb)

  // Add high-frequency damping filter to simulate natural room absorption
  // This makes the reverb sound warmer and more realistic
  const filterNode = audioContext.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 4000; // Cut frequencies above 4kHz (warmer sound)
  filterNode.Q.value = 0.7; // Gentle rolloff

  // Create gain nodes for dry/wet mix
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();

  // Set initial gain values
  const normalizedWet = Math.max(0, Math.min(1, wetLevel));
  dryGain.gain.value = 1 - normalizedWet;
  wetGain.gain.value = normalizedWet;

  // Connect reverb chain: convolver -> delay -> filter -> wetGain
  // Pre-delay and filtering make the reverb sound more natural
  convolver.connect(delayNode);
  delayNode.connect(filterNode);
  filterNode.connect(wetGain);

  return {
    dryGain,
    wetGain,
    convolver,
    delayNode,
    filterNode,
    cleanup: () => {
      // Disconnect nodes
      try {
        convolver.disconnect();
        delayNode.disconnect();
        filterNode.disconnect();
        dryGain.disconnect();
        wetGain.disconnect();
      } catch {
        // Ignore errors if already disconnected
      }
    },
  };
}

/**
 * Update reverb wet level with improved dry/wet balance
 * Uses non-linear curve to preserve dry signal at lower settings
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
  
  // Use exponential curve for smoother, more natural transitions
  // This prevents abrupt changes and maintains better dry/wet balance
  const timeConstant = 0.02; // Slightly longer for smoother transitions
  
  wetGain.gain.setTargetAtTime(normalizedWet, now, timeConstant);
  dryGain.gain.setTargetAtTime(1 - normalizedWet, now, timeConstant);
}

/**
 * Convert reverb strength percentage (0-100) to wet level with professional curve
 * This function provides a non-linear mapping that preserves dry signal at lower settings
 * @param strength - Reverb strength from 0 to 100
 * @returns Wet level from 0.0 to 1.0
 */
export function convertReverbStrengthToWetLevel(strength: number): number {
  return strengthToWetLevel(strength);
}

