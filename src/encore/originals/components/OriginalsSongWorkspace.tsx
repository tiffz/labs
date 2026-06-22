import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import {
  encoreSurfaceBandPadY,
  encoreSurfaceContentPad,
  encoreSurfacePadX,
} from '../../theme/encoreM3Layout';
import { encoreHairline, encoreRadius, encoreShadowSurface } from '../../theme/encoreUiTokens';
import { useOriginalsChordNotation } from '../hooks/useOriginalsChordNotation';
import { useOriginalsChartLayout } from '../hooks/useOriginalsChartLayout';
import {
  isStageComplete,
  toggleStageCompletion,
} from '../originalsWorkflowCompletion';
import { workflowStageCaption, workflowStageShortLabel, type OriginalsWorkflowStage } from '../originalsWorkflowStages';
import {
  persistWorkflowStage,
  readPersistedWorkflowStage,
} from '../originalsWorkflowStagePersistence';
import type { EncoreOriginalSong } from '../types';
import { OriginalsBrainstormStage } from './OriginalsBrainstormStage';
import { OriginalsChordPalette } from './chart/OriginalsChordPalette';
import { OriginalsChordsStageToolbar } from './OriginalsChordsStageToolbar';
import { OriginalsPaintChordsEditor } from './OriginalsPaintChordsEditor';
import { OriginalsTakesStage } from './OriginalsTakesStage';
import { OriginalsWorkflowStepper } from './OriginalsWorkflowStepper';
import { OriginalsWriteLyricsEditor } from './OriginalsWriteLyricsEditor';

export type OriginalsSongWorkspaceProps = {
  song: EncoreOriginalSong;
  /** When set (e.g. from view-mode section Edit), opens write workspace at this stage. */
  initialWorkflowStage?: OriginalsWorkflowStage;
  /** Chords stage: stepper + sticky chrome are direct children of the page scroll region. */
  integratedPageScroll?: boolean;
  /** Lyrics / brainstorm stages: workspace grows with content inside the page scroll region. */
  pageScrollIntegrated?: boolean;
  onWorkflowStageChange?: (stage: OriginalsWorkflowStage) => void;
  /** Flush pending chart/history autosave before switching workflow tabs. */
  onBeforeWorkflowStageChange?: () => void;
  onChartChange: (chordPro: string) => void;
  onSongChange: (patch: Partial<EncoreOriginalSong>) => void;
  onPersist: (next: EncoreOriginalSong) => void | Promise<void>;
};

