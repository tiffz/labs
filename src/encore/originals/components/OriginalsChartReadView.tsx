import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState, useEffect, type ReactElement } from 'react';
import { parseChordProToChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import {
  estimateChartPlaybackDurationMs,
  formatChartPlaybackDuration,
} from '../../../shared/music/chordPro/chartPlaybackSequence';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import type { SectionPlaybackOverride } from '../../../shared/music/resolveSectionPlaybackSettings';
import { encoreSurfacePadX } from '../../theme/encoreM3Layout';
import { EncoreBpmChip } from '../../ui/EncoreBpmChip';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import { EncoreTimeSignatureChip } from '../../ui/EncoreTimeSignatureChip';
import { chartLayoutHasPaintedChords } from '../originalsChartLayoutHelpers';
import { originalsLyricsChartTexts } from '../originalsLyricsChartTexts';
import { useOriginalsChordNotation } from '../hooks/useOriginalsChordNotation';
import { OriginalsPaintMode } from './chart/OriginalsPaintMode';
import { OriginalsChordPaletteNotationToggle } from './chart/OriginalsChordPaletteNotationToggle';
import { OriginalsChartPlaybackProvider } from '../context/OriginalsChartPlaybackContext';
import { OriginalsChordPlaybackBar } from './OriginalsChordPlaybackBar';

const ORIGINALS_CHORD_PLAYBACK_STORAGE_KEY = 'encore-originals-chord-playback-settings';
const META_CHIP_CLASS = 'encore-originals-meta-chip';
const READ_ONLY_TIME_SIGNATURE = { numerator: 4, denominator: 4 } as const;

export type OriginalsChartReadViewProps = {
  lyricsAndChords: string;
  songId: string;
  songKey: string;
  tempo: number;
  sectionPlaybackOverrides?: Record<string, SectionPlaybackOverride>;
  /** Smaller play/settings controls for dashboard embeds. */
  compactPlayback?: boolean;
  /** Dashboard/detail embed — single-column chart, contained width. */
  embedded?: boolean;
  /** Song dashboard grid — lyrics region fills available viewport height. */
  dashboardLayout?: boolean;
  /** Skip nested card chrome when parent section already owns the surface (defaults to `embedded`). */
  flatChrome?: boolean;
  /** Notifies parent when the Show chords toggle changes (for smart Edit routing). */
  onShowChordsChange?: (showChords: boolean) => void;
};

type OriginalsChartReadMetaProps = {
  songKey: string;
  tempo: number;
  layout: ReturnType<typeof parseChordProToChartLayout>;
};

function OriginalsChartReadMeta({ songKey, tempo, layout }: OriginalsChartReadMetaProps): ReactElement {
  const playbackDurationLabel = useMemo(() => {
    const durationMs = estimateChartPlaybackDurationMs(layout, tempo);
    if (durationMs <= 0) return null;
    return formatChartPlaybackDuration(durationMs);
  }, [layout, tempo]);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      className="encore-originals-chords-meta"
      sx={{
        alignItems: "center",
        flexWrap: "nowrap"
      }}>
      <EncoreKeyChip
        value={songKey}
        placeholder="Key"
        displayMode="compact"
        disabled
        onChange={() => {}}
        className={META_CHIP_CLASS}
      />
      <EncoreTimeSignatureChip
        value={READ_ONLY_TIME_SIGNATURE}
        disabled
        onChange={() => {}}
        className={META_CHIP_CLASS}
      />
      <EncoreBpmChip
        value={tempo}
        disabled
        min={40}
        max={200}
        onChange={() => {}}
        className={META_CHIP_CLASS}
      />
      {playbackDurationLabel ? (
        <Tooltip title="Estimated chord playback length">
          <Typography
            component="span"
            variant="body2"
            className="encore-originals-playback-duration"
            sx={{
              color: "text.secondary",
              fontSize: '0.8125rem',
              fontWeight: 600,
              lineHeight: '30px',
              flexShrink: 0
            }}>
            ~{playbackDurationLabel}
          </Typography>
        </Tooltip>
      ) : null}
    </Stack>
  );
}

function ShowChordsToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <FormControlLabel
      control={
        <Checkbox size="small" checked={checked} onChange={(_, next) => onChange(next)} />
      }
      label={
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Show chords
        </Typography>
      }
      sx={{ m: 0, alignItems: 'center', gap: 0.5 }}
    />
  );
}

