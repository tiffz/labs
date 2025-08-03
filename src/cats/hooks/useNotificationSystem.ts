import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '../game/types';
import type { GameNotification } from '../data/notificationData';
import { gameNotifications } from '../data/notificationData';

export const useNotificationSystem = (
  gameState: GameState,
) => {
  const [notifications, setNotifications] = useState<GameNotification[]>(gameNotifications);
  const [notificationQueue, setNotificationQueue] = useState<GameNotification[]>([]);
  
  // Use refs to track last checked values to prevent infinite loops from frequent love/treats updates
  const lastCheckedRef = useRef({ love: 0, treats: 0 });

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
    const currentValues = { love: gameState.love, treats: gameState.treats };
    const lastValues = lastCheckedRef.current;
    
    // Only check love/treats thresholds if they've increased significantly or on first check
    const isFirstCheck = lastValues.love === 0 && lastValues.treats === 0;
    const shouldCheckThresholds = 
      isFirstCheck ||
      currentValues.love > lastValues.love + 5 || // Check every 5 love increase
      currentValues.treats > lastValues.treats + 2; // Check every 2 treats increase
    
    const checkTriggers = () => {
      notifications.forEach(notification => {
        if (notification.hasBeenTriggered) return;

        let isTriggered = false;
        const { trigger } = notification;

        switch (trigger.type) {
          case 'love_threshold':
            // Only check threshold triggers if we should check thresholds
            if (shouldCheckThresholds && trigger.value && gameState.love >= trigger.value) {
              isTriggered = true;
            }
            break;
          case 'treats_threshold':
            // Only check threshold triggers if we should check thresholds
            if (shouldCheckThresholds && trigger.value && gameState.treats >= trigger.value) {
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
      
      // Update last checked values if we checked thresholds
      if (shouldCheckThresholds) {
        lastCheckedRef.current = currentValues;
      }
    };

    checkTriggers();
  }, [gameState.unlockedJobs, gameState.jobLevels, gameState.thingQuantities, gameState.love, gameState.treats, notifications, triggerNotification]);

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