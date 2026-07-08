import type { ReactElement, ReactNode } from 'react';
import LabsErrorBoundary from '../../shared/components/LabsErrorBoundary';

/**
 * Isolates playback/viewer render failures from the library shell.
 * A timeline or notation crash should not blank the entire Stanza app.
 */
export function StanzaViewerErrorBoundary(props: { children: ReactNode }): ReactElement {
  return <LabsErrorBoundary appId="stanza-viewer">{props.children}</LabsErrorBoundary>;
}
