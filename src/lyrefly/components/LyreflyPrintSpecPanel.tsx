import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useMemo, useState, type MouseEvent, type ReactElement } from 'react';

import { BleedGuideOverlay } from '../../shared/zine/BleedGuideOverlay';
import { bleedOverlayPercents } from '../../shared/zine';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import type { ComicProject } from '../types';
import {
  bleedConfigForPrintSpec,
  printSpecSummary,
  resolveLyreflyPrintSpec,
  trimSizeFromPrintSpec,
  type LyreflyPrintSpec,
} from '../utils/lyreflyPrintSpec';

import { LyreflyBleedPreviewDialog } from './LyreflyBleedPreviewDialog';
import { LyreflyPrintSpecEditPopover } from './LyreflyPrintSpecEditPopover';

import '../../shared/zine/bleedGuideOverlay.css';

export type LyreflyPrintSpecPanelProps = {
  project: ComicProject;
  onProjectChange: (project: ComicProject) => void;
};

export function LyreflyPrintSpecPanel({
  project,
  onProjectChange,
}: LyreflyPrintSpecPanelProps): ReactElement {
  const spec = useMemo(() => resolveLyreflyPrintSpec(project), [project]);
  const summary = useMemo(() => printSpecSummary(spec), [spec]);
  const overlayPercents = useMemo(() => {
    const bleed = bleedConfigForPrintSpec(spec);
    return bleedOverlayPercents(trimSizeFromPrintSpec(spec), bleed);
  }, [spec]);
  const [editAnchor, setEditAnchor] = useState<HTMLElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const persistSpec = async (next: LyreflyPrintSpec): Promise<void> => {
    const updated = await saveLyreflyProject({ ...project, printSpec: next });
    onProjectChange(updated);
  };

  const openEdit = (event: MouseEvent<HTMLElement>): void => {
    setEditAnchor(event.currentTarget);
  };

  const closeEdit = (): void => {
    setEditAnchor(null);
  };

  const openPreview = (): void => {
    setPreviewOpen(true);
  };

  const closePreview = (): void => {
    setPreviewOpen(false);
  };

  const editOpen = Boolean(editAnchor);

  return (
    <section
      className="lyrefly-print-spec"
      aria-label="Print size and bleed"
      data-testid="lyrefly-print-spec-panel"
    >
      <div className="lyrefly-print-spec__summary">
        <button
          type="button"
          className="lyrefly-print-spec__thumb-btn"
          onClick={openPreview}
          aria-label={`Preview bleed for ${summary.presetLabel}, file ${summary.bleedLabel}`}
          data-testid="lyrefly-print-spec-thumb"
        >
          <div
            className="lyrefly-print-spec__thumb"
            style={{ aspectRatio: String(summary.aspectRatio) }}
          >
            <BleedGuideOverlay percents={overlayPercents} show pageSide="single" />
          </div>
        </button>

        <div className="lyrefly-print-spec__readout">
          <p className="lyrefly-print-spec__readout-primary">
            <strong>{summary.presetLabel}</strong>
            <span className="lyrefly-print-spec__readout-sep" aria-hidden>
              ·
            </span>
            <button
              type="button"
              className="lyrefly-print-spec__dim-link"
              onClick={openEdit}
              data-testid="lyrefly-print-spec-dimensions"
            >
              File {summary.bleedLabel}
            </button>
          </p>
          <p className="lyrefly-print-spec__readout-secondary">
            Trim {summary.trimLabel}
            <span className="lyrefly-print-spec__readout-sep" aria-hidden>
              ·
            </span>
            {summary.fileLabel} @ {spec.dpi} DPI
            <span className="lyrefly-print-spec__readout-sep" aria-hidden>
              ·
            </span>
            {summary.bleedReadout}
          </p>
        </div>

        <div className="lyrefly-print-spec__summary-actions">
          <Tooltip title="Edit print size">
            <IconButton
              size="small"
              aria-label="Edit print size"
              onClick={openEdit}
              data-testid="lyrefly-print-spec-edit"
              aria-expanded={editOpen}
              className="lyrefly-print-spec__icon-btn"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Preview bleed">
            <IconButton
              size="small"
              aria-label="Preview bleed"
              onClick={openPreview}
              data-testid="lyrefly-print-spec-preview"
              className="lyrefly-print-spec__icon-btn"
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <LyreflyPrintSpecEditPopover
        anchorEl={editAnchor}
        open={editOpen}
        onClose={closeEdit}
        project={project}
        spec={spec}
        onPersistSpec={(next) => void persistSpec(next)}
      />

      <LyreflyBleedPreviewDialog open={previewOpen} onClose={closePreview} project={project} />
    </section>
  );
}
