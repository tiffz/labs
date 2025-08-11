// NOTE: The minimal EventsPanel introduced earlier was redundant with this full implementation.
// Keeping only the full panel below.
import React, { useEffect, useRef } from 'react';
import MaterialIcon from '../../icons/MaterialIcon';

export interface GameEvent {
  id: string;
  timestamp: number;
  type: 'interaction' | 'achievement' | 'system' | 'emotion';
  message: string;
  isImportant?: boolean; // For achievements and major events
}

interface EventsPanelProps {
  events: GameEvent[];
}

const EventsPanel: React.FC<EventsPanelProps> = ({ events }) => {
  const eventsTopRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new events arrive (newest at top)
  useEffect(() => {
    if (eventsTopRef.current && eventsTopRef.current.scrollIntoView) {
      eventsTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);



  return (
    <div className="events-panel">
      <div className="events-content">
        {events.length === 0 ? (
          <div className="events-empty">
            <MaterialIcon icon="pets" />
            <p>your cat awaits...</p>
          </div>
        ) : (
          <div className="events-list">
            <div ref={eventsTopRef} />
            {events.slice().reverse().map((event) => (
              <div
                key={event.id}
                className={`event-entry ${event.type} ${event.isImportant ? 'important' : ''}`}
              >
                {event.isImportant ? (
                  <div className="event-achievement">
                    <MaterialIcon icon="emoji_events" className="achievement-icon" />
                    {event.message}
                  </div>
                ) : (
                  <div className="event-text">{event.message}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPanel;