export interface Milestone {
  id: string;
  title: string;
  description: string;
  target: {
    currencyType?: 'love' | 'treats';
    amount?: number;
    jobLevel?: number;
    jobId?: string;
    thingId?: string;
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
}

export interface MilestoneGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  milestones: Milestone[];
}

// Love Milestones - Progressive love accumulation
const loveMilestones: Milestone[] = [
  {
    id: 'love_10',
    title: 'First Bond',
    description: 'Reach 10 love',
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
  {
    id: 'love_100000',
    title: 'Love Overflowing',
    description: 'Reach 100,000 love',
    target: {
      currencyType: 'love',
      amount: 100000
    },
    reward: {
      treats: 2500,
      love: 5000,
      message: 'Pure devotion radiates from your bond.'
    },
    icon: 'favorite',
    color: '#e8a1c4'
  },
  {
    id: 'love_1000000',
    title: 'Infinite Love',
    description: 'Reach 1,000,000 love',
    target: {
      currencyType: 'love',
      amount: 1000000
    },
    reward: {
      treats: 10000,
      love: 25000,
      message: 'Your love transcends the physical realm.'
    },
    icon: 'favorite',
    color: '#e8a1c4'
  }
];

// Treats Milestones - Progressive treat accumulation
const treatsMilestones: Milestone[] = [
  {
    id: 'treats_10',
    title: 'First Treats',
    description: 'Reach 10 treats',
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
    description: 'Reach 100 treats',
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
    description: 'Build up 1,000 treats',
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
    description: 'Amass 10,000 treats',
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
  {
    id: 'treats_100000',
    title: 'Treat Fortune',
    description: 'Accumulate 100,000 treats',
    target: {
      currencyType: 'treats',
      amount: 100000
    },
    reward: {
      love: 2500,
      message: 'Your cat could start their own treat corporation.'
    },
    icon: 'restaurant',
    color: '#f2b366'
  },
  {
    id: 'treats_1000000',
    title: 'Treat Millionaire',
    description: 'Reach 1,000,000 treats',
    target: {
      currencyType: 'treats',
      amount: 1000000
    },
    reward: {
      love: 12500,
      message: 'Your cat controls the global treat economy.'
    },
    icon: 'restaurant',
    color: '#f2b366'
  }
];

// Career Milestones - Progressive job advancement
const careerMilestones: Milestone[] = [
  {
    id: 'first_job',
    title: 'Learning Experience',
    description: 'Get your first job',
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
    description: 'Get your first promotion to a paying position',
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
    description: 'Reach level 5 in any job',
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
    description: 'Reach level 10 in any job',
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
  {
    id: 'job_level_15',
    title: 'Corporate Leader',
    description: 'Reach level 15 in any job',
    target: {
      jobLevel: 15
    },
    reward: {
      treats: 1000,
      love: 500,
      message: 'Your cat expects a company car and premium health benefits.'
    },
    icon: 'work',
    color: '#7db8e8'
  },
  {
    id: 'job_level_20',
    title: 'Industry Titan',
    description: 'Reach level 20 in any job',
    target: {
      jobLevel: 20
    },
    reward: {
      treats: 2500,
      love: 1000,
      message: 'Your cat now has their own Wikipedia page.'
    },
    icon: 'work',
    color: '#7db8e8'
  }
];

// Shopping Milestones - Progressive purchase achievements
const shoppingMilestones: Milestone[] = [
  {
    id: 'first_food_bowl',
    title: 'Proper Dining',
    description: 'Buy your first food bowl',
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
    description: 'Buy your cat their first toy',
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
    description: 'Upgrade to a premium food bowl',
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

export const milestoneGroups: MilestoneGroup[] = [
  {
    id: 'love_milestones',
    name: 'Love Milestones',
    description: 'Progressive achievements for accumulating love',
    icon: 'favorite',
    color: '#e8a1c4',
    milestones: loveMilestones
  },
  {
    id: 'treats_milestones',
    name: 'Treats Milestones', 
    description: 'Progressive achievements for accumulating treats',
    icon: 'restaurant',
    color: '#f2b366',
    milestones: treatsMilestones
  },
  {
    id: 'career_milestones',
    name: 'Career Milestones',
    description: 'Progressive achievements for job advancement',
    icon: 'work',
    color: '#7db8e8',
    milestones: careerMilestones
  },
  {
    id: 'shopping_milestones',
    name: 'Shopping Milestones',
    description: 'Progressive achievements for purchasing items',
    icon: 'shopping_cart',
    color: '#98d9a3',
    milestones: shoppingMilestones
  }
];

// Get all milestones flattened for compatibility with existing merit system
export const allMilestones: Milestone[] = milestoneGroups.flatMap(group => group.milestones);