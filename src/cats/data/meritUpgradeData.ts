export interface MeritUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string; // Material Design icon name
  effectType: 'love_per_pet_multiplier' | 'love_per_pounce_multiplier' | 'furniture_love_multiplier' | 'feeding_effect_multiplier' | 'job_treats_multiplier' | 'love_per_interaction_multiplier';
  effectAmount: number; // Multiplier amount per level (e.g., 0.1 = +10% per level)
  maxLevel: number; // Maximum level for this upgrade
}

export const meritUpgradeData: MeritUpgrade[] = [
  {
    id: 'love_per_pet_multiplier',
    name: 'Gentle Touch',
    description: 'You learn better petting techniques, gaining more love from each interaction.',
    icon: 'pets',
    effectType: 'love_per_pet_multiplier',
    effectAmount: 0.2, // +20% per level
    maxLevel: 10
  },
  {
    id: 'love_per_pounce_multiplier',
    name: 'Play Master',
    description: 'You become better at engaging your cat during play, making pounces more rewarding.',
    icon: 'sports_esports',
    effectType: 'love_per_pounce_multiplier',
    effectAmount: 0.25, // +25% per level
    maxLevel: 10
  },
  {
    id: 'furniture_love_multiplier',
    name: 'Home Designer',
    description: 'You understand how environment affects mood, boosting furniture effectiveness.',
    icon: 'chair',
    effectType: 'furniture_love_multiplier',
    effectAmount: 0.15, // +15% per level
    maxLevel: 10
  },
  {
    id: 'feeding_effect_multiplier',
    name: 'Nutrition Expert',
    description: 'You learn optimal feeding techniques, making food more effective.',
    icon: 'restaurant',
    effectType: 'feeding_effect_multiplier',
    effectAmount: 0.12, // +12% per level
    maxLevel: 10
  },
  {
    id: 'job_treats_multiplier',
    name: 'Work Ethic',
    description: 'You develop better work habits, earning more treats from jobs.',
    icon: 'work',
    effectType: 'job_treats_multiplier',
    effectAmount: 0.1, // +10% per level
    maxLevel: 10
  },

];

export function getMeritUpgradeCost(currentLevel: number): number {
  // Cost increases linearly: 1, 2, 3, 4, 5... merits per level
  return currentLevel + 1;
}

export function getMeritUpgradeEffect(upgradeId: string, level: number): number {
  const upgrade = meritUpgradeData.find(u => u.id === upgradeId);
  if (!upgrade) return 0;
  
  return upgrade.effectAmount * level; // Total multiplier effect
}

export function getTotalMeritUpgradeMultiplier(spentMerits: { [upgradeId: string]: number }, effectType: string): number {
  let totalMultiplier = 1; // Start at 100% (no bonus)
  
  meritUpgradeData
    .filter(upgrade => upgrade.effectType === effectType)
    .forEach(upgrade => {
      const level = spentMerits[upgrade.id] || 0;
      const effect = getMeritUpgradeEffect(upgrade.id, level);
      totalMultiplier += effect; // Add the percentage bonus
    });
  
  return totalMultiplier;
}

export function getAvailableMeritPoints(earnedMerits: string[], spentMerits: { [upgradeId: string]: number } | undefined): number {
  const totalEarned = earnedMerits.length;
  // Calculate actual merits spent by summing the cost progression for each upgrade
  const totalSpent = spentMerits ? Object.values(spentMerits).reduce((sum, level) => {
    // Calculate total merits spent for this upgrade level (1+2+3+...+level)
    return sum + (level * (level + 1)) / 2;
  }, 0) : 0;
  return Math.max(0, totalEarned - totalSpent);
}