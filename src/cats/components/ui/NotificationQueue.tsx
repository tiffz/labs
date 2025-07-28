import React, { useState, useEffect } from 'react';
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
      <div className="toast-icon">🎉</div>
      <div className="toast-text">
        <div className="toast-title">{gameNotification.title}</div>
        <div className="toast-goal">{gameNotification.message}</div>
        {gameNotification.newGoalMessage && (
          <div className="toast-new-goal">{gameNotification.newGoalMessage}</div>
        )}
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
  }, [notifications, visibleNotifications, onDismiss]);

  // Clean up visibility state when notifications are removed
  useEffect(() => {
    const currentIds = notifications.map(n => n.id);
    setVisibleNotifications(prev => 
      prev.filter(id => currentIds.includes(id))
    );
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-queue">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`toast-notification ${
            visibleNotifications.includes(notification.id) ? 'visible' : ''
          }`}
          style={{
            transform: `translateY(${index * -120}px)`, // Increased from -80px to -120px for better readability
            zIndex: 11000 + index // Fix: newer toasts (higher index) should have higher z-index
          }}
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