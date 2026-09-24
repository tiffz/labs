import TextField from '@mui/material/TextField';
import { memo, type ReactElement } from 'react';
import { useDebouncedTextDraft } from '../../hooks/useDebouncedTextDraft';

export interface OriginalsSongTitleFieldProps {
  title: string;
  onCommit: (next: string) => void;
}

/**
 * The song title, isolated so that typing re-renders an input and nothing else.
 *
 * `OriginalsSongHeader` also renders the mode toggle, the chart-history menu and several tooltips.
 * With the draft state living there, every character re-rendered all of it; every publish re-rendered
 * the whole `OriginalSongPage` subtree on top. At a real library size that was enough for keystrokes
 * to queue behind the render, which is what "the cursor jumps around" and "it feels slow" describe —
 * and on macOS a field that stalls between two spaces is exactly when the system substitutes a "."
 *
 * Two separate mechanisms, worth not confusing:
 *
 *   - The CORRECTNESS guarantee is the focus guard inside `useDebouncedTextDraft`: while the field has
 *     focus, a `title` arriving from the parent is ignored, so nothing can reset the caret. That is
 *     the part with a test that fails when removed.
 *   - `memo` is a PERFORMANCE guard only — it stops this field re-rendering when the parent re-renders
 *     on publish. Removing it does not break any assertion here, so it is not claimed to.
 *
 * Publishing waits for a real pause (or blur) rather than the 220ms a search box uses. A title has no
 * consumer that needs it mid-word, and each publish costs a page render plus a Dexie write.
 */
const TITLE_SETTLE_MS = 600;

export const OriginalsSongTitleField = memo(function OriginalsSongTitleField({
  title,
  onCommit,
}: OriginalsSongTitleFieldProps): ReactElement {
  const { draft, setDraft, focusProps } = useDebouncedTextDraft(title, onCommit, {
    delayMs: TITLE_SETTLE_MS,
  });

  return (
    <TextField
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={focusProps.onFocus}
      onBlur={focusProps.onBlur}
      placeholder="Untitled original"
      variant="standard"
      fullWidth
      sx={{
        mt: 0.5,
        '& .MuiInput-root': { fontSize: 'inherit' },
      }}
      slotProps={{
        input: { disableUnderline: true },
        htmlInput: {
          'aria-label': 'Song title',
          // The browser's own correction engines are a poor fit for song titles, and they mutate the
          // value behind React's back.
          autoCorrect: 'off',
          autoCapitalize: 'off',
          spellCheck: false,
          style: {
            fontSize: '1.375rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            padding: 0,
          },
        },
      }}
    />
  );
});
