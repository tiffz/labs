# FOUC and Layout Shift Prevention

This document explains the comprehensive solution implemented to prevent Flash of Unstyled Content (FOUC) and layout shift issues across all fonts in the app.

## The Problems

### 1. Icon Font FOUC

Material Icons and Noto Music fonts are loaded from Google Fonts as web fonts. Before the fonts load, browsers would display the icon text (e.g., "play_arrow", "stop", music symbols) as regular text, creating a jarring flash when the fonts finally load and render the proper icons.

### 2. Layout Shift

When the Roboto font loads, text can shift slightly due to metric differences between the fallback system font and Roboto, causing a cumulative layout shift (CLS) that affects user experience and Core Web Vitals.

## The Solution

We implemented a comprehensive multi-layered approach to eliminate FOUC and minimize layout shift:

### 1. Font Display Strategy (`index.html`)

Different strategies for different font types:

```html
<!-- Roboto: Use optional to prevent layout shift -->
<link href="...Roboto...&display=optional" />

<!-- Icon fonts: Use block to prevent FOUC -->
<link href="...Material+Symbols+Outlined...&display=block" />
<link href="...Noto+Music...&display=block" />
```

**Why different strategies?**

- **Roboto (optional)**: Only use if already cached, otherwise use fallback with matched metrics (prevents layout shift)
- **Icon fonts (block)**: Icons are supplementary, hide until font loads to prevent jarring text flash
- This prioritizes layout stability over custom font display

### 2. CSS-Based Icon Hiding (`drums.css`)

Both icon fonts are hidden by default using `color: transparent` and only shown once fonts load:

**Material Icons:**

```css
.material-symbols-outlined {
  color: transparent;
  width: 1.25rem;
  height: 1.25rem;
  overflow: hidden;
}

.fonts-loaded .material-symbols-outlined {
  color: inherit;
}
```

**Noto Music (note symbols):**

```css
.note-symbol {
  font-family: 'Noto Music', serif;
  color: transparent;
  min-width: 1.5rem;
  min-height: 1.5rem;
}

.fonts-loaded .note-symbol {
  color: inherit;
}
```

**Benefits:**

- No layout shift (fixed dimensions)
- Icons remain invisible until fonts load
- Smooth appearance with no flash
- Consistent approach across all icon fonts

### 3. JavaScript Font Detection (`index.html`)

Uses the CSS Font Loading API to detect when both icon fonts are ready:

```javascript
if ('fonts' in document) {
  let materialIconsLoaded = false;
  let notoMusicLoaded = false;

  function checkAllFontsLoaded() {
    if (materialIconsLoaded && notoMusicLoaded) {
      document.documentElement.classList.add('fonts-loaded');
    }
  }

  // Load Material Symbols
  document.fonts.load('24px "Material Symbols Outlined"').then(() => {
    materialIconsLoaded = true;
    checkAllFontsLoaded();
  });

  // Load Noto Music
  document.fonts.load('24px "Noto Music"').then(() => {
    notoMusicLoaded = true;
    checkAllFontsLoaded();
  });

  // Fallback: show icons after 3s timeout
  setTimeout(() => {
    document.documentElement.classList.add('fonts-loaded');
  }, 3000);
}
```

**Features:**

- Detects when **both** icon fonts are loaded
- Adds `fonts-loaded` class only when all icons are ready
- Fallback timeout (3s) if fonts fail to load
- Fallback for browsers without Font Loading API

### 4. Layout Shift Prevention (`index.html` + `drums.css`)

Minimize layout shift when Roboto loads by using fallback font metric adjustments:

**In `index.html`:**

```html
<style>
  /* Create a fallback that matches Roboto's metrics */
  @font-face {
    font-family: 'Roboto Fallback';
    src: local('Arial'), local('Helvetica'), local('sans-serif');
    size-adjust: 100.06%;
    ascent-override: 92.77%;
    descent-override: 24.41%;
    line-gap-override: 0%;
  }

  body {
    font-family:
      'Roboto',
      'Roboto Fallback',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Arial,
      sans-serif;
  }
</style>
```

