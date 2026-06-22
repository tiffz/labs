import type { ReactElement } from 'react';
import {
  useOriginalsSongFilesPanel,
  type OriginalsSongFilesPanelProps,
} from '../hooks/useOriginalsSongFilesPanel';

export type { OriginalsSongFilesPanelProps };

/** Unified demo takes, references, and brainstorm files — same UX as repertoire practice resources. */
export function OriginalsSongFilesPanel(props: OriginalsSongFilesPanelProps): ReactElement {
  const { panel } = useOriginalsSongFilesPanel(props);
  return panel;
}
