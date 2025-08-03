export interface Award {
  id: string;
  title: string;
  description: string;
  type: 'special_action' | 'hidden_discovery' | 'secret_interaction';
  target?: {
    actionType?: 'nose_click' | 'happy_jump' | 'ear_wiggle' | 'cheek_pet';
    count?: number;
  };
  reward?: {
    love?: number;
    treats?: number;
    message?: string;
  };
  notification?: {
    title?: string;
    message?: string;
  };
  icon: string;
  color: string;
  isSecret: boolean; // Awards are hidden until unlocked
}

export const gameAwards: Award[] = [
  {
    id: 'boop_achievement',
    title: 'Boop',
    description: 'Click your cat\'s nose for the first time',
    type: 'special_action',
    target: {
      actionType: 'nose_click',
      count: 1
    },
    reward: {
      love: 10,
      message: 'Your cat\'s nose twitches adorably. Boop!'
    },
    notification: {
      title: 'Achievement Unlocked: Boop!',
      message: 'You discovered the ancient art of the nose boop.'
    },
    icon: 'touch_app',
    color: '#ff9ec7',
    isSecret: true
  },
  {
    id: 'happy_jump_achievement',
    title: 'Joy Bringer',
    description: 'Make your cat so happy they jump with excitement',
    type: 'special_action', 
    target: {
      actionType: 'happy_jump',
      count: 1
    },
    reward: {
      love: 15,
      treats: 5,
      message: 'Your cat is absolutely ecstatic! Pure joy in motion.'
    },
    notification: {
      title: 'Achievement Unlocked: Joy Bringer!',
      message: 'You made your cat so happy they couldn\'t contain their excitement.'
    },
    icon: 'celebration',
    color: '#4fc3f7',
    isSecret: true
  },
  {
    id: 'ear_whisperer_achievement',
    title: 'Ear Whisperer',
    description: 'Click your cat\'s ears 10 times',
    type: 'special_action',
    target: {
      actionType: 'ear_wiggle',
      count: 10
    },
    reward: {
      love: 25,
      message: 'Your cat has learned to wiggle their ears on command!'
    },
    notification: {
      title: 'Achievement Unlocked: Ear Whisperer!',
      message: 'You\'ve mastered the secret language of ear wiggles.'
    },
    icon: 'hearing',
    color: '#9c27b0',
    isSecret: true
  },
  {
    id: 'cheek_masseur_achievement',
    title: 'Cheek Masseur',
    description: 'Give your cat 25 cheek pets',
    type: 'special_action',
    target: {
      actionType: 'cheek_pet',
      count: 25
    },
    reward: {
      love: 50,
      treats: 10,
      message: 'Your cat purrs so loudly the neighbors can hear it!'
    },
    notification: {
      title: 'Achievement Unlocked: Cheek Masseur!',
      message: 'You\'ve become a master of the perfect cheek scritch.'
    },
    icon: 'spa',
    color: '#66bb6a',
    isSecret: true
  },
  {
    id: 'midnight_snacker_achievement',
    title: 'Midnight Snacker',
    description: 'Play with your cat while they\'re drowsy',
    type: 'hidden_discovery',
    reward: {
      love: 20,
      message: 'Even sleepy cats need midnight zoomies!'
    },
    notification: {
      title: 'Achievement Unlocked: Midnight Snacker!',
      message: 'Who says cats sleep through the night?'
    },
    icon: 'bedtime',
    color: '#7986cb',
    isSecret: true
  },
  {
    id: 'speed_demon_achievement',
    title: 'Speed Demon',
    description: 'Get your cat extremely excited during wand play',
    type: 'hidden_discovery',
    reward: {
      love: 30,
      treats: 8,
      message: 'Your cat enters maximum overdrive mode!'
    },
    notification: {
      title: 'Achievement Unlocked: Speed Demon!',
      message: 'Your cat has transcended normal levels of excitement.'
    },
    icon: 'speed',
    color: '#ff7043',
    isSecret: true
  }
];

// Helper function to get awards by type
export function getAwardsByType(type: Award['type']): Award[] {
  return gameAwards.filter(award => award.type === type);
}

// Helper function to check if an award is unlocked
export function isAwardUnlocked(awardId: string, earnedAwards: string[]): boolean {
  return earnedAwards.includes(awardId);
}

// Get all awards that should be displayed (unlocked + next locked placeholder if any)
export function getDisplayableAwards(): Award[] {
  return gameAwards; // For now return all - UI will handle hiding/showing
}