import type { ReactElement } from 'react';
import type { EncoreOriginalSong } from '../types';
import { OriginalsTakesWorkspace } from './OriginalsTakesWorkspace';

export type OriginalsTakesStageProps = {
  song: EncoreOriginalSong;
  onChange: (next: EncoreOriginalSong) => void;
  readOnly?: boolean;
  /** @deprecated Unused — the takes stage no longer renders the brainstorm group. */
  onOpenBrainstorm?: () => void;
  /** @deprecated Ignored — the takes workspace owns its own drop surface. */
  subtleAddZone?: boolean;
};

/**
 * Record takes workflow stage — a surface for managing takes and nothing else.
 *
 * References and Brainstorm deliberately do not appear here; they remain on Song view ("Song
 * files") and the Brainstorm sidebar, which is where their dense chip layout belongs.
 */
export function OriginalsTakesStage({
  song,
  onChange,
  readOnly,
}: OriginalsTakesStageProps): ReactElement {
  return <OriginalsTakesWorkspace song={song} onChange={onChange} readOnly={readOnly} />;
}
