# Darbuka Rhythm Trainer - Architecture Decision Records

This document records major architectural decisions for the Darbuka Rhythm Trainer micro-app.

## Audio System Architecture

### Dynamic Volume Based on Beat Position

**Decision**: Implement volume hierarchy where notes on strong beats play louder than weak beats.

**Rationale**: Creates natural musical emphasis matching how Darbuka rhythms are played in practice.

**Implementation**: Beat 1 (strongest) uses full volume; other beats reduced based on position. Volume calculation considers time signature type.

**Benefits**: More musical playback, helps students understand beat emphasis, works automatically with all time signatures.

### Web Audio API for Precise Timing

**Decision**: Use Web Audio API instead of HTML5 Audio for rhythm playback.

**Rationale**: Provides precise timing control needed for accurate rhythm playback, especially at high BPM.

**Benefits**: Accurate timing even at 200+ BPM, better performance for rapid note sequences.

### Reverb Effect Implementation

**Decision**: Add reverb effect using Web Audio API ConvolverNode with adjustable strength.

**Rationale**: Adds spatial depth and realism to drum sounds.

**Implementation**: Loads impulse response from `domestic-living-room.mp4` (OpenAir Library) with fallback to generated IR. Dry/wet gain nodes for adjustable strength (default 20%).

**Benefits**: More realistic playback, adjustable intensity, graceful fallback.

## Font Loading & FOUC Prevention

### Decision

Implement multi-layered font loading strategy to prevent Flash of Unstyled Content.

### Rationale

Material Icons and Noto Music fonts caused icon text to flash as regular text before fonts loaded.

### Implementation

- Icon fonts hidden via CSS until fonts load, then revealed via JavaScript
- Text font uses `display=optional` to prevent layout shift
- All fonts use matched metrics to prevent cumulative layout shift

### Benefits

- No visual flashing during font load
- Stable layout without shifts
- Better Core Web Vitals scores

## Beaming System

### Decision

Fix beaming logic to correctly handle different time signature denominators.

### Rationale

Beaming logic incorrectly handled `/8` vs `/4` time signatures, causing incorrect beaming for compound and asymmetric time signatures.

### Implementation

- `/8` time: Beat groupings in eighth notes, convert to sixteenths by multiplying by 2
- `/4` time: Beat groupings already in sixteenths, use directly

### Benefits

- Correct beaming for all time signature types
- Supports simple, compound, and asymmetric time signatures

## URL Sharing Feature

### Decision

Implement URL-based state sharing for rhythms, BPM, and time signature.

### Rationale

Enables easy sharing with students, bookmarkable favorites, and collaboration.

### Implementation

- Rhythm, BPM, and time signature encoded in URL parameters
- URL updates automatically as user changes rhythm
- Browser navigation (back/forward) works correctly
- URL optimization removes default values

### Benefits

- Easy sharing with students
- Bookmarkable favorites
- Collaboration support

## Custom Hooks Architecture

### Decision

Extract complex stateful logic into custom hooks (`useNotationHistory`, `usePlayback`).

### Rationale

`App.tsx` was becoming too large (~600 lines), mixing multiple concerns (notation, history, playback, URL syncing).

### Implementation

- `useNotationHistory`: Manages notation state, history stack, undo/redo
- `usePlayback`: Manages playback state and rhythmPlayer interactions

### Benefits

- Reduced `App.tsx` complexity (~300 lines)
- Better separation of concerns
- Easier to test hooks independently
- Reusable logic

## Notation System Architecture

### Decision

Use text-based notation system with utility functions for time signature calculations.

### Rationale

Eliminates duplicate calculations across codebase and provides single source of truth for time signature logic.

### Implementation

- Text notation: `D`=Dum, `T`=Tak, `K`=Ka, `S`=Slap, `_`=rest, `-`=duration
- `timeSignatureUtils.ts`: `getSixteenthsPerMeasure()`, `getBeatGroupingInSixteenths()`
- `notationUtils.ts`: `calculateRemainingBeats()`

### Benefits

- Single source of truth for time signature logic
- Eliminates duplicate calculations
- Consistent behavior across all components
