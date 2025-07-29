import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '../game/types';
import type { GameNotification } from '../data/notificationData';
import { gameNotifications } from '../data/notificationData';

export const useNotificationSystem = (
  gameState: GameState,
  addGoal: (goalId: string) => void,
) => {
  const [notifications, setNotifications] = useState<GameNotification[]>(gameNotifications);
  const [notificationQueue, setNotificationQueue] = useState<GameNotification[]>([]);

  const triggerNotification = useCallback((notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.hasBeenTriggered) {
      setNotificationQueue(prev => [...prev, notification]);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, hasBeenTriggered: true } : n));
      
      if (notification.addsGoal) {
        addGoal(notification.addsGoal);
      }
    }
  }, [notifications, addGoal]);

  useEffect(() => {
    const checkTriggers = () => {
      notifications.forEach(notification => {
        if (notification.hasBeenTriggered) return;

        let isTriggered = false;
        const { trigger } = notification;

        switch (trigger.type) {
          case 'love_threshold':
            if (trigger.value && gameState.love >= trigger.value) {
              isTriggered = true;
            }
            break;
          case 'treats_threshold':
            if (trigger.value && gameState.treats >= trigger.value) {
              isTriggered = true;
            }
            break;
          case 'job_acquired':
            if (trigger.jobId && gameState.unlockedJobs.includes(trigger.jobId)) {
              isTriggered = true;
            }
            break;
          case 'job_promoted':
            if (trigger.jobId && (gameState.jobLevels[trigger.jobId] || 0) > 0) {
              isTriggered = true;
            }
            break;
          case 'upgrade_bought':
            if (trigger.upgradeId && (gameState.upgradeLevels[trigger.upgradeId] || 0) > 0) {
              isTriggered = true;
            }
            break;
          case 'playing_upgrade_bought':
            if (trigger.upgradeId && (gameState.playingUpgradeLevels[trigger.upgradeId] || 0) > 0) {
              isTriggered = true;
            }
            break;
          case 'goal_completed':
            if (trigger.goalId && gameState.completedGoals.includes(trigger.goalId)) {
              isTriggered = true;
            }
            break;
          default:
            break;
        }

        if (isTriggered) {
          triggerNotification(notification.id);
        }
      });
    };

    checkTriggers();
  }, [gameState, notifications, triggerNotification]);

  return { notificationQueue, setNotificationQueue };
}; 