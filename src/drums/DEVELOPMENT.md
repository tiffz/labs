# Darbuka Rhythm Trainer - Architecture Decision Records

This document records major architectural decisions, design patterns, and development guidelines for the Darbuka Rhythm Trainer micro-app.

## Audio System Architecture

### Dynamic Volume Based on Beat Position

**Decision**: Implement volume hierarchy where notes on strong beats play louder than weak beats.

**Rationale**: Creates natural musical emphasis that matches how Darbuka rhythms are played in practice.

**Implementation**:

- Beat 1 (strongest): Full volume
- Other beats in beat group: Reduced volume based on position
- Volume calculation considers time signature type (simple, compound, asymmetric)

**Benefits**:

- More musical and natural-sounding playback
- Helps students understand beat emphasis
- Works automatically with all time signatures

### Smart Fade-Out for Fast Notes

**Decision**: Automatically fade out notes shorter than 100ms to prevent audio clicks and pops.

**Rationale**: Very fast notes (e.g., rapid sixteenth notes) can cause audio artifacts without proper fade-out.

**Implementation**: Notes with duration < 100ms use exponential fade-out curve.

**Benefits**:

- Clean audio playback at any tempo
- No manual fade-out configuration needed
- Works seamlessly with dynamic volume system

### Web Audio API for Precise Timing

**Decision**: Use Web Audio API instead of HTML5 Audio for rhythm playback.

**Rationale**: Web Audio API provides precise timing control needed for accurate rhythm playback, especially at high BPM.

**Benefits**:

- Accurate timing even at 200+ BPM
- Better performance for rapid note sequences
- More control over audio processing

## Font Loading & FOUC Prevention

### Problem

Material Icons and Noto Music fonts loaded from Google Fonts caused Flash of Unstyled Content (FOUC) - icon text would appear as regular text before fonts loaded, creating jarring visual flash.

### Solution: Multi-Layered Font Loading Strategy

**1. Icon Fonts (Material Symbols + Noto Music)**:

- Hidden via CSS (`visibility: hidden`) until fonts load
- JavaScript font detection reveals icons once fonts are ready
- Prevents icon text from flashing as regular text

**2. Text Font (Roboto)**:

- Uses `display=optional` to only load if already cached
- Prevents layout shift on first visit
- Uses fallback font with matched metrics

**3. Layout Stability**:

- All fonts use matched metrics to prevent cumulative layout shift (CLS)
- Critical for Core Web Vitals and user experience

**Benefits**:

- No visual flashing during font load
- Stable layout without shifts
- Better Core Web Vitals scores

## Beaming System

### Problem

Beaming logic incorrectly handled different time signature denominators, causing incorrect beaming for compound and asymmetric time signatures.

### Root Cause

The `getDefaultBeatGrouping` function returns beat groupings in different units:

- **For /8 time**: Returns values in **eighth notes** (e.g., `[3, 3, 3, 3]` for 12/8)
- **For /4 time**: Returns values in **sixteenths** (e.g., `[4, 4]` for 2/4)

The beaming logic was incorrectly multiplying **both** by `notesPerBeatUnit`, causing double conversion for /8 time signatures.

### Solution

Fixed beaming logic to correctly handle unit conversion:

- For /8 time signatures: Beat groupings are already in eighth notes, convert to sixteenths by multiplying by 2
- For /4 time signatures: Beat groupings are already in sixteenths, use directly

### Beaming Rules

**Simple Time Signatures (4/4, 2/4, 3/4)**:

- Eighth and sixteenth notes beamed within beats
- Beams break at beat boundaries

**Compound Time Signatures (6/8, 9/8, 12/8)**:

- Notes beamed within beat groups (typically groups of 3 eighth notes)
- Beams break at beat group boundaries

**Asymmetric Time Signatures (5/8, 7/8, 11/8)**:

- Notes beamed according to custom beat groupings
- Supports custom groupings like `[2, 3]` or `[3, 2, 2]`

## URL Sharing Feature

### Decision

Implement URL-based state sharing so users can share rhythms with students or save favorites.

### Implementation

- Rhythm, BPM, and time signature encoded in URL parameters
- URL updates automatically as user changes rhythm
- Browser navigation (back/forward) works correctly
- URL optimization removes default values to keep URLs clean

### Benefits

- Easy sharing with students
- Bookmarkable favorites
- Collaboration support
- Social media sharing

See `src/drums/docs/URL_SHARING.md` for detailed implementation guide.
