import type { ChangeEvent, ReactElement } from 'react';

import {
  LABS_BLEED_PRESETS,
  LABS_DPI_PRESETS,
  MIXAM_TRIM_PRESETS,
  labsPrintSpecSummary,
  type LabsPrintSpec,
} from '../../shared/zine';

export type ScrapboardPrintSpecPanelProps = {
  printSpec: LabsPrintSpec;
  onChange: (next: LabsPrintSpec) => void;
  showBleedGuides: boolean;
  onShowBleedGuidesChange: (show: boolean) => void;
};

export function ScrapboardPrintSpecPanel({
  printSpec,
  onChange,
  showBleedGuides,
  onShowBleedGuidesChange,
}: ScrapboardPrintSpecPanelProps): ReactElement {
  const summary = labsPrintSpecSummary(printSpec);
  const activeBleedId =
    LABS_BLEED_PRESETS.find((row) => row.inches === (printSpec.bleedInches ?? 0.125))?.id ?? 'mixam';

  const onTrimChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const preset = MIXAM_TRIM_PRESETS.find((row) => row.id === event.target.value);
    if (!preset) return;
    onChange({
      ...printSpec,
      presetId: preset.id,
      trimWidth: preset.width,
      trimHeight: preset.height,
    });
  };

  return (
    <section className="scrapboard-print-spec" data-testid="scrapboard-print-spec">
      <div className="scrapboard-field">
        <label className="scrapboard-field__label" htmlFor="scrapboard-trim-select">
          Trim size
        </label>
        <select
          id="scrapboard-trim-select"
          className="scrapboard-select"
          value={printSpec.presetId}
          onChange={onTrimChange}
          data-testid="scrapboard-trim-select"
        >
          {MIXAM_TRIM_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} ({preset.width}×{preset.height}″)
            </option>
          ))}
        </select>
      </div>

      <div className="scrapboard-field">
        <span className="scrapboard-field__label" id="scrapboard-bleed-label">
          Bleed
        </span>
        <div className="scrapboard-option-chips" role="group" aria-labelledby="scrapboard-bleed-label">
          {LABS_BLEED_PRESETS.map((preset) => {
            const active = activeBleedId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={['scrapboard-option-chip', active ? 'scrapboard-option-chip--active' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={active}
                onClick={() => onChange({ ...printSpec, bleedInches: preset.inches })}
                data-testid={`scrapboard-bleed-${preset.id}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scrapboard-field">
        <span className="scrapboard-field__label" id="scrapboard-dpi-label">
          DPI
        </span>
        <div className="scrapboard-option-chips" role="group" aria-labelledby="scrapboard-dpi-label">
          {LABS_DPI_PRESETS.map((dpi) => {
            const active = printSpec.dpi === dpi;
            return (
              <button
                key={dpi}
                type="button"
                className={['scrapboard-option-chip', active ? 'scrapboard-option-chip--active' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={active}
                onClick={() => onChange({ ...printSpec, dpi })}
                data-testid={`scrapboard-dpi-${dpi}`}
              >
                {dpi}
              </button>
            );
          })}
        </div>
      </div>

      <p className="scrapboard-print-spec__summary">
        <span className="scrapboard-print-spec__summary-label">Export</span>
        {summary.fileLabel}
        <span className="scrapboard-print-spec__summary-sep" aria-hidden>
          ·
        </span>
        {summary.bleedReadout}
      </p>

      <label className="scrapboard-toggle-row">
        <input
          type="checkbox"
          className="scrapboard-toggle-row__input"
          checked={showBleedGuides}
          onChange={(event) => onShowBleedGuidesChange(event.target.checked)}
          data-testid="scrapboard-trim-guides-toggle"
        />
        <span className="scrapboard-toggle-row__label">Show trim guides</span>
      </label>
    </section>
  );
}
