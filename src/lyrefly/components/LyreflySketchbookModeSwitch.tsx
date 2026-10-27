import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { ReactElement } from 'react';

import { lyreflyCollectionsHref, lyreflySketchbookHref, navigateLyreflyHash } from '../routes/lyreflyHash';

/** Ideas (loose seeds) or Collections (finished pieces): two kinds of raw material, one place. */
export function LyreflySketchbookModeSwitch({ mode }: { mode: 'ideas' | 'collections' }): ReactElement {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      aria-label="Sketchbook view"
      className="lyrefly-sketchbook-mode-switch"
      data-testid="lyrefly-sketchbook-mode-switch"
    >
      <ToggleButton
        value="ideas"
        aria-current={mode === 'ideas' ? 'page' : undefined}
        onClick={() => mode !== 'ideas' && navigateLyreflyHash(lyreflySketchbookHref())}
      >
        Ideas
      </ToggleButton>
      <ToggleButton
        value="collections"
        aria-current={mode === 'collections' ? 'page' : undefined}
        onClick={() => mode !== 'collections' && navigateLyreflyHash(lyreflyCollectionsHref())}
      >
        Collections
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
