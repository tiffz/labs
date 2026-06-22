import type { ReactElement } from 'react';
import { OriginalsChartReadView, type OriginalsChartReadViewProps } from './OriginalsChartReadView';

export type OriginalsLyricsChartPanelProps = OriginalsChartReadViewProps;

/** Combined lyrics + styled chord chart read view with playback. */
export function OriginalsLyricsChartPanel(props: OriginalsLyricsChartPanelProps): ReactElement | null {
  return <OriginalsChartReadView {...props} />;
}
