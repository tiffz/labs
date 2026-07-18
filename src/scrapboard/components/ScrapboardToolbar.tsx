import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import { useRef, useState, type ReactElement } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { ScrapboardBoardState } from '../hooks/useScrapboardBoard';

export type ScrapboardToolbarProps = {
  board: ScrapboardBoardState;
  onExportPng: () => void;
};

/**
 * Header chrome: panel count, randomize menu, overflow (expert toggles), Export primary.
 */
export function ScrapboardToolbar({ board, onExportPng }: ScrapboardToolbarProps): ReactElement {
  const {
    panelCount,
    setPanelCount,
    randomizeText,
    randomizeAll,
    allowFullBleedLayouts,
    setAllowFullBleedLayouts,
    allowBubbleEscape,
    setAllowBubbleEscape,
  } = board;

  const [randomizeOpen, setRandomizeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const randomizeRef = useRef<HTMLButtonElement | null>(null);
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
        <button
          ref={randomizeRef}
          type="button"
          className="scrapboard-btn scrapboard-btn--ghost scrapboard-btn--icon"
          aria-haspopup="menu"
          aria-expanded={randomizeOpen}
          data-testid="scrapboard-randomize-menu"
          onClick={() => {
            setMoreOpen(false);
            setRandomizeOpen((open) => !open);
          }}
        >
          <CasinoOutlinedIcon fontSize="small" />
          Randomize
        </button>

        <button
          ref={moreRef}
          type="button"
          className="scrapboard-btn scrapboard-btn--ghost scrapboard-btn--icon"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          data-testid="scrapboard-more-menu"
          onClick={() => {
            setRandomizeOpen(false);
            setMoreOpen((open) => !open);
          }}
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
        open={randomizeOpen}
        anchorEl={randomizeRef.current}
        onClose={() => setRandomizeOpen(false)}
        placement="bottom-end"
        paperClassName="scrapboard-toolbar__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={8}
        transitionDuration={0}
      >
        <div role="menu" className="scrapboard-toolbar__menu-body">
          <MenuItem
            role="menuitem"
            data-testid="scrapboard-randomize-text"
            onClick={() => {
              randomizeText();
              setRandomizeOpen(false);
            }}
          >
            Randomize copy
          </MenuItem>
          <MenuItem
            role="menuitem"
            data-testid="scrapboard-randomize-all"
            onClick={() => {
              randomizeAll();
              setRandomizeOpen(false);
            }}
          >
            Randomize all
          </MenuItem>
        </div>
      </AnchoredPopover>

      <AnchoredPopover
        open={moreOpen}
        anchorEl={moreRef.current}
        onClose={() => setMoreOpen(false)}
        placement="bottom-end"
        paperClassName="scrapboard-toolbar__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={8}
        transitionDuration={0}
      >
        <div role="menu" className="scrapboard-toolbar__menu-body scrapboard-toolbar__menu-body--more">
          <FormControlLabel
            className="scrapboard-toolbar__toggle"
            control={
              <Switch
                size="small"
                checked={allowFullBleedLayouts}
                onChange={(_, checked) => setAllowFullBleedLayouts(checked)}
                data-testid="scrapboard-full-bleed-toggle"
              />
            }
            label="Full-bleed layouts"
          />
          <FormControlLabel
            className="scrapboard-toolbar__toggle"
            control={
              <Switch
                size="small"
                checked={allowBubbleEscape}
                onChange={(_, checked) => setAllowBubbleEscape(checked)}
                data-testid="scrapboard-bubble-escape-toggle"
              />
            }
            label="Bubble escape"
          />
        </div>
      </AnchoredPopover>
    </div>
  );
}
