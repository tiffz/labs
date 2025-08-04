/**
 * Love Per Interaction System
 * 
 * Calculates base love gained per interaction based on current love on hand.
 * Uses a simple 1% scaling formula that always increases with your love reserves.
 */

export function calculateBaseLovePerInteraction(currentLove: number): number {
  // Base love per interaction is 1% of current love, rounded down
  // This ensures it always scales directly with how much love you have
  const baseLove = Math.floor(currentLove * 0.01);
  
  // Ensure minimum of 1, no cap
  return Math.max(1, baseLove);
}

export function calculateFinalLoveGain(
  baseLovePerInteraction: number,
  interactionType: 'petting' | 'pouncing' | 'playing_during_wand',
  energyMultiplier: number = 1,
  meritMultipliers: {
    lovePetMultiplier?: number;
    lovePounceMultiplier?: number;
    loveInteractionMultiplier?: number;
  } = {}
): number {
  let finalAmount = baseLovePerInteraction;
  
  // Apply interaction-specific scaling
  if (interactionType === 'pouncing') {
    finalAmount *= 2; // Pouncing gives double the base love
  } else if (interactionType === 'playing_during_wand') {
    finalAmount *= 1; // Playing during wand uses same base as petting
  }
  
  // Apply energy multiplier (existing system)
  finalAmount *= energyMultiplier;
  
  // Apply merit-based multipliers
  if (interactionType === 'petting' || interactionType === 'playing_during_wand') {
    finalAmount *= (meritMultipliers.lovePetMultiplier || 1);
  }
  if (interactionType === 'pouncing') {
    finalAmount *= (meritMultipliers.lovePounceMultiplier || 1);
  }
  // Global love interaction multiplier applies to all
  finalAmount *= (meritMultipliers.loveInteractionMultiplier || 1);
  
  // Round to nearest integer (no fractional love)
  return Math.round(finalAmount);
}

// No longer needed - love per interaction is based on current love, not thresholds