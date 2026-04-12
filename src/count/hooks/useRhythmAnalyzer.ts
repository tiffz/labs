import { useState, useCallback, useRef, useEffect } from 'react';
import { RhythmAnalyzer } from '../analysis/RhythmAnalyzer';
import type { MetronomeEngine } from '../engine/MetronomeEngine';

interface RhythmAnalyzerState {
  lastDelta: number | null;
  averageDelta: number | null;
  isListening: boolean;
  reEntryScore: number | null;
  toggleListening: () => void;
}

export function useRhythmAnalyzer(engine: MetronomeEngine | null): RhythmAnalyzerState {
  const analyzerRef = useRef<RhythmAnalyzer | null>(null);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [averageDelta, setAverageDelta] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [reEntryScore, setReEntryScore] = useState<number | null>(null);

  const getAnalyzer = useCallback(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new RhythmAnalyzer();
    }
    return analyzerRef.current;
  }, []);

  useEffect(() => {
    if (engine) {
      getAnalyzer().attachToEngine(engine);
    }
  }, [engine, getAnalyzer]);

  useEffect(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    analyzer.onDelta((delta) => {
      setLastDelta(delta);
      setAverageDelta(analyzer.getAverageDelta());
    });

    analyzer.onReEntry((delta) => {
      setReEntryScore(delta);
    });
  }, []);

  const toggleListening = useCallback(async () => {
    const analyzer = getAnalyzer();
    if (analyzer.isListening()) {
      analyzer.stopListening();
      setIsListening(false);
    } else {
      try {
        await analyzer.startMicListening();
        setIsListening(true);
      } catch {
        // getUserMedia denied or unavailable
        try {
          await analyzer.startMidiListening();
          setIsListening(true);
        } catch {
          // MIDI also unavailable
        }
      }
    }
  }, [getAnalyzer]);

  useEffect(() => {
    return () => {
      analyzerRef.current?.stopListening();
    };
  }, []);

  return { lastDelta, averageDelta, isListening, reEntryScore, toggleListening };
}
