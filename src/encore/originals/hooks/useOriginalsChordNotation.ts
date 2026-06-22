import { useCallback, useEffect, useState } from 'react';
import type { ChordNotationMode } from '../../../shared/music/chordSymbolDisplay';

export function originalsChordNotationStorageKey(songId: string): string {
  return `encore-originals-chord-notation:${songId}`;
}

export function readOriginalsChordNotation(songId: string): ChordNotationMode {
  try {
    const raw = sessionStorage.getItem(originalsChordNotationStorageKey(songId));
    if (raw === 'roman' || raw === 'letters') return raw;
  } catch {
    /* ignore */
  }
  return 'letters';
}

export function useOriginalsChordNotation(songId: string): {
  notation: ChordNotationMode;
  setNotation: (notation: ChordNotationMode) => void;
} {
  const [notation, setNotationState] = useState<ChordNotationMode>(() => readOriginalsChordNotation(songId));

  useEffect(() => {
    setNotationState(readOriginalsChordNotation(songId));
  }, [songId]);

  const setNotation = useCallback(
    (next: ChordNotationMode) => {
      setNotationState(next);
      try {
        sessionStorage.setItem(originalsChordNotationStorageKey(songId), next);
      } catch {
        /* ignore */
      }
    },
    [songId],
  );

  return { notation, setNotation };
}
