# Tab Import

The Darbuka Rhythm Trainer can import both drum tabs and guitar tabs from sites like Ultimate Guitar and convert them to darbuka notation.

## Supported Tab Types

### Drum Tabs

Standard ASCII drum tabs with component lines (BD, SD, HH, etc.) and hit markers.

### Guitar Tabs

ASCII guitar tabs (6-string notation) with strumming pattern lines. The strumming patterns (d/u/PM) are converted to darbuka rhythm.

## How It Works

### Auto-Detection

When you paste text into the notation input, the app automatically detects the tab type:

**Drum Tab Indicators:**

- Lines starting with drum component codes (BD, SD, HH, CC, RC, etc.)
- Bar separators (`|`)
- Hit markers (`x`, `o`, `-`)

**Guitar Tab Indicators:**

- Six lines starting with string names (`e`, `B`, `G`, `D`, `A`, `E`)
- Fret numbers (digits)
- Bar separators (`|`)

If detected, a modal opens to preview the conversion before importing. You can override the detected type if needed.

## Drum Tab Conversion

### Mapping

| Drum Tab        | Darbuka | Sound      | Default  |
| --------------- | ------- | ---------- | -------- |
| BD (Bass Drum)  | D       | Dum (bass) | Included |
| SD (Snare Drum) | T       | Tek (high) | Included |
| HH (Hi-Hat)     | K       | Ka (soft)  | Optional |

Other components (CC, RC, cymbals, toms) are not mapped.

### Component Selection

- **Bass Drum (BD → D)**: Enabled by default. Maps kick drum hits to Dum.
- **Snare Drum (SD → T)**: Enabled by default. Maps snare hits to Tek.
- **Hi-Hat (HH → K)**: Disabled by default. Maps hi-hat hits to Ka.

When multiple components hit on the same beat, the priority order is: **BD > SD > HH**

### Why Hi-Hat is Optional

Hi-hat typically plays on every 8th note in rock/pop music, which can overwhelm the core rhythm pattern. By default, only the "skeleton" (kick + snare) is imported.

### Example

Input drum tab:

```
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|
```

**Default output (BD + SD only):**

```
D-__T-_DD-D-T-__
```

## Guitar Tab Conversion

### How It Works

Guitar tabs don't contain drum data, but they often include **strumming patterns** below the tab grid. These strumming patterns indicate the rhythm played by the guitarist's strumming hand, which can be converted to darbuka notation.

### Strumming Pattern Sources

The parser looks for strumming patterns in two places:

1. **Footer lines** - Lines below the tab grid with `d`, `u`, `PM` notation
2. **Metadata blocks** - "Strumming:" sections near the top of the tab

### Mapping

| Guitar      | Meaning    | Darbuka | Sound             | Default  |
| ----------- | ---------- | ------- | ----------------- | -------- |
| d           | Downstroke | D       | Dum (bass)        | Included |
| u           | Upstroke   | K or T  | Ka (soft) or Tek  | Included |
| PM          | Palm Mute  | S       | Slap (percussive) | Included |
| . or space  | Rest       | _       | Silence           | -        |

### Strumming Selection

- **Downstroke (d → D)**: Enabled by default. The heavy, gravity-driven hit on the beat.
- **Upstroke (u → K/T)**: Enabled by default. A lighter, lifting hit on the off-beat. Choose between Ka (softer) or Tek (brighter).
- **Palm Mute (PM → S)**: Enabled by default. A percussive "thud" sound.

When multiple elements occur on the same beat, the priority order is: **d > u > PM**

### Why This Works

A guitarist's strumming hand acts like a percussion instrument:

- **Downstrokes** provide the strong, grounding beats (like a bass drum)
- **Upstrokes** provide the lighter off-beats (like a hi-hat)
- **Palm mutes** create a percussive "chugging" effect (like a slap)

This makes guitar strumming patterns a "goldmine" of rhythmic data that translates well to darbuka notation.

### Example

Input guitar tab with strumming:

```
Am
e|---0--------0--------0----------0-0------|
B|---1--------1--------1----------1-1------|
G|---2-PM-----2-PM-----2-PM-------2-2-PM---|
D|---2--------2--------2----------2-2------|
A|-0--------0--------0----------0----------|
E|-----------------------------------------|
   d d PM   d d PM   d d PM   d u d PM
```

Output (with default options):

```
D-D-S-__D-D-S-__D-D-S-__D-K-D-S-
```

The classic "chugging" pattern (d d PM) common in country and folk music translates to Dum-Dum-Slap on the darbuka.

## Usage

### Via Paste Detection

1. Copy a tab from Ultimate Guitar or similar site
2. Paste into the notation input field
3. If detected, a modal shows the conversion preview
4. Select tab type (auto-detected, can be overridden)
5. Choose which components/strumming to include
6. Choose "Simplified" (unique patterns) or "Full" (all measures)
7. Click "Import Rhythm"

### Via Load Rhythm Menu

1. Click "Load Rhythm" button
2. Select "Import Tab..."
3. Paste your tab in the modal
4. Preview and import

## Limitations

### Drum Tabs

- Only BD (bass drum), SD (snare), and HH (hi-hat) are converted
- Complex fills and tom patterns are simplified
- Works best with standard rock/pop patterns

### Guitar Tabs

- Requires a strumming pattern line below the tab (not all tabs have this)
- Timing is approximate based on character spacing
- Only strumming patterns are used (not the fret numbers or chord voicings)
- Works best with rhythmic acoustic guitar parts

### Both

- Tempo/BPM must be set manually after import
- Output is normalized to 16th note resolution

## Technical Details

### Drum Tab Parsing

- Handles multi-line tabs with bar wrapping
- Supports continuation lines (bars that wrap to next line)
- Recognizes various hit markers (`x`, `o`, `X`, `O`, `d` for double hits)
- Ignores lyrics and section headers interspersed in tabs

### Guitar Tab Parsing

- Detects 6-string guitar tab format (e, B, G, D, A, E)
- Extracts strumming from footer lines or metadata blocks
- Parses d (down), u (up), PM (palm mute), and rests
- Normalizes to 8th note pairs for cleaner output
