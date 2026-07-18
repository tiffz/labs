import { useEffect, useState, type ReactElement } from 'react';

import type { MarkerPlacement } from './characterArrangements';
import { characterMarkerBox, emojiPaintHalfExtent } from './characterMarkers';
import { EMOJI_FONT_STACK, rasterizeEmojiToDataUrlAsync } from './emojiRasterize';
import type { PanelCharacterId } from './types';

type MarkerBounds = { x: number; y: number; w: number; h: number };

/** Solid outline width as a fraction of glyph size (baked into raster). */
const EMOJI_MARKER_OUTLINE_RATIO = 0.1;
const EMOJI_GLYPH_SIZE_RATIO = 1.55;

export type EmojiCharacterMarkerProps = {
  characterId: PanelCharacterId;
  bounds: MarkerBounds;
  emoji: string;
  placement?: MarkerPlacement;
  /** Hover name (cast label). */
  name?: string;
};

/**
 * Emoji cast marker — rasterized Noto bitmap with a crisp solid white outline
 * baked into the PNG. No wash overlay (it softened the outline into a glow).
 */
export function EmojiCharacterMarker({
  characterId,
  bounds,
  emoji,
  placement,
  name,
}: EmojiCharacterMarkerProps): ReactElement {
  const { cx, cy, size } = characterMarkerBox(bounds, characterId, placement);
  const fontSize = Math.max(14, size * EMOJI_GLYPH_SIZE_RATIO);
  const outlinePx = Math.max(2, Math.round(fontSize * EMOJI_MARKER_OUTLINE_RATIO));
  const imgSize = emojiPaintHalfExtent(size) * 2;
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHref(null);
    void rasterizeEmojiToDataUrlAsync(emoji, fontSize, undefined, { outlinePx }).then((url) => {
      if (!cancelled) setHref(url);
    });
    return () => {
      cancelled = true;
    };
  }, [emoji, fontSize, outlinePx]);

  const x = cx - imgSize / 2;
  const y = cy - imgSize / 2;

  return (
    <g
      className="comic-mockup-svg__character-marker comic-mockup-svg__character-marker--emoji"
      data-cast-name={name ?? undefined}
    >
      {name ? <title>{name}</title> : null}
      {href ? (
        <image
          href={href}
          x={x}
          y={y}
          width={imgSize}
          height={imgSize}
          preserveAspectRatio="xMidYMid meet"
          className="comic-mockup-svg__emoji-marker-base"
        />
      ) : (
        <text
          x={cx}
          y={cy + fontSize * 0.32}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily={EMOJI_FONT_STACK}
          stroke="#ffffff"
          strokeWidth={outlinePx * 2}
          paintOrder="stroke fill"
          className="comic-mockup-svg__emoji-marker-glyph"
        >
          {emoji}
        </text>
      )}
    </g>
  );
}
