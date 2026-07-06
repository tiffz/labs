import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Box from '@mui/material/Box';

export type StanzaPlaybackTransformChipProps = {
  label: string;
  /** When true, chip uses accent styling and may show a direction arrow. */
  shifted: boolean;
  direction?: 'up' | 'down';
  /** Smaller rail chip — full detail belongs in the tooltip. */
  compact?: boolean;
};

/** Beat-style pill for logical playback BPM / key after speed or transpose transforms. */
export default function StanzaPlaybackTransformChip({
  label,
  shifted,
  direction,
  compact = false,
}: StanzaPlaybackTransformChipProps): React.ReactElement {
  return (
    <Box
      component="span"
      className={[
        'stanza-playback-transform-chip',
        shifted ? 'stanza-playback-transform-chip--shifted' : '',
        compact ? 'stanza-playback-transform-chip--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {shifted && direction ? (
        direction === 'up' ? (
          <ArrowUpwardIcon
            className="stanza-playback-transform-chip__arrow stanza-playback-transform-chip__arrow--up"
            aria-hidden
          />
        ) : (
          <ArrowDownwardIcon
            className="stanza-playback-transform-chip__arrow stanza-playback-transform-chip__arrow--down"
            aria-hidden
          />
        )
      ) : null}
      {label}
    </Box>
  );
}