export function OriginalsSongWorkspace({
  song,
  initialWorkflowStage,
  integratedPageScroll = false,
  pageScrollIntegrated = false,
  onWorkflowStageChange,
  onBeforeWorkflowStageChange,
  onChartChange,
  onSongChange,
  onPersist,
}: OriginalsSongWorkspaceProps): ReactElement {
  const theme = useTheme();
  const [stage, setStage] = useState<OriginalsWorkflowStage>(
    () => initialWorkflowStage ?? readPersistedWorkflowStage(song.id, song),
  );
  const [chartPasteSnack, setChartPasteSnack] = useState<string | null>(null);
  const { notation: chordNotation, setNotation: setChordNotation } = useOriginalsChordNotation(song.id);
  const [activePlaybackStep, setActivePlaybackStep] = useState<ChartPlaybackStep | null>(null);
  const chart = useOriginalsChartLayout(song.lyricsAndChords, onChartChange, song.key);

  useEffect(() => {
    if (initialWorkflowStage != null && initialWorkflowStage !== stage) {
      setStage(initialWorkflowStage);
    }
  }, [initialWorkflowStage, stage]);

  useEffect(() => {
    onWorkflowStageChange?.(stage);
  }, [onWorkflowStageChange, stage]);

  useEffect(() => {
    persistWorkflowStage(song.id, stage);
  }, [song.id, stage]);

  const handleArmChord = useCallback(
    (chord: string | null) => {
      if (chord && chart.selectedChord) {
        chart.onSwapChord(chart.selectedChord, chord);
        return;
      }
      if (chord && chart.selectedWord) {
        chart.onPlaceChord(chart.selectedWord, chord);
        return;
      }
      if (chord) {
        chart.setArmedChord(chord);
        chart.onClearSelection();
        return;
      }
      chart.setArmedChord(null);
    },
    [chart],
  );

  const onDeleteSelectedChord = useCallback(() => {
    const sel = chart.selectedChord;
    if (!sel) return;
    chart.onRemoveChord(sel.sectionId, sel.lineId, sel.chordId);
  }, [chart]);

  const onStageChange = useCallback(
    (next: OriginalsWorkflowStage) => {
      if (next !== stage) {
        if (stage === 'write') {
          chart.flushWriteReconcile();
        }
        onBeforeWorkflowStageChange?.();
      }
      setStage(next);
      if (next !== 'chords') {
        chart.setArmedChord(null);
        chart.onClearSelection();
      }
    },
    [chart, onBeforeWorkflowStageChange, stage],
  );

  const onImportPastedChart = useCallback(
    (raw: string) => {
      const result = chart.onImportPastedChart(raw);
      if (result.ok) {
        onStageChange('chords');
      }
      if (result.notifyUser) {
        setChartPasteSnack(result.message);
      }
      return result;
    },
    [chart, onStageChange],
  );

  const onPastePlainTextChart = useCallback(
    (raw: string) => onImportPastedChart(raw).ok,
    [onImportPastedChart],
  );

  useEffect(() => {
    const flush = chart.flushWriteReconcile;
    return () => {
      flush();
    };
  }, [chart.flushWriteReconcile]);

  const onToggleStageComplete = useCallback(() => {
    void onPersist(toggleStageCompletion(song, stage));
  }, [onPersist, song, stage]);

  const stageTitle = useMemo(() => workflowStageShortLabel(stage), [stage]);
  const stageCaption = useMemo(() => workflowStageCaption(stage), [stage]);
  const stageDone = isStageComplete(song, stage);
  const isBrainstorm = stage === 'brainstorm';
  const isChords = stage === 'chords';
  const isWrite = stage === 'write';
  const chordsIntegratedScroll = isChords && integratedPageScroll;
  const growsWithPageScroll = pageScrollIntegrated && !chordsIntegratedScroll;
  const showStageTitleBand = Boolean(stageCaption) || isBrainstorm;
  /** Chords keeps “Mark complete” on the stage toolbar only (saves a band of height). */
  const showMarkCompleteRow = !showStageTitleBand && !isChords;

  return (
    <Box
      className={[
        'encore-originals-workspace',
        isBrainstorm ? 'encore-originals-workspace--brainstorm' : '',
        isChords ? 'encore-originals-workspace--chords' : '',
        chordsIntegratedScroll ? 'encore-originals-workspace--chords-integrated' : '',
        isWrite ? 'encore-originals-workspace--write' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      sx={
        chordsIntegratedScroll
          ? { display: 'contents' }
          : growsWithPageScroll
            ? {
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: encoreRadius,
                border: 1,
                borderColor: encoreHairline,
                boxShadow: encoreShadowSurface,
                bgcolor: 'background.paper',
              }
            : {
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: encoreRadius,
                border: 1,
                borderColor: encoreHairline,
                boxShadow: encoreShadowSurface,
                bgcolor: 'background.paper',
                overflow: 'hidden',
              }
      }
    >
      {!isChords ? (
        <Box
          sx={{
            px: encoreSurfacePadX,
            py: { xs: 1, sm: 1.25 },
            borderBottom: 1,
            borderColor: encoreHairline,
            flexShrink: 0,
          }}
        >
          <OriginalsWorkflowStepper song={song} stage={stage} onStageChange={onStageChange} />
        </Box>
      ) : null}

      {showStageTitleBand ? (
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={3}
          sx={{
            px: encoreSurfacePadX,
            py: encoreSurfaceBandPadY,
            borderBottom: 1,
            borderColor: encoreHairline,
          }}
        >
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              {stageTitle}
            </Typography>
            {stageCaption ? (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, maxWidth: '40rem' }}>
                {stageCaption}
              </Typography>
            ) : null}
          </Stack>
          <Button
            size="small"
            variant="text"
            onClick={onToggleStageComplete}
            startIcon={stageDone ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
            sx={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              mt: 0.5,
              textTransform: 'none',
              fontWeight: 600,
              color: stageDone ? 'primary.main' : 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, stageDone ? 0.08 : 0.04),
              },
            }}
          >
            {stageDone ? 'Completed' : 'Mark complete'}
          </Button>
        </Stack>
      ) : showMarkCompleteRow ? (
        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{
            px: encoreSurfacePadX,
            py: 0.75,
            borderBottom: 1,
            borderColor: encoreHairline,
            flexShrink: 0,
          }}
        >
          <Button
            size="small"
            variant="text"
            onClick={onToggleStageComplete}
            startIcon={stageDone ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: stageDone ? 'primary.main' : 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, stageDone ? 0.08 : 0.04),
              },
            }}
          >
            {stageDone ? 'Completed' : 'Mark complete'}
          </Button>
        </Stack>
      ) : null}

      <Box
        className={[
          'encore-originals-workspace-content',
          isChords ? 'encore-originals-workspace-content--chords' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        sx={
          chordsIntegratedScroll
            ? { display: 'contents' }
            : growsWithPageScroll
              ? {
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  px: isBrainstorm || isChords ? 0 : encoreSurfaceContentPad,
                  py: isBrainstorm || isChords ? 0 : encoreSurfaceContentPad,
                }
              : {
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  px: isBrainstorm || isChords ? 0 : encoreSurfaceContentPad,
                  py: isBrainstorm || isChords ? 0 : encoreSurfaceContentPad,
                }
        }
      >
        {stage === 'brainstorm' ? (
          <OriginalsBrainstormStage
            song={song}
            onBrainstormHtmlChange={(brainstormHtml) => onSongChange({ brainstormHtml })}
            onSongChange={(next) => void onPersist(next)}
            onPastePlainTextChart={onPastePlainTextChart}
          />
        ) : stage === 'write' ? (
          <OriginalsWriteLyricsEditor
            value={chart.writeDocument}
            onChange={chart.onWriteChange}
            onImportPastedChart={onImportPastedChart}
            minRows={12}
            fillViewportHeight={!growsWithPageScroll}
          />
        ) : stage === 'chords' ? (
          <>
            <Box
              className="in-scroll-region__band encore-originals-chords-stepper-scroll encore-originals-no-print"
              sx={{
                px: encoreSurfacePadX,
                py: { xs: 0.9, sm: 1.15 },
                ...(chordsIntegratedScroll
                  ? {}
                  : {
                      borderBottom: 1,
                      borderColor: encoreHairline,
                    }),
              }}
            >
              <OriginalsWorkflowStepper song={song} stage={stage} onStageChange={onStageChange} />
            </Box>
            <Box
              className={[
                'in-scroll-region__sticky-surface',
                'encore-originals-chords-paint-chrome',
                'encore-originals-no-print',
              ].join(' ')}
            >
              <OriginalsChordsStageToolbar
                song={song}
                layout={chart.layout}
                stageDone={stageDone}
                onActivePlaybackStepChange={setActivePlaybackStep}
                onSongChange={onSongChange}
                onPersist={onPersist}
                onToggleStageComplete={onToggleStageComplete}
              />
              <OriginalsChordPalette
                songKey={song.key}
                armedChord={chart.armedChord}
                notation={chordNotation}
                selectedChord={chart.selectedChord}
                selectedWord={chart.selectedWord}
                onArm={handleArmChord}
                onNotationChange={setChordNotation}
                onClearSelection={chart.onClearSelection}
              />
            </Box>
            <Box className="encore-originals-chords-chart-surface">
              <OriginalsPaintChordsEditor
                layout={chart.layout}
                songKey={song.key}
                notation={chordNotation}
                armedChord={chart.armedChord}
                selectedChord={chart.selectedChord}
                selectedWord={chart.selectedWord}
                activePlaybackStep={activePlaybackStep}
                onArm={handleArmChord}
                onClearSelection={chart.onClearSelection}
                onStamp={chart.onStamp}
                onSelectChord={(sectionId, lineId, charIndex, chordId) =>
                  chart.onSelectChord({ sectionId, lineId, charIndex, chordId })
                }
                onSelectWord={(sectionId, lineId, charIndex) =>
                  chart.onSelectWord({ sectionId, lineId, charIndex })
                }
                onDeleteSelected={onDeleteSelectedChord}
                onApplySectionProgression={chart.onApplySectionProgression}
              />
            </Box>
          </>
        ) : (
          <OriginalsTakesStage
            song={song}
            onChange={(next) => void onPersist(next)}
            onOpenBrainstorm={() => onStageChange('brainstorm')}
          />
        )}
      </Box>
      <Snackbar
        open={Boolean(chartPasteSnack)}
        autoHideDuration={chartPasteSnack?.includes('left out') ? 7000 : 4500}
        message={chartPasteSnack ?? ''}
        onClose={() => setChartPasteSnack(null)}
      />
    </Box>
  );
}
