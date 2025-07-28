export interface GameNotification {
  id: string;
  title: string;
  message: string;
  trigger: {
    type: 'love_threshold' | 'treats_threshold' | 'job_acquired' | 'job_promoted' | 'upgrade_bought' | 'goal_completed';
    value?: number;
    jobId?: string;
    upgradeId?: string;
    goalId?: string;
  };
  reward?: {
    love?: number;
    treats?: number;
  };
  addsGoal?: string; // Goal ID to add when this notification triggers
  newGoalMessage?: string; // Optional message to show when adding a goal
  hasBeenTriggered: boolean;
}

export const gameNotifications: GameNotification[] = [
  {
    id: 'first_love_milestone',
    title: 'A Gentle Meow',
    message: 'Your cat looks up with hopeful eyes and a soft tummy rumble. Time for treats?',
    trigger: {
      type: 'love_threshold',
      value: 20
    },
    addsGoal: 'get_first_job',
    newGoalMessage: 'New Goal: Start earning treats',
    hasBeenTriggered: false
  },
  {
    id: 'got_first_job_unified',
    title: 'Learning Experience',
    message: 'Awkward! Your unpaid internship gives zero treats. Your cat appreciates the effort though.',
    trigger: {
      type: 'goal_completed',
      goalId: 'get_first_job'
    },
    addsGoal: 'get_paying_job',
    newGoalMessage: 'New Goal: Get a promotion',
    hasBeenTriggered: false
  },
  {
    id: 'first_promotion_unified',
    title: 'First Paycheck!',
    message: 'Finally earning treats! Your cat will be so happy.',
    trigger: {
      type: 'goal_completed',
      goalId: 'get_paying_job'
    },
    hasBeenTriggered: false
  },
  {
    id: 'first_treats_milestone',
    title: 'Mealtime Anticipation',
    message: 'Your cat notices the treats and sits hopefully by where their bowl should be. Tail twitching.',
    trigger: {
      type: 'treats_threshold',
      value: 30
    },
    addsGoal: 'buy_first_food_bowl',
    newGoalMessage: 'New Goal: Buy a food bowl',
    hasBeenTriggered: false
  },
  {
    id: 'bought_food_bowl_unified',
    title: 'Proper Dining Setup',
    message: 'Yay! Your cat is no longer eating off the floor.',
    trigger: {
      type: 'goal_completed',
      goalId: 'buy_first_food_bowl'
    },
    reward: {
      love: 15
    },
    hasBeenTriggered: false
  }
]; 