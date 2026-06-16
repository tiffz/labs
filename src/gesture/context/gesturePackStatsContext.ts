import { createContext } from 'react';
import type { GesturePackStats } from '../hooks/useGesturePackStatsTypes';

export const gesturePackStatsContext = createContext<GesturePackStats | null>(null);
