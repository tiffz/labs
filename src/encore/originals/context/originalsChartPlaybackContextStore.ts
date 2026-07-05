import { createContext } from 'react';
import type { UseChartChordPlaybackResult } from '../../../shared/hooks/useChartChordPlayback';

export const OriginalsChartPlaybackContext = createContext<UseChartChordPlaybackResult | null>(null);
