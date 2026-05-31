import type { RefObject } from 'react';
import type { Key } from '../../shared/music/chordTypes';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import VexLyricScore from './VexLyricScore';
import WordsScoreActionsBar from './WordsScoreActionsBar';
import type { NotationSectionBlock } from '../utils/wordsChordExportText';

export type WordsNotationPanelProps = {
  notationScrollRef: RefObject<HTMLElement | null>;
  scoreActionsRef: RefObject<HTMLDivElement | null>;
  isScoreActionsStuck: boolean;
  scoreMeasureCount: number;
  estimatedSongDuration: string;
  scoreZoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  exportMenuOpen: boolean;
  onToggleExportMenu: () => void;
  onCloseExportMenu: () => void;
  onCopyLyrics: () => void;
  onCopyAsciiChart: () => void;
  onDownloadPdf: () => void;
  onOpenSharedExport: () => void;
  sharedExportOpen: boolean;
  onCloseSharedExport: () => void;
  exportAdapter: ExportSourceAdapter;
  notationSectionBlocks: NotationSectionBlock[];
  notationSectionRefs: RefObject<Map<string, HTMLElement>>;
  timeSignature: TimeSignature;
  songKey: Key;
  metronomeEnabled: boolean;
  autoFollowPlayback: boolean;
  isPlaying: boolean;
  playbackScrollContainer: HTMLElement | null;
  notation: string;
  darbukaEditUrl: string;
};

export default function WordsNotationPanel({
  notationScrollRef,
  scoreActionsRef,
  isScoreActionsStuck,
  scoreMeasureCount,
  estimatedSongDuration,
  scoreZoom,
  onZoomOut,
  onZoomIn,
  exportButtonRef,
  exportMenuOpen,
  onToggleExportMenu,
  onCloseExportMenu,
  onCopyLyrics,
  onCopyAsciiChart,
  onDownloadPdf,
  onOpenSharedExport,
  sharedExportOpen,
  onCloseSharedExport,
  exportAdapter,
  notationSectionBlocks,
  notationSectionRefs,
  timeSignature,
  songKey,
  metronomeEnabled,
  autoFollowPlayback,
  isPlaying,
  playbackScrollContainer,
  notation,
  darbukaEditUrl,
}: WordsNotationPanelProps) {
  return (
    <article className="words-rhythm-card" ref={notationScrollRef}>
      <WordsScoreActionsBar
        actionsRef={scoreActionsRef}
        isStuck={isScoreActionsStuck}
        scoreMeasureCount={scoreMeasureCount}
        estimatedSongDuration={estimatedSongDuration}
        scoreZoom={scoreZoom}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        exportButtonRef={exportButtonRef}
        exportMenuOpen={exportMenuOpen}
        onToggleExportMenu={onToggleExportMenu}
        onCloseExportMenu={onCloseExportMenu}
        onCopyLyrics={onCopyLyrics}
        onCopyAsciiChart={onCopyAsciiChart}
        onDownloadPdf={onDownloadPdf}
        onOpenSharedExport={onOpenSharedExport}
        sharedExportOpen={sharedExportOpen}
        onCloseSharedExport={onCloseSharedExport}
        exportAdapter={exportAdapter}
      />
      <div className="words-notation-sections">
        {notationSectionBlocks.map((block) => (
          <section
            key={block.id}
            className={`words-notation-section${
              block.isLoopActive ? ' is-active' : ''
            }`}
            ref={(element) => {
              if (element) notationSectionRefs.current.set(block.id, element);
              else notationSectionRefs.current.delete(block.id);
            }}
          >
            <h3 className="words-notation-section-title">{block.title}</h3>
            <VexLyricScore
              rhythm={block.rhythm}
              timeSignature={timeSignature}
              chordKey={songKey}
              measureNumberOffset={block.measureNumberOffset}
              showMeasureNumbers={block.showMeasureNumbers}
              currentNote={block.localCurrentNote}
              currentMetronomeBeat={block.localCurrentMetronomeBeat}
              metronomeEnabled={metronomeEnabled}
              chordLabelsByMeasure={block.localChordLabelsByMeasure}
              chordStyleByMeasure={block.localChordStyleByMeasure}
              activeChordMeasure={block.localActiveChordMeasure}
              sectionMarkers={[]}
              hitMap={block.localHitMap}
              autoFollowPlayback={autoFollowPlayback}
              isPlaying={isPlaying}
              zoomLevel={scoreZoom}
              scrollContainer={playbackScrollContainer}
            />
          </section>
        ))}
      </div>

      <div className="word-rhythm-output">
        <strong>Notation:</strong> <code>{notation || '(empty)'}</code>{' '}
        <a
          className="words-edit-link"
          href={darbukaEditUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Edit in Darbuka Trainer
        </a>
      </div>
    </article>
  );
}
