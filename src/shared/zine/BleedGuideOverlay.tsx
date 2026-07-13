import type { CSSProperties, ReactElement } from 'react';

import type { BleedGuidePageSide, BleedOverlayPercents } from './bleedConfig';

export type BleedGuideOverlayProps = {
  percents: BleedOverlayPercents;
  /** When guides are hidden or bleed is zero. */
  show?: boolean;
  /** Page position in a spread — gutter draws on the binding edge. */
  pageSide?: BleedGuidePageSide;
  className?: string;
};

const BLEED_FILL = 'rgba(236, 72, 153, 0.22)';
const TRIM_LINE = 'rgba(34, 197, 94, 0.85)';
const BLEED_EDGE_LINE = 'rgba(59, 130, 246, 0.75)';
const QUIET_LINE = 'rgba(59, 130, 246, 0.55)';
const GUTTER_FILL = 'rgba(251, 146, 60, 0.18)';

function insetBox(percents: BleedOverlayPercents, edge: 'bleed' | 'quiet'): CSSProperties {
  const top =
    edge === 'bleed' ? percents.bleedHeightPercent : percents.quietAreaHeightPercent;
  const side =
    edge === 'bleed' ? percents.bleedWidthPercent : percents.quietAreaWidthPercent;
  return {
    top: `${top}%`,
    left: `${side}%`,
    right: `${side}%`,
    bottom: `${top}%`,
  };
}

export function BleedGuideOverlay({
  percents,
  show = true,
  pageSide = 'single',
  className,
}: BleedGuideOverlayProps): ReactElement | null {
  if (!show || (percents.bleedWidthPercent <= 0 && percents.bleedHeightPercent <= 0)) {
    return null;
  }

  const showGutter =
    percents.gutterWidthPercent > percents.quietAreaWidthPercent &&
    pageSide !== 'spread' &&
    pageSide !== 'single';
  const gutterOnRight = pageSide === 'left';
  const gutterOnLeft = pageSide === 'right';

  return (
    <div
      className={['bleed-guide-overlay', className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <div className="bleed-guide-overlay__bleed bleed-guide-overlay__bleed--top" style={{ height: `${percents.bleedHeightPercent}%`, backgroundColor: BLEED_FILL }} />
      <div className="bleed-guide-overlay__bleed bleed-guide-overlay__bleed--bottom" style={{ height: `${percents.bleedHeightPercent}%`, backgroundColor: BLEED_FILL }} />
      <div className="bleed-guide-overlay__bleed bleed-guide-overlay__bleed--left" style={{ width: `${percents.bleedWidthPercent}%`, backgroundColor: BLEED_FILL }} />
      <div className="bleed-guide-overlay__bleed bleed-guide-overlay__bleed--right" style={{ width: `${percents.bleedWidthPercent}%`, backgroundColor: BLEED_FILL }} />

      <div className="bleed-guide-overlay__trim" style={{ ...insetBox(percents, 'bleed'), border: `1px solid ${TRIM_LINE}` }} />

      <div
        className="bleed-guide-overlay__bleed-edge bleed-guide-overlay__bleed-edge--top"
        style={{ top: 0, height: 1, backgroundColor: BLEED_EDGE_LINE }}
      />
      <div
        className="bleed-guide-overlay__bleed-edge bleed-guide-overlay__bleed-edge--bottom"
        style={{ bottom: 0, height: 1, backgroundColor: BLEED_EDGE_LINE }}
      />
      <div
        className="bleed-guide-overlay__bleed-edge bleed-guide-overlay__bleed-edge--left"
        style={{ left: 0, width: 1, backgroundColor: BLEED_EDGE_LINE }}
      />
      <div
        className="bleed-guide-overlay__bleed-edge bleed-guide-overlay__bleed-edge--right"
        style={{ right: 0, width: 1, backgroundColor: BLEED_EDGE_LINE }}
      />

      {percents.quietAreaWidthPercent > percents.bleedWidthPercent &&
      percents.quietAreaHeightPercent > percents.bleedHeightPercent ? (
        <div
          className="bleed-guide-overlay__quiet"
          style={{ ...insetBox(percents, 'quiet'), border: `2px dashed ${QUIET_LINE}` }}
        />
      ) : null}

      {showGutter ? (
        <div
          className="bleed-guide-overlay__gutter"
          style={{
            position: 'absolute',
            top: `${percents.bleedHeightPercent}%`,
            bottom: `${percents.bleedHeightPercent}%`,
            ...(gutterOnRight
              ? { right: `${percents.bleedWidthPercent}%`, width: `${percents.gutterWidthPercent - percents.bleedWidthPercent}%` }
              : gutterOnLeft
                ? { left: `${percents.bleedWidthPercent}%`, width: `${percents.gutterWidthPercent - percents.bleedWidthPercent}%` }
                : {}),
            backgroundColor: GUTTER_FILL,
          }}
        />
      ) : null}
    </div>
  );
}
