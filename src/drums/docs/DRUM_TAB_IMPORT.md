# Drum Tab Import

The Darbuka Rhythm Trainer can import drum tabs from sites like Ultimate Guitar and convert them to darbuka notation.

## How It Works

### Detection

When you paste text into the notation input, the app automatically detects if it's a drum tab by looking for:

- Lines starting with drum component codes (BD, SD, HH, CC, RC, etc.)
- Bar separators (`|`)
- Hit markers (`x`, `o`, `-`)

If detected, a modal opens to preview the conversion before importing.

### Conversion Mapping

Western drum components are mapped to darbuka sounds:

| Drum Tab        | Darbuka | Sound      | Default  |
| --------------- | ------- | ---------- | -------- |
| BD (Bass Drum)  | D       | Dum (bass) | Included |
| SD (Snare Drum) | T       | Tek (high) | Included |
| HH (Hi-Hat)     | K       | Ka (soft)  | Optional |

Other components (CC, RC, cymbals, toms) are not mapped.

### Component Selection

The import modal allows you to choose which drum components to include:

- **Bass Drum (BD → D)**: Enabled by default. Maps kick drum hits to Dum.
- **Snare Drum (SD → T)**: Enabled by default. Maps snare hits to Tek.
- **Hi-Hat (HH → K)**: Disabled by default. Maps hi-hat hits to Ka.

When multiple components hit on the same beat, the priority order is: **BD > SD > HH**

### Why Hi-Hat is Optional

Hi-hat typically plays on every 8th note in rock/pop music, which can overwhelm the core rhythm pattern. By default, only the "skeleton" (kick + snare) is imported. Enable hi-hat if you want the full pulse.

### Simplification

Drum tabs are written in 16th note resolution, but rock/pop beats are typically felt in 8th notes. The parser:

1. **Combines 16th note pairs into 8th notes** - Cleaner, more readable output
2. **Preserves consecutive hits** - `oo` in tabs becomes `DD` (two 16th notes)
3. **Uses proper notation** - Single hits become `D-` or `T-` (8th notes)
4. **Fills gaps with hi-hat** - Empty 8th notes become `K-` for pulse

### Example

Input tab:

```
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|
```

**Default output (BD + SD only):**

```
D-__T-_DD-D-T-__
```

Breakdown:

- `D-` = kick on beat 1
- `__` = rest
- `T-` = snare on beat 2
- `_D` = offbeat kick (first of double-kick)
- `D-` = kick on beat 3 (second of double-kick)
- `D-` = kick on "and" of 3
- `T-` = snare on beat 4
- `__` = rest

**With Hi-Hat enabled (BD + SD + HH):**

```
D-K-T-KDD-D-T-K-
```

The hi-hat (K) fills in the spaces where no kick or snare plays, providing the pulse.

## Usage

### Via Paste Detection

1. Copy a drum tab from Ultimate Guitar or similar site
2. Paste into the notation input field
3. If detected, a modal shows the conversion preview
4. Choose "Simplified" (unique patterns) or "Full" (all measures)
5. Click "Import Rhythm"

### Via Load Rhythm Menu

1. Click "Load Rhythm" button
2. Select "Import Drum Tab..."
3. Paste your tab in the modal
4. Preview and import

## Limitations

- Only BD (bass drum) and SD (snare drum) are converted
- Complex fills and tom patterns are simplified
- Tempo/BPM must be set manually after import
- Works best with standard rock/pop patterns

## Technical Details

The parser handles:

- Multi-line tabs with bar wrapping
- Continuation lines (bars that wrap to next line)
- Various hit markers (`x`, `o`, `X`, `O`, `d` for double hits)
- Lyrics and section headers interspersed in tabs
- Different drum component orderings
