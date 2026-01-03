/**
 * Playback System - Public API
 * 
 * This module provides a robust, modular playback system with:
 * - Sample-accurate timing using Web Audio API
 * - Multi-track support for layered instruments
 * - Live editing capabilities
 * - Pluggable instrument architecture
 */

// Main engine
export { 
  PlaybackEngine, 
  getPlaybackEngine, 
  disposePlaybackEngine,
  type PlaybackUpdateCallback 
} from './playbackEngine';

// Transport
export { Transport } from './transport';

// Track
export { Track } from './track';

// Instruments
export { 
  type Instrument, 
  type PlayNoteParams, 
  BaseInstrument,
  PianoSynthesizer,
  SimpleSynthesizer,
  type WaveformType 
} from './instruments';

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
