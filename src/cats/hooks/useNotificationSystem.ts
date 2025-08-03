import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '../game/types';
import type { GameNotification } from '../data/notificationData';
import { gameNotifications } from '../data/notificationData';

export const useNotificationSystem = (
  gameState: GameState,
) => {
  const [notifications, setNotifications] = useState<GameNotification[]>(gameNotifications);
  const [notificationQueue, setNotificationQueue] = useState<GameNotification[]>([]);

  const triggerNotification = useCallback((notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.hasBeenTriggered) {
      setNotificationQueue(prev => [...prev, notification]);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, hasBeenTriggered: true } : n));
    }
  }, [notifications]);

  const triggerManualNotification = useCallback((notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      // For manual notifications (like merits), we always trigger them
      setNotificationQueue(prev => [...prev, notification]);
      // Don't mark merit notifications as "hasBeenTriggered" since they can be re-displayed
    }
  }, [notifications]);

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


          case 'thing_purchased':
            if (trigger.thingId && (gameState.thingQuantities[trigger.thingId] || 0) > 0) {
              isTriggered = true;
            }
            break;
          // Note: goal_completed trigger type removed - replaced by merit system
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

  const addNotificationToQueue = useCallback((notification: { title: string; message: string; type?: 'merit' | 'general' }) => {
    const gameNotification = {
      id: `manual_${Date.now()}`,
      title: notification.title,
      message: notification.message,
      trigger: { type: 'merit_manual' as const },
      hasBeenTriggered: false,
      type: notification.type || 'general'
    };
    setNotificationQueue(prev => [...prev, gameNotification]);
  }, []);

  return { notificationQueue, setNotificationQueue, triggerManualNotification, addNotificationToQueue };
}; 