/** Minimal chord event shape for section detection (harmonic boundary hints). */
export interface SectionDetectionChordEvent {
  time: number;
  chord: string;
  strength: number;
}

export interface SectionDetectionKeyChange {
  time: number;
  key: string;
  scale: string;
  confidence: number;
}
