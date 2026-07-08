import type { ReactElement } from 'react';
import type { EncoreSong } from '../../types';
import { PracticeResourceDnDProvider } from './PracticeResourceDnD';
import { PracticeResourcesPanel, type PracticeResourcesPanelProps } from './PracticeResourcesPanel';
import type { PracticeResourceSongChange } from './usePracticeResourceDnD';

export type PracticeResourcesPanelWithDnDProps<T extends string = string> = Omit<
  PracticeResourcesPanelProps<T>,
  'chipDragEnabled'
> & {
  practiceResourceDnD: {
    song: EncoreSong;
    onSongChange: PracticeResourceSongChange;
  };
};

export function PracticeResourcesPanelWithDnD<T extends string = string>(
  props: PracticeResourcesPanelWithDnDProps<T>,
): ReactElement {
  const { practiceResourceDnD, ...panelProps } = props;
  return (
    <PracticeResourceDnDProvider
      song={practiceResourceDnD.song}
      onSongChange={practiceResourceDnD.onSongChange}
    >
      <PracticeResourcesPanel {...panelProps} chipDragEnabled />
    </PracticeResourceDnDProvider>
  );
}
