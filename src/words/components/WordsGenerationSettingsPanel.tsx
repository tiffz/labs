import AppSlider from '../../shared/components/AppSlider';
import AppTooltip from '../../shared/components/AppTooltip';
import type { AlignmentStrength, NoteValueBias, WordRhythmGenerationSettings } from '../utils/prosodyEngine';
import { snapBiasToLevel } from '../utils/appRhythmHelpers';
import {
  ALIGNMENT_HELP,
  ALIGNMENT_STRENGTH_OPTIONS,
  PHRASING_OPTIONS,
} from './wordsSettingHelpCopy';
import { WordsSettingHelpLabel } from './WordsSettingHelpLabel';
import {
  BIAS_LEVELS,
  NOTE_VALUE_LABELS,
  TEMPLATE_MUTATION_RULES,
  WORD_SHAPING_RULES,
} from '../utils/generationRules';

export type WordsGenerationSettingsPanelProps = {
  menuId?: string;
  settings: WordRhythmGenerationSettings;
  onReset: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSetRule: (key: keyof WordRhythmGenerationSettings, value: boolean) => void;
  onSetNoteValueBias: (key: keyof NoteValueBias, value: number) => void;
  onSetStressAlignment: (value: AlignmentStrength) => void;
  onSetWordStartAlignment: (value: AlignmentStrength) => void;
  onSettingsChange: (
    updater: (previous: WordRhythmGenerationSettings) => WordRhythmGenerationSettings,
  ) => void;
};

