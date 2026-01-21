// Re-export rhythm parser from shared
export { parseRhythm, parseNotation, detectIdenticalMeasures } from '../../shared/rhythm/rhythmParser';

// Also re-export the type for convenience
export type {
  ParsedRhythm,
  RepeatMarker,
  SectionRepeat,
  MeasureRepeat,
} from '../../shared/rhythm/types';
