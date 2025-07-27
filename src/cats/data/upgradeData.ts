export interface UpgradeLevel {
  name: string;
  treatCost: number;
  loveCost: number;
  effect: number; // Multiplier or rate increase
}

export interface UpgradeData {
  id: string;
  name: string;
  description: string;
  type: 'conversion_rate' | 'love_multiplier';
  icon: string; // Now using Material Design icon names
  baseEffect: number;
  levels: UpgradeLevel[];
  // Infinite scaling parameters
  infiniteScaling: {
    baseTreatCost: number; // Base cost for infinite levels
    baseLoveCost: number;
    costMultiplier: number; // Exponential scaling (e.g., 1.5 = 50% increase per level)
    baseEffect: number; // Base effect gain per infinite level
    effectScaling: number; // How effect scales with level (linear/logarithmic)
  };
}

// Utility functions for infinite upgrades
export const getInfiniteUpgradeCost = (upgrade: UpgradeData, level: number) => {
  if (level < upgrade.levels.length) {
    return null; // Use predefined levels
  }
  
  const infiniteLevel = level - upgrade.levels.length + 1; // 1, 2, 3, etc.
  const scaling = upgrade.infiniteScaling;
  
  const treatCost = Math.floor(scaling.baseTreatCost * Math.pow(scaling.costMultiplier, infiniteLevel - 1));
  const loveCost = Math.floor(scaling.baseLoveCost * Math.pow(scaling.costMultiplier, infiniteLevel - 1));
  
  return { treatCost, loveCost };
};

export const getInfiniteUpgradeEffect = (upgrade: UpgradeData, level: number) => {
  if (level < upgrade.levels.length) {
    return null; // Use predefined levels
  }
  
  const infiniteLevel = level - upgrade.levels.length + 1;
  const scaling = upgrade.infiniteScaling;
  
  // Logarithmic scaling to prevent overpowering
  const effect = scaling.baseEffect * (1 + Math.log(infiniteLevel) * scaling.effectScaling);
  
  return effect;
};

export const getInfiniteUpgradeName = (upgrade: UpgradeData, level: number) => {
  if (level < upgrade.levels.length) {
    return null; // Use predefined levels
  }
  
  const infiniteLevel = level - upgrade.levels.length + 1;
  const tierNames = [
    "Enhanced", "Advanced", "Superior", "Elite", "Master", "Legendary", 
    "Epic", "Mythical", "Divine", "Transcendent", "Cosmic", "Infinite"
  ];
  
  const tier = Math.min(Math.floor((infiniteLevel - 1) / 5), tierNames.length - 1);
  const tierLevel = ((infiniteLevel - 1) % 5) + 1;
  
  return `${tierNames[tier]} ${upgrade.name} ${tierLevel}`;
};

