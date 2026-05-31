import type { RefObject } from 'react';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import SharedExportPopover from '../../shared/components/music/SharedExportPopover';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';

export type WordsScoreActionsBarProps = {
  actionsRef: RefObject<HTMLDivElement | null>;
  isStuck: boolean;
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
};

export default function WordsScoreActionsBar({
  actionsRef,
  isStuck,
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
}: WordsScoreActionsBarProps) {
  return (
    <div ref={actionsRef} className={`words-score-actions${isStuck ? ' is-stuck' : ''}`}>
      <div className="words-score-stats">
        <span>{scoreMeasureCount} measures</span>
        <span>~{estimatedSongDuration}</span>
      </div>
      <div className="words-score-zoom">
        <button
          className="words-button words-button-icon"
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out notation"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <span>{Math.round(scoreZoom * 100)}%</span>
        <button
          className="words-button words-button-icon"
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in notation"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
      <button ref={exportButtonRef} className="words-button" type="button" onClick={onToggleExportMenu}>
        export song
      </button>
      <AnchoredPopover
        open={exportMenuOpen}
        anchorEl={exportButtonRef.current}
        onClose={onCloseExportMenu}
        placement="bottom-end"
        paperClassName="words-dropdown-menu words-export-menu"
      >
        <div className="words-export-menu-list">
          <button type="button" className="words-button words-export-option" onClick={onCopyLyrics}>
            Copy lyrics
          </button>
          <button type="button" className="words-button words-export-option" onClick={onCopyAsciiChart}>
            Copy ASCII chord chart
          </button>
          <button type="button" className="words-button words-export-option" onClick={onDownloadPdf}>
            Download chord chart PDF
          </button>
          <button type="button" className="words-button words-export-option" onClick={onOpenSharedExport}>
            Export audio / MIDI…
          </button>
        </div>
      </AnchoredPopover>
      <SharedExportPopover
        open={sharedExportOpen}
        anchorEl={exportButtonRef.current}
        onClose={onCloseSharedExport}
        adapter={exportAdapter}
        persistKey="words"
      />
    </div>
  );
}