export default function WordsGenerationSettingsPanel({
  menuId = 'words-generation-settings-menu',
  settings,
  onReset,
  onSelectAll,
  onClearAll,
  onSetRule,
  onSetNoteValueBias,
  onSetStressAlignment,
  onSetWordStartAlignment,
  onSettingsChange,
}: WordsGenerationSettingsPanelProps) {
  return (
    <div
      id={menuId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${menuId}-title`}
      className="labs-popover-surface words-dropdown-menu words-dropdown-generation"
    >
      <div className="words-dropdown-header words-generation-header">
        <span className="words-generation-title">
          <strong id={`${menuId}-title`}>Generation settings</strong>
          <AppTooltip title="Rules transform the template in order. All off = syllables follow the template exactly.">
            <button
              className="words-setting-help"
              type="button"
              tabIndex={-1}
              aria-label="Generation settings help"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                info
              </span>
            </button>
          </AppTooltip>
        </span>
        <div className="words-generation-header-actions">
          <button className="words-text-button" type="button" onClick={onReset}>
            Reset defaults
          </button>
          <button className="words-text-button" type="button" onClick={onSelectAll}>
            Select all
          </button>
          <button className="words-text-button" type="button" onClick={onClearAll}>
            Deselect all
          </button>
        </div>
      </div>

      <div className="words-gs-grid">
        <div className="words-gs-col">
          <h3 className="words-gs-heading">Template</h3>
          {TEMPLATE_MUTATION_RULES.map((rule) => (
            <label key={rule.key} className="words-mutation-row">
              <input
                type="checkbox"
                className="words-mutation-checkbox"
                checked={Boolean(settings[rule.key])}
                onChange={(event) => onSetRule(rule.key, event.target.checked)}
              />
              <WordsSettingHelpLabel text={rule.label} help={rule.help} />
            </label>
          ))}
          <label className="words-mutation-row">
            <input
              type="checkbox"
              className="words-mutation-checkbox"
              checked={settings.freestyle}
              onChange={(event) => onSetRule('freestyle', event.target.checked)}
            />
            <WordsSettingHelpLabel
              text="Freestyle"
              help="Randomly break template constraints. Strength controls how much."
            />
          </label>
          {settings.freestyle ? (
            <div className="words-freestyle-strength words-gs-indent">
              <span className="words-bias-label">Strength</span>
              <AppSlider
                min={5}
                max={100}
                className="words-slider-input"
                value={settings.freestyleStrength}
                onChange={(event) =>
                  onSettingsChange((prev) => ({
                    ...prev,
                    freestyleStrength: Number(event.target.value),
                  }))
                }
              />
              <span className="words-bias-value">{settings.freestyleStrength}%</span>
            </div>
          ) : null}

          <h3 className="words-gs-heading words-gs-heading--sub">Note value bias</h3>
          {NOTE_VALUE_LABELS.map(({ key, label }) => (
            <div key={key} className="words-bias-toggle-row">
              <span className="words-bias-label">{label}</span>
              <div
                className="words-segmented-toggle words-bias-toggle"
                role="group"
                aria-label={`${label} note bias`}
              >
                {BIAS_LEVELS.map((level) => (
                  <button
                    key={`${key}-${level.value}`}
                    type="button"
                    className={
                      snapBiasToLevel(settings.noteValueBias[key]) === level.value
                        ? 'is-active'
                        : ''
                    }
                    onClick={() => onSetNoteValueBias(key, level.value)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="words-gs-col">
          <h3 className="words-gs-heading">Words</h3>
          {WORD_SHAPING_RULES.map((rule) => (
            <label key={rule.key} className="words-mutation-row">
              <input
                type="checkbox"
                className="words-mutation-checkbox"
                checked={Boolean(settings[rule.key])}
                onChange={(event) => onSetRule(rule.key, event.target.checked)}
              />
              <WordsSettingHelpLabel text={rule.label} help={rule.help} />
            </label>
          ))}
          <div className="words-alignment-block">
            <label className="words-mutation-row words-alignment-master-row">
              <input
                type="checkbox"
                className="words-mutation-checkbox"
                checked={settings.stressAlignment !== 'off'}
                onChange={(event) => {
                  if (event.target.checked) {
                    onSettingsChange((prev) => ({
                      ...prev,
                      stressAlignment:
                        prev.stressAlignment === 'off' ? 'strong' : prev.stressAlignment,
                    }));
                  } else {
                    onSetStressAlignment('off');
                  }
                }}
              />
              <WordsSettingHelpLabel text="Stress to beats" help={ALIGNMENT_HELP.stress} />
            </label>
            {settings.stressAlignment !== 'off' ? (
              <div
                className="words-segmented-toggle words-alignment-subtoggle"
                role="group"
                aria-label="Stress alignment strength"
              >
                {ALIGNMENT_STRENGTH_OPTIONS.map((option) => (
                  <button
                    key={`stress-${option}`}
                    type="button"
                    className={settings.stressAlignment === option ? 'is-active' : ''}
                    onClick={() => onSetStressAlignment(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="words-alignment-block">
            <label className="words-mutation-row words-alignment-master-row">
              <input
                type="checkbox"
                className="words-mutation-checkbox"
                checked={settings.wordStartAlignment !== 'off'}
                onChange={(event) => {
                  if (event.target.checked) {
                    onSettingsChange((prev) => ({
                      ...prev,
                      wordStartAlignment:
                        prev.wordStartAlignment === 'off' ? 'strong' : prev.wordStartAlignment,
                    }));
                  } else {
                    onSetWordStartAlignment('off');
                  }
                }}
              />
              <WordsSettingHelpLabel text="Word starts to beats" help={ALIGNMENT_HELP.wordStart} />
            </label>
            {settings.wordStartAlignment !== 'off' ? (
              <div
                className="words-segmented-toggle words-alignment-subtoggle"
                role="group"
                aria-label="Word start alignment strength"
              >
                {ALIGNMENT_STRENGTH_OPTIONS.map((option) => (
                  <button
                    key={`word-${option}`}
                    type="button"
                    className={settings.wordStartAlignment === option ? 'is-active' : ''}
                    onClick={() => onSetWordStartAlignment(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <h3 className="words-gs-heading words-gs-heading--sub">Phrasing</h3>
          <div className="words-segmented-toggle" role="group" aria-label="Phrasing mode">
            {PHRASING_OPTIONS.map((opt) => (
              <AppTooltip key={opt.value} title={opt.help}>
                <button
                  type="button"
                  className={settings.phrasing === opt.value ? 'is-active' : ''}
                  onClick={() =>
                    onSettingsChange((prev) => ({
                      ...prev,
                      phrasing: opt.value,
                    }))
                  }
                >
                  {opt.label}
                </button>
              </AppTooltip>
            ))}
          </div>
          <label className="words-mutation-row">
            <input
              type="checkbox"
              className="words-mutation-checkbox"
              checked={settings.landingNote !== 'off'}
              onChange={(event) =>
                onSettingsChange((prev) => ({
                  ...prev,
                  landingNote: event.target.checked ? 'quarter' : 'off',
                }))
              }
            />
            <WordsSettingHelpLabel
              text="Landing note"
              help="End each phrase on a held quarter note for a grounded finish."
            />
          </label>
        </div>
      </div>
    </div>
  );
}
