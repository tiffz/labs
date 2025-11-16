# URL Sharing Feature

The Darbuka Rhythm Trainer supports sharing rhythms via URL parameters. This allows users to share their current rhythm, tempo, and time signature with others by simply copying and pasting the URL.

## How It Works

The app automatically syncs the following state to the URL:

- **Rhythm notation** (`rhythm` parameter)
- **Beats per minute** (`bpm` parameter)
- **Time signature** (`time` parameter)

### Default Values

If no URL parameters are present, the app uses these defaults:

- Rhythm: `D-T-__T-D---T---` (Maqsum)
- BPM: `120`
- Time signature: `4/4`

## URL Parameter Format

### Examples

**Basic Maqsum rhythm at 120 BPM in 4/4:**

```
/drums
```

(No parameters needed - uses defaults)

**Custom rhythm:**

```
/drums?rhythm=D-T-K-T-D-K-T-K-
```

**Different tempo:**

```
/drums?rhythm=D-T-__T-D---T---&bpm=140
```

**Different time signature:**

```
/drums?rhythm=D--KD-T-&time=2/4&bpm=160
```

**All parameters:**

```
/drums?rhythm=D-D-K-T-D-K-T-K-&time=4/4&bpm=100
```

## Parameter Details

### `rhythm`

- **Format**: String using the darbuka notation system
- **Characters**:
  - `D` = Dum (bass)
  - `T` = Tak (high)
  - `K` = Ka (high)
  - `_` = Rest
  - `-` = Continuation
- **Example**: `D-T-__T-D---T---`

### `bpm`

- **Format**: Integer (positive number)
- **Range**: Typically 40-240
- **Example**: `120`

### `time`

- **Format**: `numerator/denominator`
- **Common values**: `4/4`, `3/4`, `2/4`, `6/8`, `7/8`
- **Example**: `4/4`

## URL Optimization

The app only includes parameters in the URL when they differ from the default values. This keeps URLs clean and short when using common settings.

**Example:**

- Playing default Maqsum at 120 BPM in 4/4: `/drums`
- Same rhythm at 140 BPM: `/drums?bpm=140`
- Different rhythm, default tempo: `/drums?rhythm=D-K-T-`

## Browser Navigation

The URL sharing feature fully supports browser back/forward navigation:

- Clicking the browser's back button will restore the previous rhythm state
- The forward button will move forward through your rhythm history
- Each rhythm change is saved to browser history

## Use Cases

### Sharing with Students

Teachers can create a rhythm and share the URL with students:

```
/drums?rhythm=D-T-__T-D-K-T---&bpm=100&time=4/4
```

### Saving Favorites

Bookmark URLs of your favorite rhythms for quick access.

### Collaboration

Share rhythms with other musicians for practice or performance preparation.

### Social Media

Post rhythm URLs on forums, social media, or messaging apps.

## Implementation Details

The URL state is managed by the `useUrlState` hook located in `/src/drums/hooks/useUrlState.ts`. The hook provides:

- `getInitialState()` - Reads URL parameters on app load
- `syncToUrl()` - Updates URL when state changes
- `setupPopStateListener()` - Handles browser navigation

The app automatically syncs state to URL whenever:

- Rhythm notation changes
- BPM is adjusted
- Time signature is modified

This happens in real-time without page reloads, providing a seamless user experience.
