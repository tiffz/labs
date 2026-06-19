import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import AppTooltip from '../../shared/components/AppTooltip';
import type { ZineboxReaderMode, ZineboxSpreadOffset } from '../types';
import { formatReaderPageCount, readerModeLabel, spreadNavigationState } from './pdfRender';

const READER_MODES: readonly ZineboxReaderMode[] = ['single', 'spread', 'scroll'];

function readerModeIcon(mode: ZineboxReaderMode): string {
  switch (mode) {
    case 'single':
      return 'crop_portrait';
    case 'spread':
      return 'book_2';
    case 'scroll':
      return 'view_stream';
    default:
      return 'menu_book';
  }
}

type ReaderChromeProps = {
  title: string;
  mode: ZineboxReaderMode;
  spreadOffset: ZineboxSpreadOffset;
  currentPage: number;
  totalPages: number;
  onModeChange: (mode: ZineboxReaderMode) => void;
  onSpreadOffsetChange: (offset: ZineboxSpreadOffset) => void;
  onClose: () => void;
};

export default function ReaderChrome({
  title,
  mode,
  spreadOffset,
  currentPage,
  totalPages,
  onModeChange,
  onSpreadOffsetChange,
  onClose,
}: ReaderChromeProps): React.ReactElement {
  return (
    <header className="zinebox-reader__header">
      <IconButton
        onClick={onClose}
        aria-label="Back to library"
        className="zinebox-reader__back"
        size="small"
      >
        <span className="material-symbols-outlined" aria-hidden>
          arrow_back
        </span>
      </IconButton>

      <div className="zinebox-reader__header-main">
        <span className="zinebox-reader__title">{title}</span>
        {totalPages > 0 ? (
          <span className="zinebox-reader__page-count" aria-live="polite">
            {formatReaderPageCount(mode, currentPage, totalPages, spreadOffset)}
          </span>
        ) : null}
      </div>

      <div className="zinebox-reader__toolbar">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_e, value: ZineboxReaderMode | null) => {
            if (value) onModeChange(value);
          }}
          aria-label="Reading mode"
          className="zinebox-reader__mode-toggle"
        >
          {READER_MODES.map((readerMode) => {
            const selected = mode === readerMode;
            return (
              <AppTooltip key={readerMode} title={readerModeLabel(readerMode)}>
                <ToggleButton
                  value={readerMode}
                  aria-label={readerModeLabel(readerMode)}
                  className={`zinebox-reader__mode-btn${selected ? ' zinebox-reader__mode-btn--selected' : ''}`}
                >
                  <span
                    className={`material-symbols-outlined zinebox-reader__mode-icon${selected ? ' zinebox-reader__mode-icon--selected' : ''}`}
                    aria-hidden
                  >
                    {readerModeIcon(readerMode)}
                  </span>
                </ToggleButton>
              </AppTooltip>
            );
          })}
        </ToggleButtonGroup>

        {mode === 'spread' ? (
          <AppTooltip title="Offset first page (cover alone on the right)">
            <IconButton
              size="small"
              aria-label="Offset first page"
              aria-pressed={spreadOffset === 1}
              onClick={() => onSpreadOffsetChange(spreadOffset === 1 ? 0 : 1)}
              className={
                spreadOffset === 1
                  ? 'zinebox-reader__spread-offset-btn zinebox-reader__spread-offset-btn--active'
                  : 'zinebox-reader__spread-offset-btn'
              }
            >
              <span className="material-symbols-outlined zinebox-reader__mode-icon" aria-hidden>
                looks_one
              </span>
            </IconButton>
          </AppTooltip>
        ) : null}
      </div>
    </header>
  );
}

type ReaderNavButtonsProps = {
  mode: ZineboxReaderMode;
  spreadOffset: ZineboxSpreadOffset;
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export function ReaderNavButtons({
  mode,
  spreadOffset,
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: ReaderNavButtonsProps): React.ReactElement | null {
  const canPage = mode !== 'scroll' && totalPages > 0;
  if (!canPage) return null;

  const { canPrev, canNext } =
    mode === 'spread'
      ? spreadNavigationState(currentPage, totalPages, spreadOffset)
      : { canPrev: currentPage > 1, canNext: currentPage < totalPages };

  return (
    <div className="zinebox-reader__nav-layer">
      <IconButton
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous page"
        className="zinebox-reader__nav zinebox-reader__nav--prev"
        size="large"
      >
        <span className="material-symbols-outlined" aria-hidden>
          chevron_left
        </span>
      </IconButton>
      <IconButton
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next page"
        className="zinebox-reader__nav zinebox-reader__nav--next"
        size="large"
      >
        <span className="material-symbols-outlined" aria-hidden>
          chevron_right
        </span>
      </IconButton>
    </div>
  );
}
