import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import { useRef, useState, type ReactElement } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';
import type { ScrapboardBoardState } from '../hooks/useScrapboardBoard';

export type ScrapboardToolbarProps = {
  board: ScrapboardBoardState;
  onExportPng: () => void;
  onRandomizePalette?: () => void;
};

/**
 * Header chrome: panel count, randomize-all, overflow (expert toggles), Export primary.
 */
export function ScrapboardToolbar({
  board,
  onExportPng,
  onRandomizePalette,
}: ScrapboardToolbarProps): ReactElement {
  const {
    panelCount,
    setPanelCount,
    randomizeText,
    randomizeAll,
    randomizeLocks,
    toggleRandomizeLock,
    allowFullBleedLayouts,
    setAllowFullBleedLayouts,
    allowBubbleEscape,
    setAllowBubbleEscape,
  } = board;

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="scrapboard-toolbar" data-testid="scrapboard-toolbar">
      <div className="scrapboard-toolbar__group">
        <span className="scrapboard-toolbar__label">Panels</span>
        <div className="scrapboard-stepper" data-testid="scrapboard-panel-count">
          <button
            type="button"
            className="scrapboard-stepper__btn"
            aria-label="Fewer panels"
            disabled={panelCount <= 1}
            onClick={() => setPanelCount(panelCount - 1)}
          >
            <RemoveOutlinedIcon fontSize="small" />
          </button>
          <span className="scrapboard-stepper__value">{panelCount}</span>
          <button
            type="button"
            className="scrapboard-stepper__btn"
            aria-label="More panels"
            disabled={panelCount >= 12}
            onClick={() => setPanelCount(panelCount + 1)}
          >
            <AddOutlinedIcon fontSize="small" />
          </button>
        </div>
      </div>

      <div className="scrapboard-toolbar__group scrapboard-toolbar__group--actions">
        <AppTooltip title="Randomize all unlocked sections">
          <button
            type="button"
            className="scrapboard-btn scrapboard-btn--ghost scrapboard-btn--icon"
            data-testid="scrapboard-randomize-all"
            onClick={() => randomizeAll({ randomizePalette: onRandomizePalette })}
          >
            <DiceIcon variant="multiple" size={18} />
            Randomize all
          </button>
        </AppTooltip>

        <AppTooltip title="Randomize page copy only">
          <button
            type="button"
            className="scrapboard-btn scrapboard-btn--ghost scrapboard-btn--icon"
            data-testid="scrapboard-randomize-text"
            disabled={randomizeLocks.copy}
            onClick={() => randomizeText()}
          >
            <DiceIcon variant="single" size={16} />
            Randomize copy
          </button>
        </AppTooltip>

        <button
          ref={moreRef}
          type="button"
          className="scrapboard-btn scrapboard-btn--ghost scrapboard-btn--icon"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          data-testid="scrapboard-more-menu"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <MoreHorizOutlinedIcon fontSize="small" />
          More
        </button>

        <button
          type="button"
          className="scrapboard-btn scrapboard-btn--primary scrapboard-btn--icon"
          onClick={onExportPng}
          data-testid="scrapboard-export-png"
        >
          <DownloadOutlinedIcon fontSize="small" />
          Export PNG
        </button>
      </div>

      <AnchoredPopover
        open={moreOpen}
        anchorEl={moreRef.current}
        onClose={() => setMoreOpen(false)}
        placement="bottom-end"
        paperClassName="scrapboard-popover scrapboard-toolbar__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={8}
        transitionDuration={0}
      >
        <div role="menu" className="scrapboard-toolbar__menu-body scrapboard-toolbar__menu-body--more">
          <label className="scrapboard-sketch-toggle">
            <input
              type="checkbox"
              className="scrapboard-sketch-toggle__input"
              checked={allowFullBleedLayouts}
              onChange={(e) => setAllowFullBleedLayouts(e.target.checked)}
              data-testid="scrapboard-full-bleed-toggle"
            />
            <span className="scrapboard-sketch-toggle__box" aria-hidden />
            <span className="scrapboard-sketch-toggle__label">Full-bleed layouts</span>
          </label>
          <label className="scrapboard-sketch-toggle">
            <input
              type="checkbox"
              className="scrapboard-sketch-toggle__input"
              checked={allowBubbleEscape}
              onChange={(e) => setAllowBubbleEscape(e.target.checked)}
              data-testid="scrapboard-bubble-escape-toggle"
            />
            <span className="scrapboard-sketch-toggle__box" aria-hidden />
            <span className="scrapboard-sketch-toggle__label">Bubble escape</span>
          </label>
          <hr className="scrapboard-toolbar__menu-divider" />
          <label className="scrapboard-sketch-toggle">
            <input
              type="checkbox"
              className="scrapboard-sketch-toggle__input"
              checked={randomizeLocks.copy}
              onChange={() => toggleRandomizeLock('copy')}
              data-testid="scrapboard-lock-copy-toggle"
            />
            <span className="scrapboard-sketch-toggle__box" aria-hidden />
            <span className="scrapboard-sketch-toggle__label">Lock copy randomization</span>
          </label>
        </div>
      </AnchoredPopover>
    </div>
  );
}
