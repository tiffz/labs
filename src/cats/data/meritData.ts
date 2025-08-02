export interface Merit {
  id: string;
  title: string;
  description: string;
  type: 'love_milestone' | 'treats_milestone' | 'job_achievement' | 'purchase_achievement' | 'promotion_milestone';
  target?: {
    jobId?: string;
    thingId?: string;
    currencyType?: 'love' | 'treats';
    amount?: number;
    jobLevel?: number;
  };
  reward?: {
    love?: number;
    treats?: number;
    message?: string;
  };
  notification?: {
    title?: string; // Optional - defaults to merit title
    message?: string; // Optional - defaults to reward message or description
  };
  icon: string; // Material icon name
  color: string; // Hex color for the achievement banner
}

export const gameMerits: Merit[] = [
  // Love Milestones
  {
    id: 'love_10',
    title: 'First Bond',
    description: 'Reach 10 love',
    type: 'love_milestone',
    target: {
      currencyType: 'love',
      amount: 10
    },
    reward: {
      message: 'Your cat looks up with hopeful eyes and a soft tummy rumble. Time for treats?'
    },
    icon: 'favorite',
    color: '#e8a1c4'
  },
  {
    id: 'love_100',
    title: 'Close Companions',
    description: 'Reach 100 love',
    type: 'love_milestone',
    target: {
      currencyType: 'love',
      amount: 100
    },
    reward: {
      treats: 25,
      message: 'Your cat trusts you completely.'
    },
    icon: 'favorite',
    color: '#e8a1c4'
  },
  {
    id: 'love_1000',
    title: 'Devoted Friends',
    description: 'Reach 1,000 love',
    type: 'love_milestone',
    target: {
      currencyType: 'love',
      amount: 1000
    },
    reward: {
      treats: 100,
      message: 'Your cat follows you everywhere.'
    },
    icon: 'favorite',
    color: '#e8a1c4'
  },
  {
    id: 'love_10000',
    title: 'Eternal Bond',
    description: 'Reach 10,000 love',
    type: 'love_milestone',
    target: {
      currencyType: 'love',
      amount: 10000
    },
    reward: {
      treats: 500,
      love: 1000,
      message: 'Your cat will never leave your side.'
    },
    icon: 'favorite',
    color: '#e8a1c4'
  },

  // Treats Milestones
  {
    id: 'treats_10',
    title: 'First Treats',
    description: 'Reach 10 treats',
    type: 'treats_milestone',
    target: {
      currencyType: 'treats',
      amount: 10
    },
    reward: {
      love: 5,
      message: 'Finally earning treats! Your cat will be so happy.'
    },
    icon: 'restaurant',
    color: '#f2b366'
  },
  {
    id: 'treats_100',
    title: 'Treat Hoarder',
    description: '',
    type: 'treats_milestone',
    target: {
      currencyType: 'treats',
      amount: 100
    },
    reward: {
      love: 25,
      message: 'Your cat notices the treats and sits by the spot their bowl should be. Tail twitching.'
    },
    icon: 'restaurant',
    color: '#f2b366'
  },
  {
    id: 'treats_1000',
    title: 'Treat Empire',
    description: 'Build up 1,000 treats.',
    type: 'treats_milestone',
    target: {
      currencyType: 'treats',
      amount: 1000
    },
    reward: {
      love: 100,
      message: 'Your cat has become the neighborhood treat mogul!'
    },
    icon: 'restaurant',
    color: '#f2b366'
  },
  {
    id: 'treats_10000',
    title: 'Treat Tycoon',
    description: 'Amass 10,000 treats.',
    type: 'treats_milestone',
    target: {
      currencyType: 'treats',
      amount: 10000
    },
    reward: {
      love: 500,
      message: 'Your cat owns the entire treat supply chain.'
    },
    icon: 'restaurant',
    color: '#f2b366'
  },

  // Job Achievements
  {
    id: 'first_job',
    title: 'Learning Experience',
    description: 'Get your first job',
    type: 'job_achievement',
    target: {
      jobId: 'box_factory'
    },
    reward: {
      love: 15,
      message: 'Awkward! Your unpaid internship gives zero treats. Your cat appreciates the effort though.'
    },
    icon: 'work',
    color: '#7db8e8'
  },
  {
    id: 'first_promotion',
    title: 'Moving Up',
    description: 'Get your first promotion to a paying position.',
    type: 'promotion_milestone',
    target: {
      jobLevel: 2
    },
    reward: {
      treats: 50,
      message: 'First paycheck! Your cat purrs approvingly at your success.'
    },
    icon: 'work',
    color: '#7db8e8'
  },
  {
    id: 'job_level_5',
    title: 'Career Professional',
    description: 'Reach level 5 in any job.',
    type: 'promotion_milestone',
    target: {
      jobLevel: 5
    },
    reward: {
      treats: 150,
      love: 50,
      message: 'You\'re becoming quite the professional! Your cat is proud.'
    },
    icon: 'work',
    color: '#7db8e8'
  },
  {
    id: 'job_level_10',
    title: 'Senior Executive',
    description: 'Reach level 10 in any job.',
    type: 'promotion_milestone',
    target: {
      jobLevel: 10
    },
    reward: {
      treats: 500,
      love: 200,
      message: 'Executive level achieved! Your cat demands a corner office.'
    },
    icon: 'work',
    color: '#7db8e8'
  },

  // Purchase Achievements
  {
    id: 'first_food_bowl',
    title: 'Proper Dining',
    description: 'Buy your first food bowl',
    type: 'purchase_achievement',
    target: {
      thingId: 'ceramic_bowl'
    },
    reward: {
      love: 20,
      message: 'Yay! Your cat is no longer eating off the floor.'
    },
    icon: 'shopping_cart',
    color: '#98d9a3'
  },
  {
    id: 'first_toy',
    title: 'Playtime Begins',
    description: 'Buy your cat their first toy.',
    type: 'purchase_achievement',
    target: {
      thingId: 'feather_wand'
    },
    reward: {
      love: 15,
      message: 'Your cat bats at their new toy with excitement!'
    },
    icon: 'shopping_cart',
    color: '#98d9a3'
  },
  {
    id: 'fancy_bowl',
    title: 'Fine Dining',
    description: 'Upgrade to a premium food bowl.',
    type: 'purchase_achievement',
    target: {
      thingId: 'premium_bowl'
    },
    reward: {
      love: 35,
      treats: 25,
      message: 'Your cat feels like royalty with their fancy new bowl!'
    },
    icon: 'shopping_cart',
    color: '#98d9a3'
  }
];