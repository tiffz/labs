import Box from '@mui/material/Box';
import type { ReactElement, ReactNode } from 'react';
import type { ChartLayout } from '../../../../shared/music/chordPro/chordChartLayout';
import type { ApplySectionProgressionResult } from '../../../../shared/music/chordPro/applySectionProgression';
import type { ChartPlaybackStep } from '../../../../shared/music/chordPro/chartPlaybackSequence';
import type { ChordNotationMode } from '../../../../shared/music/chordSymbolDisplay';
import type { TimeSignature } from '../../../../shared/rhythm/types';
import type { OriginalsSectionPlaybackOverride } from '../../sectionPlaybackOverrides';
import type { ChordInteractionTarget, WordInteractionTarget } from '../../chartInteractionTypes';
import { OriginalsPaintLine } from './OriginalsPaintLine';
import { OriginalsPaintSectionHeading } from './OriginalsPaintSectionHeading';
import { useOptionalOriginalsChartPlayback } from '../../context/useOriginalsChartPlayback';

export type OriginalsPaintModeProps = {
  layout: ChartLayout;
  songKey: string;
  notation: ChordNotationMode;
  readOnly?: boolean;
  armedChord?: string | null;
  selectedChord?: ChordInteractionTarget | null;
  selectedWord?: WordInteractionTarget | null;
  activePlaybackStep: ChartPlaybackStep | null;
  tempo: number;
  timeSignature: TimeSignature;
  sectionPlaybackOverrides?: Record<string, OriginalsSectionPlaybackOverride>;
  scrollHeader?: ReactNode;
  onApplySectionProgression?: (sectionId: string, progression: string) => ApplySectionProgressionResult;
  onSectionPlaybackOverrideChange?: (
    sectionId: string,
    override: OriginalsSectionPlaybackOverride | null,
  ) => void;
  onStamp?: (sectionId: string, lineId: string, charIndex: number) => void;
  onSelectChord?: (sectionId: string, lineId: string, charIndex: number, chordId: string) => void;
  onSelectWord?: (sectionId: string, lineId: string, charIndex: number) => void;
};

export function OriginalsPaintMode({
  layout,
  songKey,
  notation,
  readOnly = false,
  armedChord = null,
  selectedChord = null,
  selectedWord = null,
  activePlaybackStep,
  tempo,
  timeSignature,
  sectionPlaybackOverrides,
  scrollHeader,
  onApplySectionProgression,
  onSectionPlaybackOverrideChange,
  onStamp,
  onSelectChord,
  onSelectWord,
}: OriginalsPaintModeProps): ReactElement {
  const chartPlayback = useOptionalOriginalsChartPlayback();

  return (
    <Box className={['encore-originals-paint-mode', readOnly ? 'encore-originals-paint-mode--read-only' : ''].filter(Boolean).join(' ')}>
      <Box className="encore-originals-paint-scroll-outer">
        {scrollHeader ? <Box className="encore-originals-paint-scroll-header">{scrollHeader}</Box> : null}
        <Box className="encore-originals-paint-scroll encore-originals-paint-scroll--columns">
        {layout.sections.map((section) => (
          <Box
            key={section.sectionId}
            className={[
              'encore-originals-paint-section',
              chartPlayback?.playingSectionId === section.sectionId ? 'is-section-looping' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <OriginalsPaintSectionHeading
              section={section}
              layout={layout}
              readOnly={readOnly}
              tempo={tempo}
              timeSignature={timeSignature}
              sectionPlaybackOverride={sectionPlaybackOverrides?.[section.sectionId]}
              onApply={onApplySectionProgression}
              onSectionPlaybackOverrideChange={onSectionPlaybackOverrideChange}
            />
            {section.lines.map((line) => (
              <OriginalsPaintLine
                key={line.lineId}
                line={line}
                songKey={songKey}
                notation={notation}
                readOnly={readOnly}
                armedChord={armedChord}
                activePlaybackStep={
                  activePlaybackStep?.sectionId === section.sectionId &&
                  activePlaybackStep.lineId === line.lineId
                    ? activePlaybackStep
                    : null
                }
                selectedChordId={
                  selectedChord?.sectionId === section.sectionId && selectedChord.lineId === line.lineId
                    ? selectedChord.chordId
                    : null
                }
                selectedWordCharIndex={
                  selectedWord?.sectionId === section.sectionId && selectedWord.lineId === line.lineId
                    ? selectedWord.charIndex
                    : null
                }
                onStamp={onStamp ? (charIndex) => onStamp(section.sectionId, line.lineId, charIndex) : undefined}
                onSelectChord={
                  onSelectChord
                    ? (charIndex, chordId) => onSelectChord(section.sectionId, line.lineId, charIndex, chordId)
                    : undefined
                }
                onSelectWord={
                  onSelectWord ? (charIndex) => onSelectWord(section.sectionId, line.lineId, charIndex) : undefined
                }
              />
            ))}
          </Box>
        ))}
        </Box>
      </Box>
    </Box>
  );
}
