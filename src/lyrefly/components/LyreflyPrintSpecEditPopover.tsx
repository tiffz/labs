import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';

import {
  downloadBleedTemplatePng,
  MIXAM_BINDING_LABELS,
  MIXAM_TRIM_PRESETS,
  trimPresetById,
  type MixamBindingType,
} from '../../shared/zine';
import type { ComicProject } from '../types';
import {
  DEFAULT_LYREFLY_PRINT_SPEC,
  LYREFLY_BLEED_PRESETS,
  LYREFLY_DPI_PRESETS,
  trimSizeFromPrintSpec,
  type LyreflyPrintSpec,
} from '../utils/lyreflyPrintSpec';
import { bleedConfigForPrintSpec } from '../utils/lyreflyPrintSpec';

export type LyreflyPrintSpecEditPopoverProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  project: ComicProject;
  spec: LyreflyPrintSpec;
  onPersistSpec: (next: LyreflyPrintSpec) => void;
};

export function LyreflyPrintSpecEditPopover({
  anchorEl,
  open,
  onClose,
  project,
  spec,
  onPersistSpec,
}: LyreflyPrintSpecEditPopoverProps): ReactElement {
  const [bleedDraft, setBleedDraft] = useState(String(spec.bleedInches ?? 0.125));
  const [dpiDraft, setDpiDraft] = useState(String(spec.dpi));
  const [downloading, setDownloading] = useState(false);

  const activePresetId = trimPresetById(spec.presetId)?.id ?? DEFAULT_LYREFLY_PRINT_SPEC.presetId;
  const activeBleedInches = spec.bleedInches ?? 0.125;

  const onPresetSelect = (presetId: string): void => {
    const preset = trimPresetById(presetId);
    if (!preset) return;
    onPersistSpec({
      ...spec,
      presetId: preset.id,
      trimWidth: preset.width,
      trimHeight: preset.height,
      unit: 'in',
    });
  };

  const onBindingChange = (binding: MixamBindingType): void => {
    onPersistSpec({ ...spec, binding });
  };

  const onBleedPreset = (inches: number): void => {
    setBleedDraft(String(inches));
    onPersistSpec({ ...spec, bleedInches: inches });
  };

  const commitBleedDraft = (): void => {
    const parsed = Number.parseFloat(bleedDraft);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const rounded = Math.round(parsed * 1000) / 1000;
    onPersistSpec({ ...spec, bleedInches: rounded });
    setBleedDraft(String(rounded));
  };

  const onDpiPreset = (dpi: number): void => {
    setDpiDraft(String(dpi));
    onPersistSpec({ ...spec, dpi });
  };

  const commitDpiDraft = (): void => {
    const parsed = Number.parseInt(dpiDraft, 10);
    if (!Number.isFinite(parsed) || parsed < 72 || parsed > 1200) return;
    onPersistSpec({ ...spec, dpi: parsed });
    setDpiDraft(String(parsed));
  };

  const onDownloadTemplate = async (): Promise<void> => {
    setDownloading(true);
    try {
      const preset = trimPresetById(spec.presetId);
      const bleed = bleedConfigForPrintSpec(spec);
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
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-start"
      paperClassName="lyrefly-print-spec__popover"
    >
      <div data-testid="lyrefly-print-spec-edit-panel" className="lyrefly-print-spec__popover-inner">
        <Typography component="h4" variant="subtitle2" className="lyrefly-print-spec__drawer-title">
          Edit print size
        </Typography>

        <div className="lyrefly-print-spec__presets" role="group" aria-label="Common trim sizes">
          {MIXAM_TRIM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={[
                'lyrefly-print-spec__preset',
                activePresetId === preset.id ? 'lyrefly-print-spec__preset--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onPresetSelect(preset.id)}
              data-testid={`lyrefly-print-preset-${preset.id}`}
            >
              {preset.name}
              <span className="lyrefly-print-spec__preset-size">
                {preset.width}×{preset.height}
              </span>
            </button>
          ))}
        </div>

        <div className="lyrefly-print-spec__edit-grid">
          <FormControl size="medium" className="lyrefly-print-spec__binding">
            <InputLabel id="lyrefly-print-binding-label">Binding</InputLabel>
            <Select
              labelId="lyrefly-print-binding-label"
              label="Binding"
              size="medium"
              value={spec.binding}
              onChange={(event) => onBindingChange(event.target.value as MixamBindingType)}
              data-testid="lyrefly-print-binding-select"
            >
              {(Object.keys(MIXAM_BINDING_LABELS) as MixamBindingType[]).map((binding) => (
                <MenuItem key={binding} value={binding}>
                  {MIXAM_BINDING_LABELS[binding]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <div className="lyrefly-print-spec__field-group">
            <span className="lyrefly-print-spec__field-label">Bleed</span>
            <div className="lyrefly-print-spec__chip-row">
              {LYREFLY_BLEED_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={[
                    'lyrefly-print-spec__mini-chip',
                    activeBleedInches === preset.inches ? 'lyrefly-print-spec__mini-chip--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onBleedPreset(preset.inches)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <TextField
              size="medium"
              label="Bleed (in)"
              value={bleedDraft}
              onChange={(event) => setBleedDraft(event.target.value)}
              onBlur={() => commitBleedDraft()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitBleedDraft();
                }
              }}
              inputProps={{ 'data-testid': 'lyrefly-print-bleed-input', step: 0.0625, min: 0 }}
              sx={{ maxWidth: '7.5rem' }}
            />
          </div>

          <div className="lyrefly-print-spec__field-group">
            <span className="lyrefly-print-spec__field-label">DPI</span>
            <div className="lyrefly-print-spec__chip-row">
              {LYREFLY_DPI_PRESETS.map((dpi) => (
                <button
                  key={dpi}
                  type="button"
                  className={[
                    'lyrefly-print-spec__mini-chip',
                    spec.dpi === dpi ? 'lyrefly-print-spec__mini-chip--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onDpiPreset(dpi)}
                >
                  {dpi}
                </button>
              ))}
            </div>
            <TextField
              size="medium"
              label="DPI"
              value={dpiDraft}
              onChange={(event) => setDpiDraft(event.target.value)}
              onBlur={() => commitDpiDraft()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitDpiDraft();
                }
              }}
              inputProps={{ 'data-testid': 'lyrefly-print-dpi-input', step: 1, min: 72, max: 1200 }}
              sx={{ maxWidth: '6.5rem' }}
            />
          </div>

          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={downloading}
            onClick={() => void onDownloadTemplate()}
            data-testid="lyrefly-download-bleed-template"
            className="lyrefly-print-spec__download"
          >
            Download template
          </Button>
        </div>

        <p className="lyrefly-print-spec__hint">
          Create art at the file size above.
          <a
            href="https://mixam.com/support/bleed"
            target="_blank"
            rel="noopener noreferrer"
            className="lyrefly-print-spec__mixam-link"
          >
            Mixam bleed guide
            <OpenInNewOutlinedIcon fontSize="inherit" aria-hidden />
          </a>
        </p>
      </div>
    </AnchoredPopover>
  );
}
