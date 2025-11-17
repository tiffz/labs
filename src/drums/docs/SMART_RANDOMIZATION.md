# Smart Randomization

## Overview

The randomize button generates rhythms that respect beat groupings for musical coherence, making the results sound more natural and intentional rather than completely chaotic.

## How It Works

### Beat Group Awareness

The randomization algorithm:

1. **Gets the beat grouping** for the current time signature:
   - 4/4: `[4, 4, 4, 4]` (4 quarter-note groups)
   - 6/8: `[3, 3]` (2 groups of 3 eighth notes)
   - 7/8: `[3, 2, 2]` (asymmetric grouping)
   - 11/8 with custom grouping: uses the custom grouping

2. **Generates patterns within each beat group** independently

3. **Respects boundaries 80% of the time**:
   - 80% chance: Notes stay within their beat group (musically coherent)
   - 20% chance: Notes can cross beat boundaries (adds variety)

### Sound Distribution

The algorithm uses weighted randomization for drum sounds:

- **D (Dum)**: 25% - Bass drum
- **T (Tak)**: 25% - High tone
- **K (Ka)**: 20% - High tone
- **\_ (Rest)**: 30% - Silence

This creates a natural balance between:

- Bass and high tones
- Sound and silence
- Different timbres

### Duration Selection

Available note durations:

- **1 sixteenth**: Quick notes
- **2 sixteenths** (eighth): Standard rhythm
- **3 sixteenths** (dotted eighth): Syncopation
- **4 sixteenths** (quarter): Longer notes

The algorithm randomly selects durations that fit within the remaining space, with bias towards staying within beat groups.

## Examples

### 4/4 Time Signature

With beat grouping `[4, 4, 4, 4]` (4 quarter notes):

**Before (old randomization):**

```
D-T-K-__D-K-T-D-K-T-K-D-T-K-
```

Notes cross beat boundaries randomly, making it hard to follow.

**After (smart randomization):**

```
D-T-__D-__T-K-D---T-K-D-T-__
```

Each quarter-note group has a coherent pattern:

- Beat 1: `D-T-` (dum-tak)
- Beat 2: `__D-` (rest-dum)
- Beat 3: `__T-K-` (rest-tak-ka)
- Beat 4: `D---` (long dum)

### 6/8 Time Signature (Compound)

With beat grouping `[3, 3]` (2 groups of 3 eighth notes):

**Smart randomization:**

```
D-T-K-D---T-
```

- Group 1: `D-T-K-` (dum-tak-ka, fills 3 eighths)
- Group 2: `D---T-` (long dum + tak, fills 3 eighths)

Each group feels like a complete musical phrase.

### 7/8 Time Signature (Asymmetric)

With beat grouping `[3, 2, 2]`:

**Smart randomization:**

```
D-T-__D-T-K-T-
```

- Group 1 (3 eighths): `D-T-__` (dum-tak-rest)
- Group 2 (2 eighths): `D-T-` (dum-tak)
- Group 3 (2 eighths): `K-T-` (ka-tak)

The asymmetric feel is preserved while each group has internal coherence.

## Benefits

### Musical Coherence

- **Predictable phrasing**: Each beat group feels like a mini-pattern
- **Easier to play**: Musicians can focus on one group at a time
- **Better learning**: Students can practice each group separately

### Variety with Structure

- **Not too random**: 80% boundary respect prevents chaos
- **Not too rigid**: 20% boundary crossing adds interest
- **Natural feel**: Weighted sound distribution mimics real playing

### Time Signature Awareness

- **Compound time** (6/8, 9/8, 12/8): Groups of 3 eighth notes feel natural
- **Asymmetric time** (5/8, 7/8, 11/8): Custom groupings are respected
- **Simple time** (4/4, 2/4, 3/4): Quarter-note groups are clear

## Implementation Details

### Algorithm Pseudocode

```
for each beat group:
  decide: respect boundary? (80% yes, 20% no)

  while group not filled:
    calculate remaining space in group
    pick random duration that fits
    pick random sound (weighted)
    add note to pattern

    if respecting boundary and group filled:
      break to next group
```

### Key Functions

- `getDefaultBeatGrouping(timeSignature)`: Gets beat groups for time signature
- Beat grouping conversion: Handles /8 vs /4 time differences
- Weighted random selection: Uses cumulative probability for sound choice

## Future Enhancements

Possible improvements:

1. **Difficulty levels**:
   - Easy: Simpler patterns, fewer syncopations
   - Medium: Current behavior
   - Hard: More complex patterns, more boundary crossing

2. **Style presets**:
   - Traditional: More D and T, fewer K
   - Modern: More syncopation, more rests
   - Dense: Fewer rests, more sixteenth notes

3. **Seed patterns**:
   - Start with a known pattern (like Maqsum)
   - Randomize variations while keeping the core feel

4. **User preferences**:
   - Adjust sound weights (more bass, less rests, etc.)
   - Adjust boundary respect percentage
   - Prefer certain durations
