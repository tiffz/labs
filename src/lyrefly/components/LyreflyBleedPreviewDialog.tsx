import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { useMemo, useState, type ReactElement } from 'react';

import { BleedGuideOverlay } from '../../shared/zine/BleedGuideOverlay';
import {
  bleedOverlayPercents,
  downloadBleedTemplatePng,
  trimPresetById,
} from '../../shared/zine';
import type { ComicProject } from '../types';
import {
  bleedConfigForPrintSpec,
  printSpecSummary,
  resolveLyreflyPrintSpec,
  trimSizeFromPrintSpec,
} from '../utils/lyreflyPrintSpec';

import '../../shared/zine/bleedGuideOverlay.css';

export type LyreflyBleedPreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  project: ComicProject;
};

export function LyreflyBleedPreviewDialog({
  open,
  onClose,
  project,
}: LyreflyBleedPreviewDialogProps): ReactElement {
  const spec = useMemo(() => resolveLyreflyPrintSpec(project), [project]);
  const summary = useMemo(() => printSpecSummary(spec), [spec]);
  const bleed = useMemo(() => bleedConfigForPrintSpec(spec), [spec]);
  const overlayPercents = useMemo(
    () => bleedOverlayPercents(trimSizeFromPrintSpec(spec), bleed),
    [bleed, spec],
  );
  const [downloading, setDownloading] = useState(false);

  const onDownloadTemplate = async (): Promise<void> => {
    setDownloading(true);
    try {
      const preset = trimPresetById(spec.presetId);
      await downloadBleedTemplatePng({
        trim: trimSizeFromPrintSpec(spec),
        binding: spec.binding,
        bleed,
        dpi: spec.dpi,
        projectTitle: project.title,
        presetName: preset?.name,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="lyrefly-bleed-preview-title"
      data-testid="lyrefly-bleed-preview-dialog"
    >
      <DialogTitle id="lyrefly-bleed-preview-title" sx={{ pr: 6 }}>
        Bleed preview: {summary.presetLabel}
        <IconButton
          aria-label="Close bleed preview"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          className="lyrefly-print-spec__aspect lyrefly-print-spec__aspect--large"
          style={{ aspectRatio: String(summary.aspectRatio) }}
          data-testid="lyrefly-print-aspect-preview"
        >
          <div className="lyrefly-print-spec__aspect-inner">
            <BleedGuideOverlay percents={overlayPercents} show pageSide="single" />
          </div>
        </Box>
        <ul className="lyrefly-print-spec__legend">
          <li>
            <span className="lyrefly-print-spec__swatch lyrefly-print-spec__swatch--bleed" aria-hidden />
            Bleed: extend art through this zone
          </li>
          <li>
            <span className="lyrefly-print-spec__swatch lyrefly-print-spec__swatch--trim" aria-hidden />
            Trim line: finished page edge
          </li>
          <li>
            <span className="lyrefly-print-spec__swatch lyrefly-print-spec__swatch--quiet" aria-hidden />
            Safe zone: keep text inside
          </li>
          {spec.binding !== 'staple' ? (
            <li>
              <span className="lyrefly-print-spec__swatch lyrefly-print-spec__swatch--gutter" aria-hidden />
              Gutter: binding margin in book preview
            </li>
          ) : null}
        </ul>
        <p className="lyrefly-print-spec__hint lyrefly-print-spec__hint--dialog">
          File {summary.bleedLabel} · Trim {summary.trimLabel} · {spec.dpi} DPI
        </p>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadOutlinedIcon />}
          disabled={downloading}
          onClick={() => void onDownloadTemplate()}
          data-testid="lyrefly-bleed-preview-download"
        >
          Download template
        </Button>
        <Button size="small" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
