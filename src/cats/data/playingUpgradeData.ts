export interface PlayingUpgradeLevel {
  name: string;
  loveCost: number;
  effect: number; // Amount to increase the base value
}

export interface PlayingUpgradeData {
  id: string;
  name: string;
  description: string;
  icon: string; // Material Design icon name
  currentValue: number; // This will be passed in dynamically
  levels: PlayingUpgradeLevel[];
  // Infinite scaling parameters
  infiniteScaling: {
    baseLoveCost: number;
    costMultiplier: number;
    baseEffect: number;
    effectScaling: number;
  };
}

// Utility functions for infinite playing upgrades
export const getInfinitePlayingUpgradeCost = (upgrade: PlayingUpgradeData, level: number) => {
  if (level < upgrade.levels.length) {
    return null; // Use predefined levels
  }
  
  const infiniteLevel = level - upgrade.levels.length + 1; // 1, 2, 3, etc.
  const scaling = upgrade.infiniteScaling;
  
  const loveCost = Math.floor(scaling.baseLoveCost * Math.pow(scaling.costMultiplier, infiniteLevel - 1));
  
  return { loveCost };
};

export const getInfinitePlayingUpgradeEffect = (upgrade: PlayingUpgradeData, level: number) => {
  if (level < upgrade.levels.length) {
    return null; // Use predefined levels
  }
  
  const infiniteLevel = level - upgrade.levels.length + 1;
  const scaling = upgrade.infiniteScaling;
  
  // Logarithmic scaling to prevent overpowering
  const effect = scaling.baseEffect * (1 + Math.log(infiniteLevel) * scaling.effectScaling);
  
  return effect;
};

export const getInfinitePlayingUpgradeName = (upgrade: PlayingUpgradeData, level: number) => {
  if (level < upgrade.levels.length) {
    return null; // Use predefined levels
  }
  
  const infiniteLevel = level - upgrade.levels.length + 1;
  const tierNames = [
    "Enhanced", "Advanced", "Superior", "Elite", "Master", "Legendary", 
    "Epic", "Mythical", "Divine", "Transcendent", "Cosmic", "Infinite"
  ];
  
  const tier = Math.min(Math.floor((infiniteLevel - 1) / 3), tierNames.length - 1);
  const tierLevel = ((infiniteLevel - 1) % 3) + 1;
  
  return `${tierNames[tier]} ${upgrade.name} ${tierLevel}`;
};

export const playingUpgradeData: PlayingUpgradeData[] = [
  {
    id: 'love_per_pet',
    name: 'Petting Technique',
    description: 'Improve how much love you give with each pet',
    icon: 'touch_app', // Material Design touch icon
    currentValue: 1, // Will be overridden by actual value
    levels: [
      { name: 'Gentle Touch', loveCost: 10, effect: 1 }, // 1 -> 2
      { name: 'Caring Stroke', loveCost: 50, effect: 1 }, // 2 -> 3
      { name: 'Loving Massage', loveCost: 200, effect: 2 }, // 3 -> 5
      { name: 'Expert Petting', loveCost: 800, effect: 3 }, // 5 -> 8
      { name: 'Master of Affection', loveCost: 3000, effect: 5 }, // 8 -> 13
      { name: 'Professional Pet Whisperer', loveCost: 12000, effect: 7 }, // 13 -> 20
      { name: 'Legendary Cat Cuddler', loveCost: 50000, effect: 10 }, // 20 -> 30
    ],
    infiniteScaling: {
      baseLoveCost: 200000,
      costMultiplier: 1.8,
      baseEffect: 5,
      effectScaling: 0.6
    }
  },
  {
    id: 'love_per_pounce',
    name: 'Play Engagement',
    description: 'Make playtime more rewarding and fun',
    icon: 'sports_esports', // Material Design gaming icon
    currentValue: 3, // Will be overridden by actual value
    levels: [
      { name: 'Better Timing', loveCost: 30, effect: 1 }, // 3 -> 4
      { name: 'Playful Movements', loveCost: 120, effect: 2 }, // 4 -> 6
      { name: 'Engaging Patterns', loveCost: 500, effect: 3 }, // 6 -> 9
      { name: 'Master Choreography', loveCost: 2000, effect: 4 }, // 9 -> 13
      { name: 'Cat Entertainment Expert', loveCost: 8000, effect: 6 }, // 13 -> 19
      { name: 'Professional Cat Trainer', loveCost: 30000, effect: 8 }, // 19 -> 27
      { name: 'Legendary Play Master', loveCost: 120000, effect: 13 }, // 27 -> 40
    ],
    infiniteScaling: {
      baseLoveCost: 500000,
      costMultiplier: 1.9,
      baseEffect: 8,
      effectScaling: 0.7
    }
  },
]; 