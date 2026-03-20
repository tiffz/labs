/**
 * Playback System - Public API
 * 
 * This module provides a robust, modular playback system with:
 * - Sample-accurate timing using Web Audio API
 * - Multi-track support for layered instruments
 * - Live editing capabilities
 * - Pluggable instrument architecture
 * - Sampled piano with real piano sounds
 */

// Main engine
export { 
  PlaybackEngine, 
  getPlaybackEngine, 
  disposePlaybackEngine,
  type PlaybackUpdateCallback,
  type SampleLoadingCallback,
} from './playbackEngine';

// Transport
export { Transport } from '../../../shared/playback/transport';

// Track
export { Track } from '../../../shared/playback/track';

// Instruments
export { 
  type Instrument, 
  type PlayNoteParams, 
  BaseInstrument,
  PianoSynthesizer,
  SimpleSynthesizer,
  SampledPiano,
  type WaveformType,
  type SampleLoadingState,
} from '../../../shared/playback/instruments';

// Types
export type { 
  NoteEvent, 
  NoteParams, 
  ScheduledNote, 
  ActiveNotes,
  PlaybackConfig,
  PendingChanges,
  PlaybackStateCallback 
} from './types';
