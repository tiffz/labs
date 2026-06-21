import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LooksOneOutlinedIcon from '@mui/icons-material/LooksOneOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import AppTooltip from '../../shared/components/AppTooltip';
import type { ZineboxReaderMode, ZineboxSpreadOffset } from '../types';
import { formatReaderPageCount, readerModeLabel, spreadNavigationState } from './pdfRender';

const READER_MODES: readonly ZineboxReaderMode[] = ['single', 'spread', 'scroll'];

const READER_MODE_ICONS = {
  single: ArticleOutlinedIcon,
  spread: MenuBookOutlinedIcon,
  scroll: ViewStreamOutlinedIcon,
} as const satisfies Record<ZineboxReaderMode, typeof ArticleOutlinedIcon>;

const READER_TOOLBAR_ICON_SX = { fontSize: 20 } as const;

type ReaderChromeProps = {
  title: string;
  mode: ZineboxReaderMode;
  spreadOffset: ZineboxSpreadOffset;
  currentPage: number;
  totalPages: number;
  wideSpreadPages: ReadonlySet<number>;
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
  wideSpreadPages,
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
        <ArrowBackIcon sx={READER_TOOLBAR_ICON_SX} />
      </IconButton>

      <div className="zinebox-reader__header-main">
        <span className="zinebox-reader__title">{title}</span>
        {totalPages > 0 ? (
          <span className="zinebox-reader__page-count" aria-live="polite">
            {formatReaderPageCount(mode, currentPage, totalPages, spreadOffset, wideSpreadPages)}
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
            const Icon = READER_MODE_ICONS[readerMode];
            return (
              <AppTooltip key={readerMode} title={readerModeLabel(readerMode)}>
                <ToggleButton
                  value={readerMode}
                  aria-label={readerModeLabel(readerMode)}
                  className="zinebox-reader__mode-btn"
                >
                  <Icon sx={READER_TOOLBAR_ICON_SX} />
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
              <LooksOneOutlinedIcon sx={READER_TOOLBAR_ICON_SX} />
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
  wideSpreadPages: ReadonlySet<number>;
  onPrev: () => void;
  onNext: () => void;
};

export function ReaderNavButtons({
  mode,
  spreadOffset,
  currentPage,
  totalPages,
  wideSpreadPages,
  onPrev,
  onNext,
}: ReaderNavButtonsProps): React.ReactElement | null {
  const canPage = mode !== 'scroll' && totalPages > 0;
  if (!canPage) return null;

  const { canPrev, canNext } =
    mode === 'spread'
      ? spreadNavigationState(currentPage, totalPages, spreadOffset, wideSpreadPages)
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
        <ChevronLeftIcon />
      </IconButton>
      <IconButton
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next page"
        className="zinebox-reader__nav zinebox-reader__nav--next"
        size="large"
      >
        <ChevronRightIcon />
      </IconButton>
    </div>
  );
}
