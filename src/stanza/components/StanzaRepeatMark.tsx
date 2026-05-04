import { STANZA_SEGNO_GLYPH_PATH_D } from './stanzaSegnoGlyphPath';

const INK = '#1d1d1f';

type Props = {
  size?: number;
};

/**
 * Stanza mark for the app UI: segno glyph only (black on transparent) — matches minimal in-app typography.
 * Favicon / Labs directory use `public/icons/favicon-stanza.svg` (black on hot pink tile).
 */
export default function StanzaRepeatMark({ size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="stanza-repeat-mark">
      <path d={STANZA_SEGNO_GLYPH_PATH_D} fill={INK} style={{ userSelect: 'none' }} />
    </svg>
  );
}
