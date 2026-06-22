import Box from '@mui/material/Box';
import type { ReactElement } from 'react';
import type { ChordMarker, LyricLine } from '../../../../shared/music/chordPro/chordChartLayout';
import { groupChordsByTokenStart, tokenizeLyricLine } from '../../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../../shared/music/chordPro/chartPlaybackSequence';
import type { ChordNotationMode } from '../../../../shared/music/chordSymbolDisplay';
import { formatChordForDisplay } from '../../../../shared/music/chordSymbolDisplay';

export type OriginalsPaintLineProps = {
  line: LyricLine;
  songKey: string;
  notation: ChordNotationMode;
  readOnly?: boolean;
  armedChord?: string | null;
  activePlaybackStep: ChartPlaybackStep | null;
  selectedChordId?: string | null;
  selectedWordCharIndex?: number | null;
  onStamp?: (charIndex: number) => void;
  onSelectChord?: (charIndex: number, chordId: string) => void;
  onSelectWord?: (charIndex: number) => void;
};

function tokenIsHighlighted(charIndex: number, step: ChartPlaybackStep | null): boolean {
  if (!step || step.lyricHighlightEnd <= step.lyricHighlightStart) return false;
  return charIndex >= step.lyricHighlightStart && charIndex < step.lyricHighlightEnd;
}

function ChordSlot({
  chords,
  songKey,
  notation,
  readOnly,
  activePlaybackStep,
  selectedChordId,
  onSelectChord,
}: {
  chords: ChordMarker[];
  songKey: string;
  notation: ChordNotationMode;
  readOnly?: boolean;
  activePlaybackStep: ChartPlaybackStep | null;
  selectedChordId: string | null;
  onSelectChord?: (charIndex: number, chordId: string) => void;
}): ReactElement {
  if (chords.length === 0) {
    return <Box component="span" sx={{ display: 'inline-block', height: '1.25rem' }} />;
  }
  return (
    <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.25, alignItems: 'flex-end' }}>
      {chords.map((chord) => (
        <ChordBadge
          key={chord.id}
          chord={chord}
          songKey={songKey}
          notation={notation}
          readOnly={readOnly}
          isPlaying={activePlaybackStep?.markerId === chord.id}
          isSelected={selectedChordId === chord.id}
          onSelect={() => onSelectChord?.(chord.charIndex, chord.id)}
        />
      ))}
    </Box>
  );
}

function ChordBadge({
  chord,
  songKey,
  notation,
  readOnly = false,
  isPlaying,
  isSelected,
  onSelect,
}: {
  chord: ChordMarker;
  songKey: string;
  notation: ChordNotationMode;
  readOnly?: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  onSelect?: () => void;
}): ReactElement {
  const label = formatChordForDisplay(chord.chordName, songKey, notation);
  const className = [
    'encore-originals-chord-badge',
    isPlaying ? 'encore-originals-chord-badge--playing' : '',
    isSelected ? 'encore-originals-chord-badge--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (readOnly) {
    return (
      <span className={className} aria-label={`Chord ${label}`}>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={`Chord ${label}. Click to select.`}
      aria-pressed={isSelected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {label}
    </button>
  );
}

export function OriginalsPaintLine({
  line,
  songKey,
  notation,
  readOnly = false,
  armedChord = null,
  activePlaybackStep,
  selectedChordId = null,
  selectedWordCharIndex = null,
  onStamp,
  onSelectChord,
  onSelectWord,
}: OriginalsPaintLineProps): ReactElement {
  const tokens = tokenizeLyricLine(line.text);
  const chordMap = groupChordsByTokenStart(line);
  const hasChordSelection = !readOnly && selectedChordId !== null;

  if (!line.text.trim()) {
    if (line.chords.length === 0) {
      return (
        <Box className="encore-originals-paint-line encore-originals-paint-line--empty" sx={{ minHeight: 14, mb: 0.5 }} />
      );
    }
    const sorted = [...line.chords].sort((a, b) => a.charIndex - b.charIndex);
    return (
      <Box className="encore-originals-paint-line encore-originals-paint-line--chords-only" sx={{ mb: 0.75 }}>
        <Box className="encore-originals-chord-rail" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {sorted.map((chord) => (
            <ChordBadge
              key={chord.id}
              chord={chord}
              songKey={songKey}
              notation={notation}
              readOnly={readOnly}
              isPlaying={activePlaybackStep?.markerId === chord.id}
              isSelected={selectedChordId === chord.id}
              onSelect={() => onSelectChord?.(chord.charIndex, chord.id)}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box className="encore-originals-paint-line">
      <Box className="encore-originals-chord-rail" aria-hidden={tokens.length === 0}>
        {tokens.map((tok) => {
          const chords = chordMap.get(tok.start) ?? [];
          return (
            <Box
              key={`rail-${tok.start}`}
              component="span"
              className="encore-originals-chord-slot"
              sx={{ display: 'inline-block', minWidth: `${Math.max(tok.token.length, 1)}ch`, textAlign: 'left' }}
            >
              <ChordSlot
                chords={chords}
                songKey={songKey}
                notation={notation}
                readOnly={readOnly}
                activePlaybackStep={activePlaybackStep}
                selectedChordId={selectedChordId}
                onSelectChord={onSelectChord}
              />
            </Box>
          );
        })}
      </Box>
      <Box className="encore-originals-text-rail">
        {tokens.map((tok) => {
          const isWhitespace = /^\s+$/.test(tok.token);
          const hasChord = (chordMap.get(tok.start) ?? []).length > 0;
          if (isWhitespace) {
            return (
              <Box key={`t-${tok.start}`} component="span" sx={{ whiteSpace: 'pre' }}>
                {tok.token}
              </Box>
            );
          }
          const isPlayback = tokenIsHighlighted(tok.start, activePlaybackStep);
          const isMoveTarget = hasChordSelection && !armedChord;
          const isWordSelected = !readOnly && selectedWordCharIndex === tok.start;
          const tokenClassName =
            isMoveTarget
              ? 'encore-originals-lyric-token encore-originals-lyric-token--move'
              : isWordSelected
                ? 'encore-originals-lyric-token encore-originals-lyric-token--word-selected'
                : isPlayback
                  ? 'encore-originals-lyric-token encore-originals-lyric-token--playback'
                  : armedChord
                    ? 'encore-originals-lyric-token encore-originals-lyric-token--armed'
                    : 'encore-originals-lyric-token';

          if (readOnly) {
            return (
              <Box
                key={`t-${tok.start}`}
                component="span"
                className={tokenClassName}
                sx={{
                  background: hasChord ? 'rgba(236, 72, 153, 0.08)' : 'transparent',
                  borderRadius: 0.5,
                }}
              >
                {tok.token}
              </Box>
            );
          }

          return (
            <Box
              key={`t-${tok.start}`}
              component="button"
              type="button"
              className={tokenClassName}
              sx={{
                border: 0,
                background: hasChord ? 'rgba(236, 72, 153, 0.08)' : 'transparent',
                cursor: armedChord || hasChordSelection ? 'copy' : 'pointer',
                font: 'inherit',
                p: 0,
                borderRadius: 0.5,
              }}
              onClick={() => {
                if (armedChord || hasChordSelection) {
                  onStamp?.(tok.start);
                  return;
                }
                onSelectWord?.(tok.start);
              }}
            >
              {tok.token}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
