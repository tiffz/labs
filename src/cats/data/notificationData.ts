interface NotificationTrigger {
  type: 'love_threshold' | 'treats_threshold' | 'job_acquired' | 'job_promoted' | 'upgrade_bought' | 'skill_trained' | 'merit_manual' | 'thing_purchased';
  value?: number;
  jobId?: string;
  skillId?: string;
  meritId?: string;
  thingId?: string;
}

export interface GameNotification {
  id: string;
  title: string;
  message: string;
  trigger: NotificationTrigger;
  reward?: {
    love?: number;
    treats?: number;
  };
  // Note: addsGoal and newGoalMessage removed - replaced by merit system
  hasBeenTriggered: boolean;
  type?: 'merit' | 'general'; // Add type to distinguish notification types
}

export const gameNotifications: GameNotification[] = [
  // All merit notifications are now handled automatically by the merit system
  // This array is kept for future non-merit notifications if needed
]; 