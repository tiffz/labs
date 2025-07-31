export interface ThingData {
  id: string;
  name: string;
  description: string;
  icon: string; // Material Design icon name
  category: 'feeding' | 'environment';
  basePrice: number; // Base price in treats
  priceMultiplier: number; // How much price increases per purchase (e.g., 1.15 = 15% increase)
  effectType: 'love_per_treat' | 'treat_consumption_rate' | 'auto_love_rate';
  baseEffect: number; // Base effect value
}

export const thingsData: ThingData[] = [
  // Feeding category - improve treat to love conversion
  {
    id: 'ceramic_bowl',
    name: 'Ceramic Bowl',
    description: 'Increases how many treats your cat wants to eat per feeding session',
    icon: 'dining',
    category: 'feeding',
    basePrice: 15,
    priceMultiplier: 1.15,
    effectType: 'treat_consumption_rate',
    baseEffect: 1, // +1 treat consumed per feeding action
  },
  {
    id: 'slow_feeder',
    name: 'Slow Feeder',
    description: 'Makes each treat give more love as your cat savors it',
    icon: 'schedule',
    category: 'feeding',
    basePrice: 50,
    priceMultiplier: 1.2,
    effectType: 'love_per_treat',
    baseEffect: 1, // +1 love per treat
  },
  {
    id: 'automatic_dispenser',
    name: 'Automatic Dispenser',
    description: 'Perfectly portions treats to give maximum satisfaction',
    icon: 'precision_manufacturing',
    category: 'feeding',
    basePrice: 200,
    priceMultiplier: 1.25,
    effectType: 'love_per_treat',
    baseEffect: 2, // +2 love per treat
  },

  // Environment category - generate automatic love
  {
    id: 'cardboard_box',
    name: 'Cardboard Box',
    description: 'Every cat needs a good box to hide in',
    icon: 'inventory_2',
    category: 'environment',
    basePrice: 25,
    priceMultiplier: 1.12,
    effectType: 'auto_love_rate',
    baseEffect: 1, // +1 love/sec
  },
  {
    id: 'cat_tree',
    name: 'Cat Tree',
    description: 'A tall scratching post with multiple levels for climbing',
    icon: 'nature',
    category: 'environment',
    basePrice: 100,
    priceMultiplier: 1.18,
    effectType: 'auto_love_rate',
    baseEffect: 2.0, // +2 love/sec
  },
  {
    id: 'heated_bed',
    name: 'Heated Bed',
    description: 'A cozy heated bed that keeps your cat content',
    icon: 'hotel',
    category: 'environment',
    basePrice: 300,
    priceMultiplier: 1.22,
    effectType: 'auto_love_rate',
    baseEffect: 5.0, // +5 love/sec
  },
  {
    id: 'window_perch',
    name: 'Window Perch',
    description: 'Perfect spot for bird watching and sunbathing',
    icon: 'window',
    category: 'environment',
    basePrice: 75,
    priceMultiplier: 1.15,
    effectType: 'auto_love_rate',
    baseEffect: 1.5, // +1.5 love/sec
  },
  {
    id: 'catnip_garden',
    name: 'Catnip Garden',
    description: 'Fresh catnip grown just for your cat',
    icon: 'eco',
    category: 'environment',
    basePrice: 150,
    priceMultiplier: 1.2,
    effectType: 'auto_love_rate',
    baseEffect: 3.0, // +3 love/sec
  },
];

export const getThingPrice = (thing: ThingData, currentQuantity: number): number => {
  // Calculate price based on quantity owned using compound growth formula
  return Math.floor(thing.basePrice * Math.pow(thing.priceMultiplier, currentQuantity));
};

export const getThingTotalEffect = (thing: ThingData, quantity: number): number => {
  // Total effect is base effect multiplied by quantity
  return thing.baseEffect * quantity;
};

export const getThingsByCategory = (category: 'feeding' | 'environment'): ThingData[] => {
  return thingsData.filter(thing => thing.category === category);
}; 