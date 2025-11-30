# Drums App Data Configuration

This directory contains all the data configurations for the Darbuka Rhythm Trainer app, separated from the application logic for easier editing and maintenance.

## Files

### `rhythmDatabase.ts`

**Purpose**: Single source of truth for all rhythm definitions.

**Used by**:

- Rhythm recognition system (to identify patterns and provide educational information)
- `RhythmPresets` component (directly uses `RHYTHM_DATABASE` to populate the "Load Rhythm" dropdown)
- `RhythmInfoCard` component (displays rhythm information and variations)

**Contains**:

- `RHYTHM_DATABASE`: Object with rhythm definitions including:
  - Maqsum (4/4)
  - Ayoub (2/4)
  - Saeidi (4/4)
  - Baladi (4/4)

Each rhythm includes:

- Name and description
- Educational links ("Learn more" resources)
- Base pattern notation
- Time signature
- Array of variations with optional notes

### `commonPatterns.ts`

**Purpose**: Frequently used rhythm patterns that appear in the note palette for quick insertion.

**Used by**: `NotePalette` component

**Contains**:

- `COMMON_PATTERNS`: Simple array of pattern strings like:
  - `DKTK`, `TKTK` (sixteenth note combinations)
  - `D-K-`, `T-K-` (eighth note combinations)
  - `D-TK`, `T-TK` (mixed patterns)
  - `__D-`, `__K-`, `__T-` (rest patterns)

## Editing Guidelines

### Adding a New Rhythm

1. Open `rhythmDatabase.ts`
2. Add a new entry to `RHYTHM_DATABASE` with:
   - Unique key (lowercase, no spaces)
   - Name, description
   - Educational links
   - Base pattern notation
   - Time signature
   - Array of variations
3. The rhythm will automatically appear in:
   - The "Load Rhythm" dropdown (with time signature displayed)
   - The rhythm recognition system
   - The info card when users input matching patterns

That's it! No other files need to be edited.

### Adding a New Common Pattern

1. Open `commonPatterns.ts`
2. Add a new pattern string to the `COMMON_PATTERNS` array
3. The pattern will automatically appear in the note palette

## Notation Format

All rhythms use the following notation:

- `D` = Dum (bass sound)
- `T` = Tak (high sound)
- `K` = Ka (high sound)
- `S` = Slap (accented sound)
- `_` = Rest (silence)
- `-` = Continuation of previous note

Examples:

- `D-T-` = Dum (eighth), Tak (eighth)
- `D---` = Dum (quarter note)
- `__` = Rest (eighth note)
- `DKTK` = Four sixteenth notes
