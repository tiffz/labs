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
  // Love Multiplier Upgrades
  {
    id: 'gourmet_kibble',
    name: 'Gourmet Kibble',
    description: 'Replace standard kibble with a premium, five-star recipe that cats dream of.',
    type: 'love_multiplier',
    baseEffect: 1,
    icon: 'restaurant_menu',
    levels: [
      { name: 'Salmon Pâté', treatCost: 200, loveCost: 0, effect: 0.1 },
      { name: 'Tuna & Shrimp', treatCost: 1000, loveCost: 0, effect: 0.15 },
      { name: 'Chicken & Rice', treatCost: 4000, loveCost: 0, effect: 0.2 },
      { name: 'Lamb & Quinoa', treatCost: 15000, loveCost: 0, effect: 0.25 },
      { name: 'Venison & Cranberry', treatCost: 50000, loveCost: 0, effect: 0.3 },
    ],
    infiniteScaling: {
      baseTreatCost: 100000,
      baseLoveCost: 50000,
      costMultiplier: 1.7,
      baseEffect: 1.0,
      effectScaling: 0.6
    }
  },
  {
    id: 'plush_cat_bed',
    name: 'Plush Cat Bed',
    description: 'A ridiculously comfortable bed that makes every nap a journey to cloud nine.',
    type: 'love_multiplier',
    baseEffect: 1,
    icon: 'hotel',
    levels: [
      { name: 'Basic', treatCost: 500, loveCost: 50, effect: 0.2 },
      { name: 'Memory Foam', treatCost: 2500, loveCost: 250, effect: 0.25 },
      { name: 'Ergonomic', treatCost: 12000, loveCost: 1200, effect: 0.3 },
      { name: 'Luxury', treatCost: 60000, loveCost: 6000, effect: 0.4 },
      { name: 'Ultra-Luxury', treatCost: 300000, loveCost: 30000, effect: 0.5 },
    ],
    infiniteScaling: {
      baseTreatCost: 150000,
      baseLoveCost: 15000,
      costMultiplier: 1.8,
      baseEffect: 1.0,
      effectScaling: 0.3
    }
  }
]; 