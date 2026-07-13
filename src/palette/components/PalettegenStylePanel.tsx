import { type ReactElement } from 'react';

import AppSlider from '../../shared/components/AppSlider';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import {
  PALETTE_RANDOM_TEMPLATES,
  type PaletteMoodPreset,
  type PaletteRandomTemplate,
} from '../../shared/color';
import type { usePalettegenGallery } from '../hooks/usePalettegenGallery';
import { moodPreviewGradient, moodPreviewLabel } from '../utils/moodPreviewGradient';

type Gallery = ReturnType<typeof usePalettegenGallery>;

export type PalettegenStylePanelProps = {
  gallery: Gallery;
  anchorEl: HTMLElement | null;
  onClose: () => void;
};

const MOOD_OPTIONS: PaletteMoodPreset[] = [
  'mixed',
  'vivid',
  'pastel',
  'neon',
  'neonInk',
  'contrast',
  'jewel',
  'earth',
  'muted',
  'custom',
];

type RangeRowProps = {
  name: string;
  minHint: string;
  maxHint: string;
  minValue: number;
  maxValue: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  minAria: string;
  maxAria: string;
};

function RangeRow({
  name,
  minHint,
  maxHint,
  minValue,
  maxValue,
  min,
  max,
  step,
  format,
  onMinChange,
  onMaxChange,
  minAria,
  maxAria,
}: RangeRowProps): ReactElement {
  return (
    <div className="palettegen-style-panel__range">
      <div className="palettegen-style-panel__range-header">
        <span className="palettegen-style-panel__range-name">{name}</span>
        <span className="palettegen-style-panel__range-value">
          {format(minValue)} – {format(maxValue)}
        </span>
      </div>
      <div className="palettegen-style-panel__range-sliders">
        <AppSlider
          size="small"
          value={minValue}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onMinChange(Number(event.target.value))}
          aria-label={minAria}
        />
        <AppSlider
          size="small"
          value={maxValue}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onMaxChange(Number(event.target.value))}
          aria-label={maxAria}
        />
      </div>
      <div className="palettegen-style-panel__range-ends">
        <span>{minHint}</span>
        <span>{maxHint}</span>
      </div>
    </div>
  );
}

function modeSettingsHint(mode: Gallery['mode']): string | null {
  if (mode === 'image') {
    return 'Image mode: mood and range reshape extracted colors. Regenerate resamples the photo.';
  }
  if (mode === 'seed') {
    return 'Seed mode: harmonies stay near your anchor. Regenerate explores more variations.';
  }
  if (mode === 'random') {
    return 'Random mode: each set shares a hue family. Mood, range, and harmony mix apply.';
  }
  return null;
}

export function PalettegenStylePanel({ gallery, anchorEl, onClose }: PalettegenStylePanelProps): ReactElement {
  const {
    mode,
    profile,
    moodPreset,
    setMoodPreset,
    updateProfile,
    randomTemplates,
    setRandomTemplates,
  } = gallery;

  const modeHint = modeSettingsHint(mode);

  const toggleTemplate = (template: PaletteRandomTemplate): void => {
    setRandomTemplates(
      randomTemplates.includes(template)
        ? randomTemplates.filter((row) => row !== template)
        : [...randomTemplates, template],
    );
  };

  return (
    <AnchoredPopover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-end"
      paperClassName="palettegen-style-panel"
    >
      <div className="palettegen-style-panel__inner" data-testid="palettegen-settings">
        <header className="palettegen-style-panel__header">
          <h2 className="palettegen-style-panel__title">Palette settings</h2>
          {modeHint ? <p className="palettegen-style-panel__mode-hint">{modeHint}</p> : null}
        </header>

        <section className="palettegen-style-panel__section">
          <h3 className="palettegen-style-panel__label">Mood</h3>
          {moodPreset === 'mixed' ? (
            <p className="palettegen-style-panel__hint">Each regenerated palette picks a random mood below.</p>
          ) : null}
          <div className="palettegen-style-panel__mood-grid" role="group" aria-label="Mood presets">
            {MOOD_OPTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={[
                  'palettegen-style-panel__mood-card',
                  moodPreset === preset ? 'palettegen-style-panel__mood-card--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setMoodPreset(preset)}
                data-testid={`palettegen-mood-${preset}`}
              >
                <span
                  className="palettegen-style-panel__mood-swatch"
                  style={{ background: moodPreviewGradient(preset) }}
                  aria-hidden
                />
                <span className="palettegen-style-panel__mood-name">{moodPreviewLabel(preset)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="palettegen-style-panel__section palettegen-style-panel__section--ranges">
          <h3 className="palettegen-style-panel__label">Color range</h3>
          <div className="palettegen-style-panel__range-grid">
            <RangeRow
              name="Lightness"
              minHint="Darker"
              maxHint="Lighter"
              minValue={Math.round(profile.lightnessMin * 100)}
              maxValue={Math.round(profile.lightnessMax * 100)}
              min={10}
              max={98}
              step={2}
              format={(value) => `${value}%`}
              onMinChange={(value) => {
                updateProfile({ lightnessMin: Math.min(value / 100, profile.lightnessMax - 0.02) });
              }}
              onMaxChange={(value) => {
                updateProfile({ lightnessMax: Math.max(value / 100, profile.lightnessMin + 0.02) });
              }}
              minAria="Minimum lightness"
              maxAria="Maximum lightness"
            />
            <RangeRow
              name="Saturation"
              minHint="Muted"
              maxHint="Vivid"
              minValue={Math.round(profile.chromaMin * 100)}
              maxValue={Math.round(profile.chromaMax * 100)}
              min={2}
              max={38}
              step={1}
              format={(value) => (value / 100).toFixed(2)}
              onMinChange={(value) => {
                updateProfile({ chromaMin: Math.min(value / 100, profile.chromaMax - 0.01) });
              }}
              onMaxChange={(value) => {
                updateProfile({ chromaMax: Math.max(value / 100, profile.chromaMin + 0.01) });
              }}
              minAria="Minimum chroma"
              maxAria="Maximum chroma"
            />
          </div>
        </section>

        {mode === 'random' ? (
          <section className="palettegen-style-panel__section">
            <h3 className="palettegen-style-panel__label">Harmony mix</h3>
            <p className="palettegen-style-panel__hint">Templates included in each generated set.</p>
            <div className="palettegen-style-panel__template-grid" role="group" aria-label="Harmony templates">
              {PALETTE_RANDOM_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={[
                    'palettegen-style-panel__pill',
                    randomTemplates.includes(template.id) ? 'palettegen-style-panel__pill--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => toggleTemplate(template.id)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="palettegen-style-panel__footer">
          <label className="palettegen-style-panel__toggle">
            <input
              type="checkbox"
              checked={profile.gamut === 'srgb'}
              onChange={(event) => updateProfile({ gamut: event.target.checked ? 'srgb' : 'wide' })}
            />
            <span className="palettegen-style-panel__toggle-track" aria-hidden />
            <span className="palettegen-style-panel__toggle-copy">
              <span className="palettegen-style-panel__toggle-label">Clip to sRGB gamut</span>
              <span className="palettegen-style-panel__toggle-hint">Keeps colors display-safe on the web.</span>
            </span>
          </label>
        </footer>
      </div>
    </AnchoredPopover>
  );
}
