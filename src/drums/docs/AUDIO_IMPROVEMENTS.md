# Audio Improvements

## Overview

The darbuka rhythm trainer now uses the Web Audio API for precise, crisp sound playback with dynamic volume control. This makes fast 16th note patterns sound more organized and musical.

## Key Features

### 1. **Dynamic Volume Based on Beat Position**

Notes are played at different volumes depending on their position in the measure:

- **First note of measure**: 100% volume (1.0)
  - This provides a strong downbeat that anchors the rhythm
- **First note of each beat group**: 75% volume (0.75)
  - Emphasizes the start of each beat group (respects compound and asymmetric groupings)
  - This creates clear beat structure within the measure
- **All other notes**: 40% volume (0.4)
  - Subdivision notes are significantly quieter for dramatic contrast
  - Makes the beat structure very clear and easy to follow

This volume hierarchy makes complex patterns like `DKTKDKTKDKTKDKTK` sound structured and musical instead of jarring.

### 2. **Smart Fade-Out for Fast Notes**

Very short notes (< 150ms / fast 16th notes at high tempo) get a gentle exponential fade-out starting at 80% of their duration. This:

- Prevents sound overlap on fast passages
- Maintains natural sound quality (no harsh clipping)
- Only applies when needed - longer notes play naturally
- Uses smooth exponential ramping to avoid audio artifacts

Longer notes play their full natural duration without any modification.

### 3. **Web Audio API for Precise Timing**

The implementation uses the Web Audio API instead of HTML5 Audio elements because:

- **Better timing precision**: Sounds start exactly when scheduled
- **No playback delays**: Direct buffer playback with minimal latency
- **Volume control**: Gain nodes allow precise volume adjustment per note
- **Efficient**: Sounds are preloaded as audio buffers for instant playback

## Technical Implementation

### Audio Player (`audioPlayer.ts`)

```typescript
// Play with volume and optional fade-out
audioPlayer.play(sound, volume, duration);
```

- `sound`: The drum sound to play ('dum', 'tak', 'ka')
- `volume`: 0.0 to 1.0 (calculated based on beat position)
- `duration`: Duration in seconds (only used for fade-out on notes < 150ms)

### Rhythm Player (`rhythmPlayer.ts`)

The rhythm player calculates:

1. **Position in measure** (in sixteenths) to determine volume
2. **Fade duration** - only applied to very short notes (< 150ms) to prevent overlap
3. **Precise scheduling** using `setTimeout` with drift compensation

## Benefits

### For Fast Patterns

Patterns with many 16th notes now sound:

- **Organized**: Clear beat structure from volume dynamics
- **Clean**: Gentle fade-out prevents overlap without harsh clipping
- **Natural**: Longer notes maintain their full character
- **Musical**: Natural emphasis on strong beats

### For All Rhythms

- **Better timing**: Web Audio API provides sample-accurate playback
- **Consistent**: Volume hierarchy works for all time signatures
- **Professional**: Sounds more like a real drum machine

## Browser Compatibility

The Web Audio API is supported in all modern browsers:

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with webkit prefix fallback)

The code includes a fallback for webkit-prefixed AudioContext for older Safari versions.

## Future Enhancements

Potential improvements for the future:

1. **Accent marks**: Allow users to manually accent specific notes
2. **Swing feel**: Add subtle timing variations for groove
3. **Different sound sets**: Multiple drum sound options
4. **Reverb/effects**: Optional audio effects for different sounds
