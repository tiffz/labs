import React, { useState, useEffect, useMemo } from 'react';
import type { GameNotification } from '../../data/notificationData';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';

interface Notification {
  id: string;
  notification: GameNotification;
  timestamp: number;
}

interface NotificationQueueProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{
  notification: Notification;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  const { notification: gameNotification } = notification;

  return (
    <div className="toast-content">
      <div className="toast-icon">{gameNotification.type === 'merit' ? '🏆' : '🎉'}</div>
      <div className="toast-text">
        <div className="toast-title">{gameNotification.title}</div>
        <div className="toast-goal">{gameNotification.message}</div>

      </div>
      {(() => {
        const reward = gameNotification.reward;
        if (reward && (reward.treats || reward.love)) {
          return (
            <div className="toast-rewards">
              {reward.treats && (
                <span className="toast-reward-item">
                  +{reward.treats} <FishIcon className="toast-reward-icon" />
                </span>
              )}
              {reward.love && (
                <span className="toast-reward-item">
                  +{reward.love} <HeartIcon className="toast-reward-icon" />
                </span>
              )}
            </div>
          );
        }
        return null;
      })()}
      <button className="toast-claim-btn" onClick={onDismiss}>
        Got it
      </button>
    </div>
  );
};

const NotificationQueue: React.FC<NotificationQueueProps> = ({ 
  notifications, 
  onDismiss 
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach((notification) => {
      if (!visibleNotifications.includes(notification.id)) {
        // Make visible after small delay
        const showTimer = setTimeout(() => {
          setVisibleNotifications(prev => [...prev, notification.id]);
        }, 50);
        timers.push(showTimer);

        // Auto-dismiss after 5 seconds
        const dismissTimer = setTimeout(() => {
          onDismiss(notification.id);
        }, 5050);
        timers.push(dismissTimer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, onDismiss, visibleNotifications]);

  // Memoize current notification IDs to prevent infinite re-renders
  const currentIds = useMemo(() => notifications.map(n => n.id), [notifications]);

  // Clean up visibility state when notifications are removed
  useEffect(() => {
    setVisibleNotifications(prev => 
      prev.filter(id => currentIds.includes(id))
    );
  }, [currentIds]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-queue">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast-notification ${
            visibleNotifications.includes(notification.id) ? 'visible' : ''
          }`}
        >
          <ToastItem
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationQueue;
export type { Notification }; 