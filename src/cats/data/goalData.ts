export interface Goal {
  id: string;
  title: string;
  description: string;
  type: 'get_job' | 'get_paying_job' | 'buy_thing' | 'reach_currency';
  target?: {
    jobId?: string;
    thingId?: string;
    currencyType?: 'love' | 'treats';
    amount?: number;
  };
  reward?: {
    love?: number;
    treats?: number;
    message?: string;
  };
  isCompleted: boolean;
}

export const gameGoals: Goal[] = [
  {
    id: 'get_first_job',
    title: 'Start earning treats',
    description: 'Your cat needs treats! Find work to provide for them.',
    type: 'get_job',
    target: {
      jobId: 'box_factory'
    },
    reward: {
      love: 10,
      message: 'Your determination to help your cat is admirable! +10 love for trying.'
    },
    isCompleted: false
  },
  {
    id: 'get_paying_job',
    title: 'Get a promotion',
    description: 'Save up love to get your first paying position!',
    type: 'get_paying_job',
    reward: {
      treats: 25,
      message: 'Signing bonus! Your cat purrs approvingly.'
    },
    isCompleted: false
  },
  {
    id: 'buy_first_food_bowl',
    title: 'Buy a food bowl',
    description: 'Get your cat a proper food bowl to enjoy those treats.',
    type: 'buy_thing',
    target: {
      thingId: 'ceramic_bowl'
    },
    reward: {
      love: 15,
      message: 'Your cat purrs with joy at their new feeding setup!'
    },
    isCompleted: false
  }
]; 