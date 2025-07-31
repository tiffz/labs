export interface PlayingUpgradeLevel {
  name: string;
  loveCost: number;
  effect: number; // Amount to increase the base value
}

export interface PlayingUpgradeData {
  id: 'love_per_pet' | 'love_per_pounce';
  name: string;
  description: string;
  currentValue: number; // This will be passed in dynamically
  icon: string; // Material Design icon name
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
    name: 'Better Petting',
    description: 'Master the art of the perfect head scratch to get more love from every pet.',
    icon: 'pets',
    currentValue: 0, // Placeholder, will be updated dynamically
    levels: [
      { name: 'Gentle Strokes', loveCost: 10, effect: 1 },
      { name: 'Chin Scratches', loveCost: 50, effect: 2 },
      { name: 'Belly Rubs (Danger Zone)', loveCost: 250, effect: 3 },
      { name: 'The Perfect Spot', loveCost: 1000, effect: 5 },
      { name: 'Mystical Connection', loveCost: 5000, effect: 10 },
    ],
    infiniteScaling: {
      baseLoveCost: 10000,
      costMultiplier: 1.8,
      baseEffect: 20,
      effectScaling: 1.2,
    }
  },
  {
    id: 'love_per_pounce',
    name: 'Pounce Power-up',
    description: 'Increase the energy and love generated from each playful pounce.',
    icon: 'stadia_controller',
    currentValue: 0, // Placeholder, will be updated dynamically
    levels: [
      { name: 'Wiggly Butt', loveCost: 100, effect: 5 },
      { name: 'Silent Paws', loveCost: 750, effect: 10 },
      { name: 'Super Pounce', loveCost: 3000, effect: 25 },
      { name: 'The Unseen Hunter', loveCost: 12000, effect: 50 },
      { name: 'Apex Predator', loveCost: 50000, effect: 100 },
    ],
    infiniteScaling: {
      baseLoveCost: 100000,
      costMultiplier: 1.9,
      baseEffect: 200,
      effectScaling: 1.3,
    }
  }
]; 