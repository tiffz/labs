# Darbuka Rhythm Trainer

A web application for learning and practicing Darbuka drum rhythms. Enter rhythms using simple text notation and see them displayed as professional music notation.

## Features

- **Simple Text Notation**: Enter rhythms using D, T, K, S for drum sounds
- **Professional Music Notation**: Rhythms displayed using standard music notation via VexFlow
- **Time Signature Support**: Choose from various time signatures (4/4, 3/4, 6/8, etc.)
- **Rhythm Presets**: Quick access to standard Middle Eastern rhythms (Maqsum, Saeidi, Baladi, Ayoub)
- **Tab Import**: Import drum tabs and guitar tabs from Ultimate Guitar and convert to darbuka notation (see [TAB_IMPORT.md](docs/TAB_IMPORT.md))
- **Audio Playback**: Hear rhythms played back with dynamic volume based on beat position
- **Metronome**: Built-in metronome with adjustable BPM
- **URL Sharing**: Share rhythms via URL - perfect for teaching students
- **Automatic Beaming**: Notes are automatically beamed according to music notation rules

## How to Use

1. **Enter a Rhythm**: Type rhythm notation in the input field (e.g., `D-T-..K-D---T---`)
2. **Select Time Signature**: Choose the appropriate time signature from the dropdown
3. **Adjust BPM**: Set the tempo using the BPM control
4. **Play**: Click play to hear the rhythm
5. **Share**: Copy the URL to share your rhythm with others

## Notation System

Each character represents a 16th note:

- `D` or `d` = Dum (bass sound)
- `T` or `t` = Tak (high sound)
- `K` or `k` = Ka (high sound)
- `S` or `s` = Slap (accented sound)
- `_` = Rest (silence)
- `-` = Continue the previous note

### Examples

- `D` = Dum (16th note)
- `D-` = Dum (8th note)
- `D---` = Dum (quarter note)
- `D-T-..K-D---T---` = Maqsum rhythm in 4/4 time

## Development

See `GEMINI.md` for technical architecture details and `DEVELOPMENT.md` for architecture decision records.
