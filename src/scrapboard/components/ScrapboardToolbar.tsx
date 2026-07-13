import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import type { ReactElement } from 'react';

import type { ScrapboardBoardState } from '../hooks/useScrapboardBoard';

export type ScrapboardToolbarProps = {
  board: ScrapboardBoardState;
  onExportPng: () => void;
};

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

      <div className="scrapboard-toolbar__group scrapboard-toolbar__group--toggles">
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

      <div className="scrapboard-toolbar__group scrapboard-toolbar__group--actions">
        <button
          type="button"
          className="scrapboard-btn scrapboard-btn--ghost scrapboard-btn--icon"
          onClick={randomizeText}
          data-testid="scrapboard-randomize-text"
        >
          <CasinoOutlinedIcon fontSize="small" />
          Randomize copy
        </button>
        <button
          type="button"
          className="scrapboard-btn scrapboard-btn--ghost scrapboard-btn--icon"
          onClick={randomizeAll}
          data-testid="scrapboard-randomize-all"
        >
          <CasinoOutlinedIcon fontSize="small" />
          Randomize all
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
    </div>
  );
}