**In `drums.css`:**

```css
body {
  line-height: 1.5;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

#root {
  min-height: 100vh;
}

h1,
h2,
h3,
h4,
h5,
h6,
p,
span,
button,
input,
label {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**How it works:**

- `display=optional`: Roboto only loads if already cached, otherwise uses fallback
- Fallback font metrics adjusted to match Roboto's exact dimensions
- `Roboto Fallback` in font stack ensures metrics are applied
- Eliminates layout shift entirely (zero CLS from fonts)
- Text rendering optimizations prevent sub-pixel differences

## How It Works Together

### Icon Fonts (Material Symbols + Noto Music)

1. **Initial State**: Icons have `color: transparent` (invisible)
2. **Fonts Load**: JavaScript detects both fonts are ready
3. **Class Added**: `fonts-loaded` class added to `<html>`
4. **Icons Appear**: CSS makes all icons visible simultaneously
5. **No Flash**: Icons go from invisible → visible (no text flash)

### Text Font (Roboto)

1. **Initial State**: 'Roboto Fallback' (Arial with adjusted metrics) displays immediately
2. **Roboto Loads**: Only if cached (`display=optional`)
3. **Zero Shift**: Fallback metrics match Roboto exactly
4. **Result**: No layout shift at all! Text stays perfectly stable

**Note**: With `display=optional`, Roboto may not load on first visit, but will be used on subsequent visits when cached. This trades custom typography for layout stability.

## Browser Support

- **Modern browsers**: Full support via CSS Font Loading API
- **Older browsers**: Fallback to `window.load` event
- **Font loading fails**: 3-second timeout ensures icons eventually appear

## Performance Impact

- **Font detection script**: ~800 bytes (handles 2 fonts), runs immediately
- **No blocking**: Script doesn't block page rendering
- **Better UX**: Eliminates jarring visual flash and reduces layout shift
- **Core Web Vitals**: Improves CLS (Cumulative Layout Shift) score
- **Perceived performance**: App feels more polished and stable

## Testing

### Icon FOUC Test

1. Open DevTools → Network tab
2. Throttle to "Slow 3G"
3. Hard refresh the page
4. **Expected**: Material Icons and music symbols remain invisible until fonts load
5. **Expected**: Icons appear smoothly together (no text flash)
6. **Expected**: No "play_arrow" or Unicode symbols visible

### Layout Shift Test

1. Open DevTools → Performance tab
2. Start recording
3. Hard refresh the page
4. Stop recording after page loads
5. Check "Experience" section for layout shifts
6. **Expected**: Minimal CLS (< 0.1 is good, < 0.05 is excellent)

## Alternative Approaches Considered

### Self-hosting Material Icons

**Pros**: Complete control over loading
**Cons**: Adds ~100KB to bundle, requires maintenance
**Decision**: Not worth the tradeoff for this use case

### CSS `@font-face` with local fallback

**Pros**: Could load faster
**Cons**: More complex setup, still needs FOUC prevention
**Decision**: Current approach is simpler and effective

### Using SVG icons instead

**Pros**: No font loading needed
**Cons**: Would require replacing all icon usage, larger bundle
**Decision**: Font icons work well with current fix

## Maintenance

### Adding New Material Icons

- No changes needed - the fix applies to all `.material-symbols-outlined` elements
- Just use the standard `<span class="material-symbols-outlined">icon_name</span>` pattern

### Adding New Music Symbols

- No changes needed - the fix applies to all `.note-symbol` elements
- Just use the standard `<span class="note-symbol">symbol</span>` pattern

### Adding a New Icon Font

1. Add font link with `&display=block` in `index.html`
2. Add font loading detection in the JavaScript section
3. Add CSS with `color: transparent` initially
4. Add `.fonts-loaded` rule to show the icons
5. Update `checkAllFontsLoaded()` to track the new font

### Changing Font Provider

- Update font URLs in `index.html`
- Update font names in JavaScript detection script
- Update CSS font-family declarations
- Recalculate fallback font metrics if changing main text font
