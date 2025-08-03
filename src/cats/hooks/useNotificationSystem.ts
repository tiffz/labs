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
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.hasBeenTriggered) {
        setNotificationQueue(queue => [...queue, notification]);
        return prev.map(n => n.id === notificationId ? { ...n, hasBeenTriggered: true } : n);
      }
      return prev;
    });
  }, []);

  const triggerManualNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification) {
        // For manual notifications (like merits), we always trigger them
        setNotificationQueue(queue => [...queue, notification]);
        // Don't mark merit notifications as "hasBeenTriggered" since they can be re-displayed
      }
      return prev; // Don't modify notifications for manual triggers
    });
  }, []);

  // Process new achievements and level ups for notifications
  useEffect(() => {
    // Achievement-based notifications are now handled by the achievement system
    // This effect can be extended for other types of notifications as needed
    
    // Check for job acquisitions
    Object.keys(gameState.unlockedJobs).forEach(jobId => {
      notifications.forEach(notification => {
        if (notification.trigger.type === 'job_acquired' && 
            notification.trigger.jobId === jobId) {
          triggerNotification(notification.id);
        }
      });
    });
    
    // Check for job promotions
    Object.entries(gameState.jobLevels).forEach(([jobId, level]) => {
      notifications.forEach(notification => {
        if (notification.trigger.type === 'job_promoted' && 
            notification.trigger.jobId === jobId &&
            notification.trigger.value === level) {
          triggerNotification(notification.id);
        }
      });
    });
    
  }, [gameState.unlockedJobs, gameState.jobLevels, gameState.thingQuantities, gameState.love, gameState.treats, triggerNotification, notifications]);

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