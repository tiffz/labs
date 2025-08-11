import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameEvent } from '../components/panels/EventsPanel';

interface EventsSystemConfig {
  maxEvents?: number;
}

const EVENT_MESSAGES = {
  // Interaction messages - short and dense
  petting: [
    "you pet the cat",
    "the cat purrs",
    "gentle strokes",
    "soft fur",
    "contentment"
  ],
  noseClick: [
    "you boop the nose",
    "nose touched",
    "whiskers twitch"
  ],
  earClick: [
    "ear flicks",
    "you scratch behind an ear",
    "head tilts"
  ],
  cheekPet: [
    "the cat rubs against you",
    "cheek pets",
    "purring intensifies"
  ],
  pouncing: [
    "eyes focused",
    "the hunt begins",
    "a graceful leap",
    "instincts take over",
    "spring, swat, settle"
  ],
  playing: [
    "batting at the toy",
    "playtime energy",
    "focused attention",
    "wild side emerges"
  ],
  resting: [
    "settling down",
    "peaceful rest",
    "finding comfort",
    "contentment"
  ],
  exploring: [
    "wandering around",
    "curious investigation",
    "quiet exploration",
    "new discoveries"
  ],
  happy: [
    "joy spreads",
    "bouncing with delight",
    "infectious happiness",
    "pure joy"
  ],
  sleepy: [
    "eyelids grow heavy",
    "approaching naptime",
    "seeking a cozy spot",
    "peaceful rest calls"
  ]
};

export const useEventsSystem = ({ 
  maxEvents = 100
}: EventsSystemConfig = {}) => {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const eventIdCounter = useRef(0);

  const addEvent = useCallback((
    type: GameEvent['type'],
    message: string,
    isImportant: boolean = false
  ) => {
    const newEvent: GameEvent = {
      id: `event-${eventIdCounter.current++}`,
      timestamp: Date.now(),
      type,
      message,
      isImportant
    };

    setEvents(prev => {
      const updated = [...prev, newEvent];
      // Limit to maxEvents, keeping the most recent
      return updated.length > maxEvents ? updated.slice(-maxEvents) : updated;
    });
  }, [maxEvents]);

  const addInteractionEvent = useCallback((interaction: keyof typeof EVENT_MESSAGES) => {
    const messages = EVENT_MESSAGES[interaction];
    if (messages && messages.length > 0) {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      addEvent('interaction', randomMessage);
    }
  }, [addEvent]);

  // Distinct successful pounce message (varied, short)
  const logSuccessfulPounce = useCallback(() => {
    const options = [
      'soft thump',
      'toy caught',
      'quiet landing',
      'swift and sure'
    ];
    const msg = options[Math.floor(Math.random() * options.length)];
    addEvent('interaction', msg);
  }, [addEvent]);

  const addSystemEvent = useCallback((message: string) => {
    addEvent('system', message);
  }, [addEvent]);

  const addEmotionEvent = useCallback((message: string) => {
    addEvent('emotion', message);
  }, [addEvent]);

  const addAchievementEvent = useCallback((achievementName: string, description?: string) => {
    const message = description 
      ? `${achievementName}: ${description}`
      : `${achievementName}`;
    addEvent('achievement', message, true);
  }, [addEvent]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getRecentEvents = useCallback((count: number) => {
    return events.slice(-count);
  }, [events]);

  // Throttling for preventing duplicate events
  const lastEventTimeRef = useRef<{ [key: string]: number }>({});
  const EVENT_THROTTLE_MS = 500; // Prevent duplicate events within 500ms

  // Listen for pounce-complete signal and log an interaction event
  useEffect(() => {
    const onPounceComplete = () => logSuccessfulPounce();
    document.addEventListener('cat-pounce-complete', onPounceComplete);
    return () => document.removeEventListener('cat-pounce-complete', onPounceComplete);
  }, [logSuccessfulPounce]);

  // Utility functions for common game interactions
  const logPetting = useCallback(() => {
    const now = Date.now();
    const lastTime = lastEventTimeRef.current['petting'] || 0;
    if (now - lastTime > EVENT_THROTTLE_MS) {
      lastEventTimeRef.current['petting'] = now;
      addInteractionEvent('petting');
    }
  }, [addInteractionEvent]);
  const logPouncing = useCallback(() => addInteractionEvent('pouncing'), [addInteractionEvent]);
  const logPlaying = useCallback(() => addInteractionEvent('playing'), [addInteractionEvent]);
  const logResting = useCallback(() => addInteractionEvent('resting'), [addInteractionEvent]);
  const logExploring = useCallback(() => addInteractionEvent('exploring'), [addInteractionEvent]);
  const logHappy = useCallback(() => addInteractionEvent('happy'), [addInteractionEvent]);
  const logSleepy = useCallback(() => addInteractionEvent('sleepy'), [addInteractionEvent]);
  const logNoseClick = useCallback(() => addInteractionEvent('noseClick'), [addInteractionEvent]);
  const logEarClick = useCallback(() => addInteractionEvent('earClick'), [addInteractionEvent]);
  const logCheekPet = useCallback(() => addInteractionEvent('cheekPet'), [addInteractionEvent]);

  return {
    // State
    events,
    eventCount: events.length,
    
    // Actions
    addEvent,
    addInteractionEvent,
    addSystemEvent,
    addEmotionEvent,
    addAchievementEvent,
    clearEvents,
    getRecentEvents,
    
    // Quick interaction loggers
    logPetting,
    logPouncing,
    logPlaying,
    logResting,
    logExploring,
    logHappy,
    logSleepy,
    logNoseClick,
    logEarClick,
    logCheekPet,
    logSuccessfulPounce,
  };
};