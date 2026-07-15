import type { ReactElement } from 'react';

import { sfxRenderStyle } from './sfxLoudness';
import type { SfxLayout } from './speechBubbleLayout';

export type SfxLayoutGraphicProps = {
  sfx: SfxLayout;
};

/** Wireframe-safe SFX type treatments by loudness. */
export function SfxLayoutGraphic({ sfx }: SfxLayoutGraphicProps): ReactElement {
  const style = sfxRenderStyle(sfx.loudness, sfx.text);
  const burst =
    style.burstTicks ? (
      <g className="comic-mockup-svg__sfx-burst" opacity={0.55} aria-hidden>
        {[-28, -12, 12, 28].map((deg) => {
          const rad = ((deg + style.rotateDeg) * Math.PI) / 180;
          const x2 = sfx.x + Math.cos(rad) * (sfx.fontSize * 1.15);
          const y2 = sfx.y - sfx.fontSize * 0.35 + Math.sin(rad) * (sfx.fontSize * 1.15);
          return (
            <line
              key={deg}
              x1={sfx.x}
              y1={sfx.y - sfx.fontSize * 0.35}
              x2={x2}
              y2={y2}
              stroke="#333"
              strokeWidth={1.25}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    ) : null;

  return (
    <g
      className={`comic-mockup-svg__sfx comic-mockup-svg__sfx--${style.loudness}`}
      transform={
        style.rotateDeg !== 0 ? `rotate(${style.rotateDeg} ${sfx.x} ${sfx.y})` : undefined
      }
    >
      {burst}
      <text
        x={sfx.x}
        y={sfx.y}
        textAnchor="middle"
        fontSize={sfx.fontSize}
        fontWeight={style.fontWeight}
        fill={style.fill}
        stroke={style.outline ? '#fff' : undefined}
        strokeWidth={style.outline ? Math.max(2, sfx.fontSize * 0.12) : undefined}
        paintOrder={style.outline ? 'stroke fill' : undefined}
        letterSpacing={style.letterSpacing}
        fontFamily="Impact, Haettenschweiler, sans-serif"
      >
        {sfx.text}
      </text>
    </g>
  );
}
