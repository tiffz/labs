import type { ReactElement } from 'react';
import type { EncoreOriginalSong } from '../types';
import { OriginalsSongFilesPanel } from './OriginalsSongFilesPanel';

export type OriginalsTakesStageProps = {
  song: EncoreOriginalSong;
  onChange: (next: EncoreOriginalSong) => void;
  onOpenBrainstorm?: () => void;
  /** @deprecated Ignored — unified song files panel uses practice-resources drop targets. */
  subtleAddZone?: boolean;
};

/** Record takes workflow stage — unified song files panel (demo takes, references, brainstorm). */
export function OriginalsTakesStage({
  song,
  onChange,
  onOpenBrainstorm,
}: OriginalsTakesStageProps): ReactElement {
  return (
    <OriginalsSongFilesPanel song={song} onChange={onChange} onOpenBrainstorm={onOpenBrainstorm} />
  );
}