/** Read-only styled chord chart with playback — same paint rendering as the chords editor. */
export function OriginalsChartReadView({
  lyricsAndChords,
  songId,
  songKey,
  tempo,
  sectionPlaybackOverrides,
  compactPlayback = false,
  embedded = false,
  dashboardLayout = false,
  flatChrome,
  onShowChordsChange,
}: OriginalsChartReadViewProps): ReactElement | null {
  const useFlatChrome = flatChrome ?? embedded;
  const layout = useMemo(() => parseChordProToChartLayout(lyricsAndChords), [lyricsAndChords]);
  const hasPaintedChords = useMemo(() => chartLayoutHasPaintedChords(layout), [layout]);
  const { lyrics } = useMemo(() => originalsLyricsChartTexts(lyricsAndChords), [lyricsAndChords]);
  const [showChords, setShowChords] = useState(hasPaintedChords);
  const [activePlaybackStep, setActivePlaybackStep] = useState<ChartPlaybackStep | null>(null);
  const { notation, setNotation } = useOriginalsChordNotation(songId);

  useEffect(() => {
    setShowChords(hasPaintedChords);
  }, [hasPaintedChords, songId]);

  useEffect(() => {
    onShowChordsChange?.(showChords);
  }, [onShowChordsChange, showChords]);

  if (!lyrics && !hasPaintedChords) return null;

  const showStyledChart = showChords && hasPaintedChords;

  const plainLyrics = (
    <Typography
      component="pre"
      variant="body1"
      sx={{
        whiteSpace: 'pre-wrap',
        m: 0,
        lineHeight: 1.65,
        color: 'text.primary',
      }}
    >
      {lyrics}
    </Typography>
  );

  if (!hasPaintedChords) {
    return plainLyrics;
  }

  return (
    <OriginalsChartPlaybackProvider
      layout={layout}
      tempo={tempo}
      storageKey={ORIGINALS_CHORD_PLAYBACK_STORAGE_KEY}
      sectionPlaybackOverrides={sectionPlaybackOverrides}
      onActiveStepChange={setActivePlaybackStep}
    >
      {showStyledChart ? (
        <Box
          className={[
            'encore-originals-chart-read-chrome',
            'encore-originals-chart-chrome--flat',
            'encore-originals-no-print',
            embedded ? 'encore-originals-chart-read-chrome--embedded' : '',
            useFlatChrome ? 'encore-originals-chart-read-chrome--flat' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Stack
            direction="row"
            className="encore-originals-chords-toolbar"
            sx={{
              alignItems: "center",
              flexWrap: "wrap",
              flexShrink: 0,
              px: encoreSurfacePadX,
              py: 0.55,
              gap: 0.75,
              rowGap: 0.4
            }}>
            <OriginalsChartReadMeta songKey={songKey} tempo={tempo} layout={layout} />
            <OriginalsChordPlaybackBar
              layout={layout}
              tempo={tempo}
              sectionPlaybackOverrides={sectionPlaybackOverrides}
              compact={compactPlayback}
              onActiveStepChange={setActivePlaybackStep}
            />
          </Stack>
          <Box className="encore-originals-chord-palette encore-originals-chart-read-display-strip">
            <Box className="encore-originals-chord-palette-flow" role="toolbar" aria-label="Chart display">
              <Box className="encore-originals-chord-palette-pick">
                <ShowChordsToggle checked={showChords} onChange={setShowChords} />
              </Box>
              <Box className="encore-originals-chord-palette-display" role="group" aria-label="Chord display">
                <Box component="span" className="encore-originals-chord-palette-display-label">
                  Show
                </Box>
                <OriginalsChordPaletteNotationToggle notation={notation} onNotationChange={setNotation} />
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box className="encore-originals-chart-read-chords-off encore-originals-no-print">
          <ShowChordsToggle checked={showChords} onChange={setShowChords} />
        </Box>
      )}
      {showStyledChart ? (
        <Box
          className={[
            'encore-originals-chords-chart-surface',
            'encore-originals-chart-read-view',
            embedded ? 'encore-originals-chart-read-view--embedded' : '',
            dashboardLayout ? 'encore-originals-chart-read-view--dashboard' : '',
            useFlatChrome ? 'encore-originals-chart-read-view--flat encore-originals-chart-surface--flat' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <OriginalsPaintMode
            readOnly
            layout={layout}
            songKey={songKey}
            notation={notation}
            tempo={tempo}
            timeSignature={READ_ONLY_TIME_SIGNATURE}
            sectionPlaybackOverrides={sectionPlaybackOverrides}
            activePlaybackStep={activePlaybackStep}
          />
        </Box>
      ) : (
        plainLyrics
      )}
    </OriginalsChartPlaybackProvider>
  );
}
