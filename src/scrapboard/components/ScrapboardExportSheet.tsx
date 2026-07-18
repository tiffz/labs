import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import type { ReactElement } from 'react';

import { labsPrintSpecSummary, type LabsPrintSpec } from '../../shared/zine';
import { ScrapboardPrintSpecPanel } from './ScrapboardPrintSpecPanel';

export type ScrapboardExportSheetProps = {
  open: boolean;
  onClose: () => void;
  printSpec: LabsPrintSpec;
  onPrintSpecChange: (next: LabsPrintSpec) => void;
  showBleedGuides: boolean;
  onShowBleedGuidesChange: (show: boolean) => void;
  onConfirmExport: () => void;
  /** When true, show the print editor inside the sheet. */
  showSettings?: boolean;
  onShowSettingsChange?: (show: boolean) => void;
};

/**
 * Export confirmation with print summary. Defaults stay one confirm away;
 * trim/bleed/DPI stay available without leaving the mock flow.
 */
export function ScrapboardExportSheet({
  open,
  onClose,
  printSpec,
  onPrintSpecChange,
  showBleedGuides,
  onShowBleedGuidesChange,
  onConfirmExport,
  showSettings = false,
  onShowSettingsChange,
}: ScrapboardExportSheetProps): ReactElement {
  const summary = labsPrintSpecSummary(printSpec);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      data-testid="scrapboard-export-sheet"
      PaperProps={{ className: 'scrapboard-export-sheet' }}
    >
      <DialogTitle className="scrapboard-export-sheet__title">Export PNG</DialogTitle>
      <DialogContent className="scrapboard-export-sheet__content">
        <dl className="scrapboard-export-sheet__summary">
          <div>
            <dt>Trim</dt>
            <dd>
              {summary.presetLabel} · {summary.trimLabel}
            </dd>
          </div>
          <div>
            <dt>Bleed</dt>
            <dd>{summary.bleedReadout}</dd>
          </div>
          <div>
            <dt>File</dt>
            <dd>{summary.fileLabel}</dd>
          </div>
        </dl>

        {onShowSettingsChange ? (
          <button
            type="button"
            className="scrapboard-disclosure"
            aria-expanded={showSettings}
            onClick={() => onShowSettingsChange(!showSettings)}
            data-testid="scrapboard-export-sheet-settings-toggle"
          >
            {showSettings ? 'Hide page settings' : 'Edit page settings'}
          </button>
        ) : null}

        {showSettings ? (
          <div className="scrapboard-export-sheet__settings">
            <ScrapboardPrintSpecPanel
              printSpec={printSpec}
              onChange={onPrintSpecChange}
              showBleedGuides={showBleedGuides}
              onShowBleedGuidesChange={onShowBleedGuidesChange}
            />
          </div>
        ) : null}
      </DialogContent>
      <DialogActions className="scrapboard-export-sheet__actions">
        <button
          type="button"
          className="scrapboard-btn scrapboard-btn--ghost"
          onClick={onClose}
          data-testid="scrapboard-export-sheet-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          className="scrapboard-btn scrapboard-btn--primary"
          onClick={() => {
            onConfirmExport();
            onClose();
          }}
          data-testid="scrapboard-export-sheet-confirm"
        >
          Export PNG
        </button>
      </DialogActions>
    </Dialog>
  );
}
