# Shared Utilities

This directory contains shared utilities that are used across all micro-apps in the labs project.

## Audio Utilities (`audio/`)

Shared audio playback infrastructure using the Web Audio API.

### AudioPlayer

A configurable audio player for loading and playing sounds with precise timing.

```typescript
import { AudioPlayer } from '../shared/audio';

const player = new AudioPlayer({
  soundUrls: {
    dum: '/sounds/dum.wav',
    tak: '/sounds/tak.wav',
  },
  clickUrl: '/sounds/click.mp3',
  enableReverb: true,
});

await player.initialize();
await player.play('dum', 0.8); // Play at 80% volume
```

### MetronomePlayer

A standalone metronome for playing click tracks synced to time signatures.

```typescript
import { MetronomePlayer, AudioPlayer } from '../shared/audio';

const audioPlayer = new AudioPlayer({ clickUrl: '/sounds/click.mp3' });
const metronome = new MetronomePlayer(audioPlayer);

await metronome.start(
  120,
  { numerator: 4, denominator: 4 },
  4,
  (measure, position, isDownbeat) => {
    console.log(`Beat at measure ${measure}, position ${position}`);
  }
);
```

## Rhythm Utilities (`rhythm/`)

Shared rhythm parsing and time signature utilities.

### Types

Core types for rhythm notation:

- `DrumSound`: Drum sound types ('dum', 'tak', 'ka', 'slap', 'rest')
- `Note`, `Measure`, `ParsedRhythm`: Structured rhythm data
- `TimeSignature`: Time signature with optional beat grouping
- `PlaybackSettings`: Volume and effect settings

### rhythmParser

Parse notation strings into structured rhythm data:

```typescript
import { parseRhythm } from '../shared/rhythm';

const rhythm = parseRhythm('D-T-K-T-', { numerator: 4, denominator: 4 });
// Returns: { measures: [...], timeSignature: {...}, isValid: true }
```

### timeSignatureUtils

Utilities for working with time signatures:

```typescript
import {
  isCompoundTimeSignature,
  getDefaultBeatGrouping,
  getSixteenthsPerMeasure,
} from '../shared/rhythm';

const ts = { numerator: 6, denominator: 8 };
isCompoundTimeSignature(ts); // true
getDefaultBeatGrouping(ts); // [3, 3]
getSixteenthsPerMeasure(ts); // 12
```

---

## Server Logging

The server logging functionality has been refactored to be shared across all micro-apps.

### Usage

To add server logging to a new micro-app:

1. Import the server logger in your `main.tsx` file:

```typescript
import { installServerLogger } from '../shared/utils/serverLogger';
```

2. Install server logging with a unique app name:

```typescript
const serverLogger = installServerLogger('YOUR_APP_NAME');
```

### Features

- **Automatic error capture**: Captures `window.onerror` and `unhandledrejection` events
- **Console proxying**: Forwards all console logs to the development server
- **App identification**: Each app's logs are tagged with the app name
- **E2E test compatibility**: Automatically disables during E2E test runs
- **Development-only**: Only active in development mode

### Server Output

Logs appear in the Vite development server console with the format:

```
[APP_NAME-DEBUG timestamp] [LEVEL] message
```

For example:

```
[CATS-DEBUG 10:30:45] [ERROR] Component failed to render
[ZINES-DEBUG 10:30:46] [INFO] User uploaded new image
[CORP-DEBUG 10:30:47] [WARN] Performance warning
```

## Files

- `serverLogger.ts`: Core server logging implementation with `installServerLogger()` function
- `serverLogger.test.ts`: Comprehensive test suite ensuring stability and correct behavior

## Testing

The server logger includes a comprehensive test suite that covers:

- ✅ **API Stability**: Ensures consistent interface across different app names
- ✅ **Server Communication**: Validates correct endpoint usage and data format
- ✅ **Error Handling**: Tests graceful handling of network failures
- ✅ **Event Capture**: Verifies window error and unhandled rejection capture
- ✅ **Data Serialization**: Ensures complex objects are properly serialized
- ✅ **Singleton Behavior**: Confirms proper instance management

Run the tests with:

```bash
npm test -- src/shared/utils/serverLogger.test.ts
```
