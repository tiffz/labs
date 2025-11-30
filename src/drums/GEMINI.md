# Darbuka Rhythm Trainer

## Overview

The Darbuka Rhythm Trainer is a web application designed to help students learn and practice Darbuka drum rhythms. It provides a visual representation of rhythms using a notation system that maps to the four primary Darbuka sounds: Dum, Tak, Ka, and Slap.

## Features

- **Rhythm presets**: "Load Rhythm" button with dropdown for quick access to standard Middle Eastern rhythms
  - Maqsum (4/4): `D-T-..K-D---T---`
  - Saeidi (4/4): `D-T-..D-D---T---`
  - Baladi (4/4): `D-D-..T-D---T---`
  - Ayoub (2/4): `D--KD-T-`
  - Automatically sets the correct time signature when loading a preset
- **Text-based rhythm input**: Enter rhythms using a simple notation system (D for Dum, T for Tak, K for Ka, S for Slap, \_ for rest)
- **Duration notation**: Use dashes (-) to extend note durations
- **Professional music notation**: Rhythms are displayed using standard music notation via VexFlow
- **Single-line staff**: Clean, minimal display with one staff line for spatial reference
- **Custom SVG symbols**: Traditional-style drum symbols drawn as SVG paths above each note
  - Dum: Backwards question mark (C with vertical line) - bass sound
  - Tak: Sharp upward caret (^) - high sound
  - Ka: Sharp downward V - high sound
  - Slap: Filled circle - accented sound
- **Centered symbols**: All symbols are properly centered above their corresponding notes
- **Dotted notes**: Automatic detection and rendering of dotted rhythms (dotted eighth, quarter, half notes)
- **Rests**: Full support for rests using the `_` notation
- **Time signature support**: Choose from various time signatures (4/4, 3/4, 6/8, etc.)
- **Measure separation**: Rhythms are automatically split into measures based on the time signature
- **Automatic beaming**: Eighth and sixteenth notes are automatically beamed together
- **Validation**: Real-time validation ensures rhythms fit properly within measures

## Notation System

### Basic Notation

Each character in the notation represents a 16th note worth of time:

- `D` or `d` = Dum (bass sound)
- `T` or `t` = Tak (high sound)
- `K` or `k` = Ka (high sound)
- `S` or `s` = Slap (accented sound)
- `_` = Rest (silence)
- `-` = Continue the previous note

### Examples

- `D` = Dum (16th note)
- `D-` = Dum (8th note)
- `D--` = Dum (dotted 8th note - 3 sixteenths)
- `D---` = Dum (quarter note)
- `D-----` = Dum (dotted quarter note - 6 sixteenths)
- `D-------` = Dum (half note)
- `D-----------` = Dum (dotted half note - 12 sixteenths)
- `_` = Rest (16th rest)
- `__` = Rest (8th rest)
- `____` = Rest (quarter rest)

### Complete Rhythm Example

```
D-T-..K-D---T---
```

This translates to:

- Dum (quarter note)
- Tak (8th note)
- Ka (8th note)
- Dum (8th note)
- Dum (8th note)
- Tak (quarter note)

In 4/4 time, this creates exactly one measure (16 sixteenth notes = 4 quarter notes).

## Technical Implementation

### Architecture

The app is built using:

- **React** with TypeScript for the UI
- **VexFlow** for professional music notation rendering
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Vitest** for testing

### Key Components

1. **App.tsx**: Main application component that manages state
2. **RhythmInput.tsx**: Input field and time signature controls
3. **RhythmDisplay.tsx**: Container for the rhythm notation display
4. **VexFlowRenderer.tsx**: Renders rhythms using VexFlow music notation library

### Parsing Logic

The rhythm parser (`utils/rhythmParser.ts`) handles:

1. Converting notation characters to drum sounds
2. Calculating note durations based on consecutive dashes
3. Splitting notes into measures based on time signature
4. Validating that measures have the correct duration

### Time Signatures

The app supports various time signatures:

- **4/4**: 16 sixteenth notes per measure (most common)
- **3/4**: 12 sixteenth notes per measure
- **6/8**: 12 sixteenth notes per measure
- And more...

The denominator determines the beat unit:

- `/4` = quarter note beat (4 sixteenth notes per beat)
- `/8` = eighth note beat (2 sixteenth notes per beat)

## Visual Design

The app uses a purple color scheme inspired by music and creativity:

- Primary purple: `#7c3aed`
- Light purple: `#a78bfa`
- Background: `#faf5ff`

### Music Notation

The app uses VexFlow to render professional music notation with:

- **Single-line staff**: Clean, minimal display with one staff line to show notes exist in a space
- **Standard note placement**: All notes positioned on the F line (F/4) for consistent percussion notation
- **Custom SVG symbols**: Hand-drawn style symbols above each note matching traditional Darbuka notation
  - Dum (bass): C-shaped curve opening to the right with vertical line extending down
  - Tak (high): Upward caret/wedge (^) with sharp angles
  - Ka (high): Downward V with sharp angles
  - Slap (accented): Filled circle
- **Visible note stems**: All notes (except whole notes) display stems for clear rhythm indication
- **Standard note durations**: Quarter notes, eighth notes, sixteenth notes, etc.
- **Dotted notes**: Full support with visible dots rendered next to note heads
- **Rests**: Standard rest symbols for silence
- **Automatic beaming**: Eighth and sixteenth notes are automatically grouped with beams
- **Time signatures**: Displayed at the beginning of the first measure
- **Measure bars**: Clear vertical lines separating measures

## Future Enhancements

Potential features for future development:

- Audio playback of rhythms
- Metronome integration
- Pre-loaded rhythm library (common Darbuka patterns)
- Visual beat indicators
- Practice mode with loop playback
- Export rhythms as images or PDFs
- Triplets and other tuplets
- Multiple voices/parts

## Development

### Running the App

```bash
npm run dev
```

Then navigate to `http://localhost:5173/drums/`

### Running Tests

```bash
npm test src/drums
```

### Building for Production

```bash
npm run build
```

## Credits

Created for Darbuka enthusiasts and students learning Middle Eastern percussion rhythms.