export const upgradeData: UpgradeData[] = [
  // Conversion Rate Upgrades (how fast treats convert to love)
  {
    id: 'food_bowl',
    name: 'Food Bowl Upgrades',
    description: 'Increase treat conversion speed',
    type: 'conversion_rate',
    icon: 'restaurant', // Material Design restaurant icon
    baseEffect: 1, // Base: 1 treat converts per second
    levels: [
      { name: 'Bigger Bowl', treatCost: 20, loveCost: 10, effect: 0.5 }, // +0.5/sec = 1.5 total
      { name: 'Elevated Bowl', treatCost: 100, loveCost: 50, effect: 0.5 }, // +0.5/sec = 2.0 total
      { name: 'Heated Bowl', treatCost: 500, loveCost: 250, effect: 1.0 }, // +1.0/sec = 3.0 total
      { name: 'Smart Bowl', treatCost: 2000, loveCost: 1000, effect: 2.0 }, // +2.0/sec = 5.0 total
      { name: 'Luxury Dining Set', treatCost: 10000, loveCost: 5000, effect: 5.0 }, // +5.0/sec = 10.0 total
    ],
    infiniteScaling: {
      baseTreatCost: 50000,
      baseLoveCost: 25000,
      costMultiplier: 1.6,
      baseEffect: 2.0,
      effectScaling: 0.8
    }
  },
  {
    id: 'autofeeder',
    name: 'Automatic Feeders',
    description: 'Automate treat dispensing for faster conversion',
    type: 'conversion_rate',
    icon: 'precision_manufacturing', // Material Design automation icon
    baseEffect: 1,
    levels: [
      { name: 'Basic Timer Feeder', treatCost: 50, loveCost: 25, effect: 0.3 }, // +0.3/sec
      { name: 'Portion Control Feeder', treatCost: 300, loveCost: 150, effect: 0.7 }, // +0.7/sec
      { name: 'Smart Feeder', treatCost: 1500, loveCost: 750, effect: 1.5 }, // +1.5/sec
      { name: 'AI-Powered Feeder', treatCost: 7500, loveCost: 3750, effect: 3.0 }, // +3.0/sec
      { name: 'Quantum Treat Dispenser', treatCost: 25000, loveCost: 12500, effect: 7.0 }, // +7.0/sec
    ],
    infiniteScaling: {
      baseTreatCost: 100000,
      baseLoveCost: 50000,
      costMultiplier: 1.7,
      baseEffect: 3.0,
      effectScaling: 0.7
    }
  },

  // Love Multiplier Upgrades (how much love per treat conversion)
  {
    id: 'puzzle_feeder',
    name: 'Puzzle Feeders',
    description: 'Make treats more engaging and loving',
    type: 'love_multiplier',
    icon: 'extension', // Material Design puzzle icon
    baseEffect: 1, // Base: 1 treat = 1 love
    levels: [
      { name: 'Simple Maze', treatCost: 30, loveCost: 15, effect: 0.2 }, // +0.2 love per treat = 1.2 total
      { name: 'Rolling Ball Feeder', treatCost: 150, loveCost: 75, effect: 0.3 }, // +0.3 = 1.5 total
      { name: 'Multi-Level Puzzle', treatCost: 800, loveCost: 400, effect: 0.5 }, // +0.5 = 2.0 total
      { name: 'Interactive Challenge', treatCost: 3000, loveCost: 1500, effect: 1.0 }, // +1.0 = 3.0 total
      { name: 'Master Puzzle Tower', treatCost: 15000, loveCost: 7500, effect: 2.0 }, // +2.0 = 5.0 total
    ],
    infiniteScaling: {
      baseTreatCost: 75000,
      baseLoveCost: 37500,
      costMultiplier: 1.65,
      baseEffect: 1.0,
      effectScaling: 0.6
    }
  },
  {
    id: 'special_treats',
    name: 'Premium Treats',
    description: 'Upgrade treat quality for more love',
    type: 'love_multiplier',
    icon: 'star', // Material Design star icon
    baseEffect: 1,
    levels: [
      { name: 'Organic Treats', treatCost: 40, loveCost: 20, effect: 0.25 }, // +0.25 love per treat
      { name: 'Freeze-Dried Delicacies', treatCost: 200, loveCost: 100, effect: 0.25 }, // +0.25 = 1.5 total
      { name: 'Gourmet Selection', treatCost: 1000, loveCost: 500, effect: 0.5 }, // +0.5 = 2.0 total
      { name: 'Artisanal Cat Cuisine', treatCost: 4000, loveCost: 2000, effect: 1.0 }, // +1.0 = 3.0 total
      { name: 'Michelin Star Cat Food', treatCost: 20000, loveCost: 10000, effect: 2.0 }, // +2.0 = 5.0 total
    ],
    infiniteScaling: {
      baseTreatCost: 100000,
      baseLoveCost: 50000,
      costMultiplier: 1.7,
      baseEffect: 1.2,
      effectScaling: 0.5
    }
  },
  {
    id: 'feeding_environment',
    name: 'Feeding Environment',
    description: 'Create a more loving mealtime atmosphere',
    type: 'love_multiplier',
    icon: 'nature', // Material Design nature icon
    baseEffect: 1,
    levels: [
      { name: 'Cozy Corner', treatCost: 25, loveCost: 15, effect: 0.15 }, // +0.15 love per treat
      { name: 'Window Perch Dining', treatCost: 120, loveCost: 80, effect: 0.15 }, // +0.15 = 1.3 total
      { name: 'Garden View Setup', treatCost: 600, loveCost: 400, effect: 0.2 }, // +0.2 = 1.5 total
      { name: 'Zen Feeding Space', treatCost: 2500, loveCost: 1500, effect: 0.35 }, // +0.35 = 1.85 total
      { name: 'Royal Dining Hall', treatCost: 12000, loveCost: 8000, effect: 0.65 }, // +0.65 = 2.5 total
    ],
    infiniteScaling: {
      baseTreatCost: 60000,
      baseLoveCost: 40000,
      costMultiplier: 1.6,
      baseEffect: 0.8,
      effectScaling: 0.4
    }
  },
]; 