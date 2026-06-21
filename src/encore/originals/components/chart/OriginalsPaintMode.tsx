import Box from '@mui/material/Box';
import type { ReactElement, ReactNode } from 'react';
import type { ChartLayout } from '../../../../shared/music/chordPro/chordChartLayout';
import type { ApplySectionProgressionResult } from '../../../../shared/music/chordPro/applySectionProgression';
import type { ChartPlaybackStep } from '../../../../shared/music/chordPro/chartPlaybackSequence';
import type { ChordNotationMode } from '../../../../shared/music/chordSymbolDisplay';
import type { ChordInteractionTarget, WordInteractionTarget } from '../../chartInteractionTypes';
import { OriginalsPaintLine } from './OriginalsPaintLine';
import { OriginalsPaintSectionHeading } from './OriginalsPaintSectionHeading';

export type OriginalsPaintModeProps = {
  layout: ChartLayout;
  songKey: string;
  notation: ChordNotationMode;
  armedChord: string | null;
  selectedChord: ChordInteractionTarget | null;
  selectedWord: WordInteractionTarget | null;
  activePlaybackStep: ChartPlaybackStep | null;
  scrollHeader?: ReactNode;
  onApplySectionProgression: (sectionId: string, progression: string) => ApplySectionProgressionResult;
  onStamp: (sectionId: string, lineId: string, charIndex: number) => void;
  onSelectChord: (sectionId: string, lineId: string, charIndex: number, chordId: string) => void;
  onSelectWord: (sectionId: string, lineId: string, charIndex: number) => void;
};

export function OriginalsPaintMode({
  layout,
  songKey,
  notation,
  armedChord,
  selectedChord,
  selectedWord,
  activePlaybackStep,
  scrollHeader,
  onApplySectionProgression,
  onStamp,
  onSelectChord,
  onSelectWord,
}: OriginalsPaintModeProps): ReactElement {
  return (
    <Box className="encore-originals-paint-mode">
      <Box className="encore-originals-paint-scroll-outer">
        {scrollHeader ? <Box className="encore-originals-paint-scroll-header">{scrollHeader}</Box> : null}
        <Box className="encore-originals-paint-scroll encore-originals-paint-scroll--columns">
        {layout.sections.map((section) => (
          <Box key={section.sectionId} className="encore-originals-paint-section">
            <OriginalsPaintSectionHeading section={section} onApply={onApplySectionProgression} />
            {section.lines.map((line) => (
              <OriginalsPaintLine
                key={line.lineId}
                line={line}
                songKey={songKey}
                notation={notation}
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
                onStamp={(charIndex) => onStamp(section.sectionId, line.lineId, charIndex)}
                onSelectChord={(charIndex, chordId) =>
                  onSelectChord(section.sectionId, line.lineId, charIndex, chordId)
                }
                onSelectWord={(charIndex) => onSelectWord(section.sectionId, line.lineId, charIndex)}
              />
            ))}
          </Box>
        ))}
        </Box>
      </Box>
    </Box>
  );
}
