import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import BpmInput from '../shared/components/music/BpmInput';
import KeyInput from '../shared/components/music/KeyInput';
import ChordProgressionInput from '../shared/components/music/ChordProgressionInput';
import ChordStyleInput from '../shared/components/music/ChordStyleInput';
import SharedExportPopover from '../shared/components/music/SharedExportPopover';
import DiceIcon from '../shared/components/DiceIcon';
import AppTooltip from '../shared/components/AppTooltip';
import MetronomeToggleButton from '../shared/components/MetronomeToggleButton';
import DrumNotationMini, { type NotationStyle } from '../shared/notation/DrumNotationMini';
import { COMMON_CHORD_PROGRESSIONS } from '../shared/music/commonChordProgressions';
import { CHORD_STYLE_OPTIONS, type ChordStyleId } from '../shared/music/chordStyleOptions';
import { ALL_KEYS, type MusicKey } from '../shared/music/musicInputConstants';
import { parseRhythm } from '../shared/rhythm';
import { getRhythmTemplatePresets } from '../shared/rhythm/presetDatabase';
import {
  SHARED_CATALOG,
  type SharedCatalogEntry,
  type SharedCatalogKind,
} from './generatedSharedCatalog';
import type { ExportAudioRenderRequest, ExportSourceAdapter } from '../shared/music/exportTypes';
import RegressionPanel from './RegressionPanel';

const KIND_ORDER: SharedCatalogKind[] = [
  'component',
  'hook',
  'utility',
  'model',
  'service',
  'doc',
];

const APPEARANCES = ['default', 'piano', 'words', 'chords'] as const;
type Appearance = (typeof APPEARANCES)[number];
type CatalogTab = 'gallery' | 'docs' | 'theme' | 'regression';
type RegressionRouteSection = 'screenshots' | 'report';
const BPM_SURFACES = ['default', 'piano', 'words', 'chords', 'beat', 'drums'] as const;
const KEY_SURFACES = ['default', 'piano', 'words', 'chords', 'beat'] as const;
const EXPORT_SURFACES = ['piano', 'words', 'chords', 'drums', 'beat'] as const;
type BpmSurface = (typeof BPM_SURFACES)[number];
type KeySurface = (typeof KEY_SURFACES)[number];
type ExportSurface = (typeof EXPORT_SURFACES)[number];
const DRUM_NOTATION_SURFACES = ['words', 'beat'] as const;
type DrumNotationSurface = (typeof DRUM_NOTATION_SURFACES)[number];
type FunctionalSection =
  | 'Shared UI Components'
  | 'Music Input & Theory'
  | 'Rhythm & Timing'
  | 'Notation & Rendering'
  | 'Audio & Playback'
  | 'Theme & Styling'
  | 'State & Runtime'
  | 'Core Utilities';

const APP_LINKS: Record<string, { label: string; href: string }> = {
  beat: { label: 'Beat', href: '/beat/' },
  chords: { label: 'Chords', href: '/chords/' },
  drums: { label: 'Drums', href: '/drums/' },
  piano: { label: 'Piano', href: '/piano/' },
  words: { label: 'Words', href: '/words/' },
  ui: { label: 'UI Gallery', href: '/ui/' },
};

const UI_TABS: CatalogTab[] = ['gallery', 'docs', 'theme', 'regression'];
const REGRESSION_SECTIONS: RegressionRouteSection[] = ['screenshots', 'report'];

/** Map hash segments to current routes; legacy `failures` / `baselines` → `screenshots`. */
function normalizeRegressionSection(sectionPart: string): RegressionRouteSection {
  const s = sectionPart.trim().toLowerCase();
  if (s === 'failures' || s === 'baselines' || s === 'screenshots' || s === '') return 'screenshots';
  if (REGRESSION_SECTIONS.includes(s as RegressionRouteSection)) return s as RegressionRouteSection;
  return 'screenshots';
}

function parseHashState(hash: string): {
  tab: CatalogTab;
  regressionSection: RegressionRouteSection;
  /** `#regression/runner` — expand runner log; section is Screenshots. */
  expandRunnerLog: boolean;
} {
  const normalized = hash.replace(/^#\/?/, '').trim().toLowerCase();
  const [tabPart, sectionPart = ''] = normalized.split('/');
  const tab = (UI_TABS.includes(tabPart as CatalogTab) ? tabPart : 'gallery') as CatalogTab;
  const expandRunnerLog = sectionPart === 'runner';
  const routedSection = expandRunnerLog ? 'screenshots' : sectionPart;
  const regressionSection = normalizeRegressionSection(routedSection);
  return { tab, regressionSection, expandRunnerLog };
}

function getBpmClass(surface: BpmSurface): string {
  switch (surface) {
    case 'words':
      return 'ui-words-bpm-input';
    case 'chords':
      return 'chords-bpm-input';
    case 'beat':
      return 'shared-bpm-input ui-beat-bpm-input';
    case 'drums':
      return 'drums-shared-bpm-input';
    case 'piano':
      return 'sb-shared-bpm-input';
    default:
      return 'ui-bpm-default';
  }
}

function getBpmDropdownClass(surface: BpmSurface): string | undefined {
  switch (surface) {
    case 'words':
      return 'ui-words-bpm-dropdown';
    case 'chords':
      return 'chords-bpm-dropdown';
    case 'beat':
      return 'beat-bpm-dropdown';
    case 'piano':
      return 'piano-bpm-dropdown';
    case 'drums':
      return 'drums-bpm-dropdown';
    default:
      return undefined;
  }
}

function getBpmSliderClass(surface: BpmSurface): string | undefined {
  switch (surface) {
    case 'words':
      return 'ui-words-bpm-slider';
    case 'chords':
      return 'chords-bpm-slider';
    case 'piano':
      return 'piano-bpm-slider';
    case 'beat':
      return 'beat-bpm-slider';
    case 'drums':
      return 'drums-bpm-slider';
    default:
      return undefined;
  }
}

function getKeyClass(surface: KeySurface): string {
  switch (surface) {
    case 'words':
      return 'ui-words-key-input';
    case 'chords':
      return 'chords-key-input';
    case 'beat':
      return 'shared-key-input ui-beat-key-input';
    case 'piano':
      return 'ui-piano-key-input';
    default:
      return 'ui-key-default';
  }
}

function getKeyDropdownClass(surface: KeySurface): string | undefined {
  switch (surface) {
    case 'words':
      return 'ui-words-key-dropdown';
    case 'chords':
      return 'chords-key-dropdown';
    case 'beat':
      return 'beat-key-dropdown';
    default:
      return undefined;
  }
}

function getProgressionDropdownClass(appearance: Appearance): string | undefined {
  switch (appearance) {
    case 'words':
      return 'words-section-chord-dropdown';
    case 'chords':
      return 'option-chip-dropdown';
    case 'piano':
      return 'ep-prog-dropdown';
    default:
      return undefined;
  }
}

function getProgressionInputClass(appearance: Appearance): string {
  switch (appearance) {
    case 'words':
      return 'words-section-chord-input';
    case 'chords':
      return 'option-chip-inline-progression';
    case 'piano':
      return 'ui-piano-prog-input';
    default:
      return 'ui-default-prog-input';
  }
}

function getProgressionTextInputClass(appearance: Appearance): string | undefined {
  switch (appearance) {
    case 'chords':
      return 'option-chip-inline-input';
    case 'piano':
      return 'ep-custom-prog-input';
    default:
      return undefined;
  }
}

function getStyleDropdownClass(appearance: Appearance): string | undefined {
  switch (appearance) {
    case 'words':
      return 'words-section-style-dropdown';
    case 'chords':
      return 'ui-chords-style-dropdown';
    case 'piano':
      return 'ep-style-dropdown';
    default:
      return undefined;
  }
}

function getStyleInputClass(appearance: Appearance): string {
  switch (appearance) {
    case 'words':
      return 'words-chord-style-input';
    case 'chords':
      return 'ui-chords-style-input';
    case 'piano':
      return 'ui-piano-style-input';
    default:
      return 'ui-default-style-input';
  }
}

function getStyleTriggerClass(appearance: Appearance): string | undefined {
  if (appearance === 'piano') return 'ep-custom-prog-input';
  return undefined;
}

function sortCatalog(entries: ReadonlyArray<SharedCatalogEntry>) {
  const rank = new Map(KIND_ORDER.map((kind, index) => [kind, index]));
  return [...entries].sort((a, b) => {
    const kindOrder = (rank.get(a.kind) ?? 999) - (rank.get(b.kind) ?? 999);
    if (kindOrder !== 0) return kindOrder;
    const nameOrder = a.name.localeCompare(b.name);
    if (nameOrder !== 0) return nameOrder;
    return a.path.localeCompare(b.path);
  });
}

const FUNCTIONAL_SECTION_ORDER: FunctionalSection[] = [
  'Shared UI Components',
  'Music Input & Theory',
  'Rhythm & Timing',
  'Notation & Rendering',
  'Audio & Playback',
  'Theme & Styling',
  'State & Runtime',
  'Core Utilities',
];

function getFunctionalSection(entry: SharedCatalogEntry): FunctionalSection {
  const path = entry.path.toLowerCase();
  const name = entry.name.toLowerCase();
  const tags = entry.tags.map((tag) => tag.toLowerCase());
  const hasTag = (value: string) => tags.includes(value);

  if (path.includes('/shared/components/') || entry.kind === 'component') {
    return 'Shared UI Components';
  }
  if (
    path.includes('/shared/music/') ||
    name.includes('chord') ||
    name.includes('key') ||
    name.includes('bpm') ||
    hasTag('music')
  ) {
    return 'Music Input & Theory';
  }
  if (
    path.includes('/shared/rhythm/') ||
    name.includes('tempo') ||
    name.includes('timing') ||
    hasTag('rhythm')
  ) {
    return 'Rhythm & Timing';
  }
  if (
    path.includes('/shared/notation/') ||
    name.includes('notation') ||
    name.includes('vex')
  ) {
    return 'Notation & Rendering';
  }
  if (
    path.includes('/shared/audio/') ||
    path.includes('/shared/playback/') ||
    name.includes('metronome') ||
    hasTag('audio') ||
    hasTag('playback')
  ) {
    return 'Audio & Playback';
  }
  if (
    path.includes('/theme/') ||
    name.includes('theme') ||
    name.includes('token') ||
    hasTag('theme') ||
    hasTag('css')
  ) {
    return 'Theme & Styling';
  }
  if (entry.kind === 'hook' || entry.kind === 'service') {
    return 'State & Runtime';
  }
  return 'Core Utilities';
}

function renderAppsUsingLinks(appsUsing: ReadonlyArray<string>) {
  if (appsUsing.length === 0) return <span>Unused</span>;
  return (
    <span className="ui-app-links">
      {appsUsing.map((app, index) => {
        const meta = APP_LINKS[app];
        const label = meta?.label ?? app.toUpperCase();
        const href = meta?.href;
        return (
          <span key={`app-${app}`}>
            {index > 0 ? ', ' : null}
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {label}
              </a>
            ) : (
              label
            )}
          </span>
        );
      })}
    </span>
  );
}

function BpmMultiDemo({
  values,
  onChange,
}: {
  values: Record<BpmSurface, number>;
  onChange: (surface: BpmSurface, next: number) => void;
}) {
  return (
    <div className="ui-variant-grid">
      {BPM_SURFACES.map((appearance) => (
        <section
          key={`bpm-${appearance}`}
          className={`ui-preview-card ui-theme-${appearance}`}
        >
          <header>{appearance}</header>
          {appearance === 'words' ? (
            <label className="ui-words-inline-control ui-words-inline-control-bpm">
              bpm
              <BpmInput
                value={values[appearance]}
                onChange={(next) => onChange(appearance, next)}
                className={getBpmClass(appearance)}
                dropdownClassName={getBpmDropdownClass(appearance)}
                sliderClassName={getBpmSliderClass(appearance)}
                trailingActions={(
                  <button
                    type="button"
                    className="ui-words-inline-dice-button ui-words-icon-tooltip"
                    aria-label="Randomize tempo"
                    onClick={() => {
                      const next = Math.round(80 + Math.random() * 70);
                      onChange(appearance, next);
                    }}
                  >
                    <DiceIcon variant="single" size={15} />
                  </button>
                )}
              />
            </label>
          ) : appearance === 'chords' ? (
            <div className="option-chip-row">
              <span className="option-chip-label">Tempo:</span>
              <div className="option-chip-container">
                <div className="chords-tempo-shell">
                  <BpmInput
                    value={values[appearance]}
                    onChange={(next) => onChange(appearance, next)}
                    className={getBpmClass(appearance)}
                    dropdownClassName={getBpmDropdownClass(appearance)}
                    sliderClassName={getBpmSliderClass(appearance)}
                  />
                </div>
              </div>
            </div>
          ) : appearance === 'piano' ? (
            <div className="sb-tempo">
              <label className="sb-label">BPM</label>
              <BpmInput
                value={values[appearance]}
                onChange={(next) => onChange(appearance, next)}
                className={getBpmClass(appearance)}
                dropdownClassName={getBpmDropdownClass(appearance)}
                sliderClassName={getBpmSliderClass(appearance)}
              />
            </div>
          ) : appearance === 'drums' ? (
            <div className="bpm-control-inline">
              <BpmInput
                value={values[appearance]}
                onChange={(next) => onChange(appearance, next)}
                className={getBpmClass(appearance)}
                dropdownClassName={getBpmDropdownClass(appearance)}
                sliderClassName={getBpmSliderClass(appearance)}
              />
              <span className="input-suffix">BPM</span>
            </div>
          ) : (
            <BpmInput
              value={values[appearance]}
              onChange={(next) => onChange(appearance, next)}
              className={getBpmClass(appearance)}
              dropdownClassName={getBpmDropdownClass(appearance)}
              sliderClassName={getBpmSliderClass(appearance)}
            />
          )}
        </section>
      ))}
    </div>
  );
}

function KeyMultiDemo({
  values,
  onChange,
}: {
  values: Record<KeySurface, MusicKey>;
  onChange: (surface: KeySurface, next: MusicKey) => void;
}) {
  return (
    <div className="ui-variant-grid">
      {KEY_SURFACES.map((appearance) => (
        <section key={`key-${appearance}`} className={`ui-preview-card ui-theme-${appearance}`}>
          <header>{appearance}</header>
          {appearance === 'words' ? (
            <label className="ui-words-inline-control">
              key
              <KeyInput
                value={values[appearance]}
                onChange={(next) => onChange(appearance, next)}
                className={getKeyClass(appearance)}
                dropdownClassName={getKeyDropdownClass(appearance)}
                trailingActions={(
                  <button
                    type="button"
                    className="ui-words-inline-dice-button ui-words-icon-tooltip"
                    aria-label="Randomize key"
                    onClick={() => {
                      const next = ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)] as MusicKey;
                      onChange(appearance, next);
                    }}
                  >
                    <DiceIcon variant="single" size={15} />
                  </button>
                )}
              />
            </label>
          ) : appearance === 'chords' ? (
            <div className="option-chip-row">
              <span className="option-chip-label">Key:</span>
              <div className="option-chip-container">
                <div className="chords-key-shell">
                  <KeyInput
                    value={values[appearance]}
                    onChange={(next) => onChange(appearance, next)}
                    className={getKeyClass(appearance)}
                    dropdownClassName={getKeyDropdownClass(appearance)}
                    showStepButtons
                  />
                </div>
              </div>
            </div>
          ) : (
            <KeyInput
              value={values[appearance]}
              onChange={(next) => onChange(appearance, next)}
              className={getKeyClass(appearance)}
              dropdownClassName={getKeyDropdownClass(appearance)}
              showStepButtons={appearance !== 'beat'}
            />
          )}
        </section>
      ))}
    </div>
  );
}

function ProgressionMultiDemo({
  values,
  onChange,
  keys,
}: {
  values: Record<Appearance, string>;
  onChange: (appearance: Appearance, next: string) => void;
  keys: Record<KeySurface, MusicKey>;
}) {
  return (
    <div className="ui-variant-grid">
      {APPEARANCES.map((appearance) => (
        <section key={`prog-${appearance}`} className={`ui-preview-card ui-theme-${appearance}`}>
          <header>{appearance}</header>
          {appearance === 'chords' ? (
            <div className="option-chip-row">
              <span className="option-chip-label">Progression:</span>
              <div className="option-chip-container">
                <div className="option-chip">
                  <ChordProgressionInput
                    value={values[appearance]}
                    onChange={(next) => onChange(appearance, next)}
                    onSelectPreset={(index) => {
                      const preset = COMMON_CHORD_PROGRESSIONS[index];
                      if (!preset) return;
                      onChange(appearance, preset.progression.join('–'));
                    }}
                    appearance={appearance}
                    className={getProgressionInputClass(appearance)}
                    inputClassName={getProgressionTextInputClass(appearance)}
                    showResolvedForKey
                    keyContext={keys.chords}
                    presetColumns={2}
                    dropdownClassName={getProgressionDropdownClass(appearance)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <ChordProgressionInput
              value={values[appearance]}
              onChange={(next) => onChange(appearance, next)}
              onSelectPreset={(index) => {
                const preset = COMMON_CHORD_PROGRESSIONS[index];
                if (!preset) return;
                onChange(appearance, preset.progression.join('–'));
              }}
              appearance={appearance}
              className={getProgressionInputClass(appearance)}
              inputClassName={getProgressionTextInputClass(appearance)}
              showResolvedForKey
              keyContext={
                appearance === 'default'
                  ? keys.default
                  : appearance === 'words'
                    ? keys.words
                    : keys.piano
              }
              presetColumns={2}
              dropdownClassName={getProgressionDropdownClass(appearance)}
            />
          )}
        </section>
      ))}
    </div>
  );
}

function StyleMultiDemo({
  values,
  onChange,
}: {
  values: Record<Appearance, ChordStyleId>;
  onChange: (appearance: Appearance, next: ChordStyleId) => void;
}) {
  return (
    <div className="ui-variant-grid">
      {APPEARANCES.map((appearance) => (
        <section key={`style-${appearance}`} className={`ui-preview-card ui-theme-${appearance}`}>
          <header>{appearance}</header>
          <ChordStyleInput
            value={values[appearance]}
            onChange={(next) => onChange(appearance, next as ChordStyleId)}
            options={CHORD_STYLE_OPTIONS}
            appearance={appearance}
            className={getStyleInputClass(appearance)}
            triggerClassName={getStyleTriggerClass(appearance)}
            menuColumns={2}
            dropdownClassName={getStyleDropdownClass(appearance)}
          />
        </section>
      ))}
    </div>
  );
}

function DrumNotationMiniPresetDemo() {
  const signature = useMemo(() => ({ numerator: 4, denominator: 4 }), []);
  const presets = useMemo(() => getRhythmTemplatePresets(signature), [signature]);
  const [notationBySurface, setNotationBySurface] = useState<
    Record<DrumNotationSurface, string>
  >(() => ({
    words: presets[1]?.notation ?? presets[0]?.notation ?? 'D-T-__T-D---T---',
    beat: presets[2]?.notation ?? presets[0]?.notation ?? 'D-T-__T-D---T---',
  }));

  const getSurfaceNotationStyle = (
    surface: DrumNotationSurface
  ): 'light' | NotationStyle => {
    if (surface === 'beat') {
      return {
        staffColor: '#c8c4d8',
        noteColor: '#c8c4d8',
        textColor: '#c8c4d8',
        highlightColor: '#22c55e',
      };
    }
    return 'light';
  };

  const getSurfaceNotationWrapClass = (surface: DrumNotationSurface): string =>
    surface === 'beat'
      ? 'ui-mini-notation-wrap vexflow-mini-container'
      : 'ui-mini-notation-wrap words-template-preview words-section-template-preview';

  return (
    <div className="ui-variant-grid">
      {DRUM_NOTATION_SURFACES.map((surface) => {
        const notation = notationBySurface[surface];
        const parsed = parseRhythm(notation, signature);
        return (
          <section
            key={`drum-mini-${surface}`}
            className={`ui-preview-card ui-theme-${surface}`}
          >
            <header>{surface}</header>
            <label className="ui-rhythm-template-input">
              Rhythm template
              <input
                type="text"
                value={notation}
                onChange={(event) =>
                  setNotationBySurface((previous) => ({
                    ...previous,
                    [surface]: event.target.value,
                  }))
                }
              />
            </label>
            <div className="ui-rhythm-preset-row">
              {presets.map((preset) => (
                <button
                  key={`${surface}-${preset.id}`}
                  type="button"
                  className={`ui-rhythm-preset-chip${
                    notation === preset.notation ? ' is-active' : ''
                  }`}
                  onClick={() =>
                    setNotationBySurface((previous) => ({
                      ...previous,
                      [surface]: preset.notation,
                    }))
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className={getSurfaceNotationWrapClass(surface)}>
              {parsed.isValid && parsed.measures.length > 0 ? (
                <DrumNotationMini
                  rhythm={parsed}
                  width={300}
                  height={120}
                  style={getSurfaceNotationStyle(surface)}
                  showDrumSymbols={true}
                />
              ) : (
                <p className="ui-rhythm-template-error">
                  Notation is invalid for 4/4.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function buildExportDemoAdapter(surface: ExportSurface): ExportSourceAdapter {
  const base = {
    defaultFormat: 'wav' as const,
    estimateDurationSeconds: (loopCount: number) => 8 * loopCount,
    renderAudio: async (request: ExportAudioRenderRequest) => {
      const { selectedStemIds } = request;
      const audioContext = new OfflineAudioContext(2, 44100, 44100);
      const makeBuffer = (gain = 0.12) => {
        const buffer = audioContext.createBuffer(2, 44100, 44100);
        for (let channel = 0; channel < 2; channel += 1) {
          const data = buffer.getChannelData(channel);
          for (let i = 0; i < data.length; i += 1) {
            const t = i / 44100;
            data[i] = Math.sin(2 * Math.PI * 220 * t) * gain;
          }
        }
        return buffer;
      };
      const stems: Record<string, AudioBuffer> = {};
      for (const stemId of selectedStemIds) stems[stemId] = makeBuffer(0.1);
      return {
        mix: makeBuffer(0.14),
        stems,
      };
    },
  };

  switch (surface) {
    case 'piano':
      return {
        ...base,
        id: 'piano',
        title: 'Piano Export',
        fileBaseName: 'ui-piano-export',
        stems: [
          { id: 'right-hand', label: 'Right Hand', defaultSelected: true },
          { id: 'left-hand', label: 'Left Hand', defaultSelected: true },
        ],
        supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
        renderMidi: async () => new Uint8Array([0x4d, 0x54, 0x68, 0x64]),
      };
    case 'words':
      return {
        ...base,
        id: 'words',
        title: 'Words Export',
        fileBaseName: 'ui-words-export',
        stems: [
          { id: 'piano', label: 'Piano', defaultSelected: true },
          { id: 'drums', label: 'Drums', defaultSelected: true },
        ],
        supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
        renderMidi: async () => new Uint8Array([0x4d, 0x54, 0x68, 0x64]),
      };
    case 'chords':
      return {
        ...base,
        id: 'chords',
        title: 'Chords Export',
        fileBaseName: 'ui-chords-export',
        stems: [
          { id: 'treble', label: 'Treble', defaultSelected: true },
          { id: 'bass', label: 'Bass', defaultSelected: true },
        ],
        supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
        renderMidi: async () => new Uint8Array([0x4d, 0x54, 0x68, 0x64]),
      };
    case 'drums':
      return {
        ...base,
        id: 'drums',
        title: 'Drums Export',
        fileBaseName: 'ui-drums-export',
        stems: [{ id: 'drums', label: 'Drums', defaultSelected: true }],
        supportsFormat: (format) => ['midi', 'wav', 'mp3', 'ogg', 'flac'].includes(format),
        renderMidi: async () => new Uint8Array([0x4d, 0x54, 0x68, 0x64]),
      };
    case 'beat':
      return {
        ...base,
        id: 'beat',
        title: 'Beat Export',
        fileBaseName: 'ui-beat-export',
        stems: [{ id: 'mix', label: 'Full Mix', defaultSelected: true }],
        supportsFormat: (format) => ['wav', 'mp3', 'ogg', 'flac'].includes(format),
      };
  }
}

function SharedExportPopoverDemo() {
  const [openBySurface, setOpenBySurface] = useState<Record<ExportSurface, boolean>>({
    piano: false,
    words: false,
    chords: false,
    drums: false,
    beat: false,
  });
  const [anchorBySurface, setAnchorBySurface] = useState<Record<ExportSurface, HTMLElement | null>>({
    piano: null,
    words: null,
    chords: null,
    drums: null,
    beat: null,
  });

  return (
    <div className="ui-variant-grid">
      {EXPORT_SURFACES.map((surface) => {
        const adapter = buildExportDemoAdapter(surface);
        return (
          <section key={`export-${surface}`} className={`ui-preview-card ui-theme-${surface}`}>
            <header>{surface}</header>
            <div className="ui-demo-inline">
              <button
                type="button"
                className="ui-demo-button"
                onClick={(event) => {
                  setAnchorBySurface((prev) => ({ ...prev, [surface]: event.currentTarget }));
                  setOpenBySurface((prev) => ({ ...prev, [surface]: true }));
                }}
              >
                Open export
              </button>
            </div>
            <SharedExportPopover
              open={openBySurface[surface]}
              anchorEl={anchorBySurface[surface]}
              onClose={() => setOpenBySurface((prev) => ({ ...prev, [surface]: false }))}
              adapter={adapter}
              persistKey={`ui-demo-${surface}`}
            />
          </section>
        );
      })}
    </div>
  );
}

function DemoPanel({
  entry,
  bpmBySurface,
  setBpmBySurface,
  keyBySurface,
  setKeyBySurface,
  progressionByAppearance,
  setProgressionByAppearance,
  styleByAppearance,
  setStyleByAppearance,
  metronomeEnabled,
  setMetronomeEnabled,
}: {
  entry: SharedCatalogEntry;
  bpmBySurface: Record<BpmSurface, number>;
  setBpmBySurface: Dispatch<SetStateAction<Record<BpmSurface, number>>>;
  keyBySurface: Record<KeySurface, MusicKey>;
  setKeyBySurface: Dispatch<SetStateAction<Record<KeySurface, MusicKey>>>;
  progressionByAppearance: Record<Appearance, string>;
  setProgressionByAppearance: Dispatch<SetStateAction<Record<Appearance, string>>>;
  styleByAppearance: Record<Appearance, ChordStyleId>;
  setStyleByAppearance: Dispatch<SetStateAction<Record<Appearance, ChordStyleId>>>;
  metronomeEnabled: boolean;
  setMetronomeEnabled: (next: boolean) => void;
}) {
  switch (entry.demoId) {
    case 'bpm-input':
      return (
        <BpmMultiDemo
          values={bpmBySurface}
          onChange={(surface, next) =>
            setBpmBySurface((prev) => ({ ...prev, [surface]: next }))
          }
        />
      );
    case 'key-input':
      return (
        <KeyMultiDemo
          values={keyBySurface}
          onChange={(surface, next) =>
            setKeyBySurface((prev) => ({ ...prev, [surface]: next }))
          }
        />
      );
    case 'chord-progression-input':
      return (
        <ProgressionMultiDemo
          values={progressionByAppearance}
          onChange={(appearance, next) =>
            setProgressionByAppearance((prev) => ({ ...prev, [appearance]: next }))
          }
          keys={keyBySurface}
        />
      );
    case 'chord-style-input':
      return (
        <StyleMultiDemo
          values={styleByAppearance}
          onChange={(appearance, next) =>
            setStyleByAppearance((prev) => ({ ...prev, [appearance]: next }))
          }
        />
      );
    case 'app-tooltip':
      return (
        <div className="ui-demo-inline">
          <AppTooltip title="Shared tooltip primitive with consistent behavior.">
            <button type="button" className="ui-demo-button">
              Hover me
            </button>
          </AppTooltip>
        </div>
      );
    case 'metronome-toggle':
      return (
        <div className="ui-demo-inline">
          <MetronomeToggleButton
            enabled={metronomeEnabled}
            onToggle={() => setMetronomeEnabled(!metronomeEnabled)}
            className="ui-metronome-toggle"
          />
        </div>
      );
    case 'dice-icon':
      return (
        <div className="ui-demo-inline">
          <span className="ui-dice-swatch">
            <DiceIcon size={18} />
          </span>
          <span className="ui-dice-swatch">
            <DiceIcon size={18} variant="multiple" />
          </span>
        </div>
      );
    case 'shared-export-popover':
      return <SharedExportPopoverDemo />;
    case 'drum-notation-mini':
      return <DrumNotationMiniPresetDemo />;
    default:
      return null;
  }
}

/** Minimal shape of `GET /__regression/summary` for the header notification badge. */
type RegressionSummaryForBadge = {
  failures?: unknown[] | null;
  audio?: { driftCount?: number } | null;
  visual?: {
    lastRun?: {
      status?: string;
      failedTests?: unknown[] | null;
    } | null;
  } | null;
};

function countRegressionAttentionNeedsReview(data: RegressionSummaryForBadge): number {
  const failureCards = data.failures?.length ?? 0;
  const drift = data.audio?.driftCount ?? 0;
  const last = data.visual?.lastRun;
  const listedFails = last?.failedTests?.length ?? 0;
  const statusFailed = last?.status === 'failed';
  const visualCount = Math.max(failureCards, statusFailed ? Math.max(listedFails, 1) : listedFails);
  return visualCount + drift;
}

function App() {
  const [activeTab, setActiveTab] = useState<CatalogTab>(() => parseHashState(window.location.hash).tab);
  const [regressionSection, setRegressionSection] = useState<RegressionRouteSection>(() =>
    parseHashState(window.location.hash).regressionSection
  );
  const [runnerExpandNonce, setRunnerExpandNonce] = useState(() =>
    parseHashState(window.location.hash).expandRunnerLog ? 1 : 0
  );
  const [regressionAttentionCount, setRegressionAttentionCount] = useState<number | null>(null);
  const [kindFilter, setKindFilter] = useState<'all' | SharedCatalogKind>('all');
  const [query, setQuery] = useState('');
  const [bpmBySurface, setBpmBySurface] = useState<Record<BpmSurface, number>>({
    default: 96,
    piano: 88,
    words: 104,
    chords: 120,
    beat: 92,
    drums: 100,
  });
  const [keyBySurface, setKeyBySurface] = useState<Record<KeySurface, MusicKey>>({
    default: 'C',
    piano: 'F',
    words: 'G',
    chords: 'D',
    beat: 'Bb',
  });
  const [progressionByAppearance, setProgressionByAppearance] = useState<Record<Appearance, string>>({
    default: 'I–V–vi–IV',
    piano: 'I–vi–IV–V',
    words: 'G-C-Am-F',
    chords: 'ii–V–I',
  });
  const [styleByAppearance, setStyleByAppearance] = useState<Record<Appearance, ChordStyleId>>({
    default: 'simple',
    piano: 'oom-pahs',
    words: 'pop-rock-ballad',
    chords: 'one-per-beat',
  });
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [densityDrafts, setDensityDrafts] = useState({
    compact: 'I–V–vi–IV',
    comfortable: 'ii–V–I',
    touch: 'Db–Ab–Bbm–Gb',
  });
  const [collapsedSections, setCollapsedSections] = useState<Set<FunctionalSection>>(
    () => new Set()
  );

  const sortedEntries = useMemo(() => sortCatalog(SHARED_CATALOG), []);
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortedEntries.filter((entry) => {
      if (kindFilter !== 'all' && entry.kind !== kindFilter) return false;
      if (!normalizedQuery) return true;
      return (
        entry.name.toLowerCase().includes(normalizedQuery) ||
        entry.path.toLowerCase().includes(normalizedQuery) ||
        entry.description.toLowerCase().includes(normalizedQuery) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        entry.appsUsing.some((app) => app.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [kindFilter, query, sortedEntries]);
  const groupedFilteredEntries = useMemo(() => {
    const groups = new Map<FunctionalSection, SharedCatalogEntry[]>();
    for (const entry of filteredEntries) {
      const section = getFunctionalSection(entry);
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section)?.push(entry);
    }
    return FUNCTIONAL_SECTION_ORDER
      .map((section) => ({ section, entries: groups.get(section) ?? [] }))
      .filter((group) => group.entries.length > 0);
  }, [filteredEntries]);
  const isSectionCollapsed = (section: FunctionalSection) =>
    collapsedSections.has(section);
  const toggleSection = (section: FunctionalSection) => {
    setCollapsedSections((previous) => {
      const next = new Set(previous);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const demoEntries = filteredEntries.filter((entry) => Boolean(entry.demoId));

  const setTab = useCallback((tab: CatalogTab, sectionOverride?: RegressionRouteSection) => {
    setActiveTab(tab);
    const nextSection = sectionOverride ?? regressionSection;
    const nextHash = tab === 'regression' ? `#regression/${nextSection}` : `#${tab}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
  }, [regressionSection]);

  const setRegressionRoute = useCallback((section: RegressionRouteSection) => {
    setRegressionSection(section);
    if (activeTab !== 'regression') return;
    const nextHash = `#regression/${section}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
  }, [activeTab]);

  const jumpToDocsEntry = (entryId: string) => {
    setTab('docs');
    window.setTimeout(() => {
      const el = document.getElementById(`doc-${entryId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  useEffect(() => {
    const onHashChange = () => {
      const next = parseHashState(window.location.hash);
      setActiveTab(next.tab);
      setRegressionSection(next.regressionSection);
      if (next.expandRunnerLog) {
        setRunnerExpandNonce((n) => n + 1);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const refreshRegressionBadge = useCallback(async () => {
    try {
      const res = await fetch('/__regression/summary', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as RegressionSummaryForBadge;
      setRegressionAttentionCount(countRegressionAttentionNeedsReview(data));
    } catch {
      setRegressionAttentionCount(null);
    }
  }, []);

  useEffect(() => {
    void refreshRegressionBadge();
    const intervalId = window.setInterval(refreshRegressionBadge, 45_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshRegressionBadge();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshRegressionBadge]);

  useEffect(() => {
    if (activeTab === 'regression') void refreshRegressionBadge();
  }, [activeTab, refreshRegressionBadge]);

  const regressionBadgeLabel =
    regressionAttentionCount !== null && regressionAttentionCount > 0
      ? `${regressionAttentionCount > 99 ? '99+' : regressionAttentionCount} regression issues to review`
      : 'Regression';

  return (
    <main className="ui-docs-app">
      <header className="ui-docs-header ui-docs-header-sticky">
        <div className="ui-header-main-row">
          <div className="ui-header-brand">
            <div className="ui-header-logo" aria-hidden="true">UI</div>
            <div className="ui-header-titles">
              <p className="ui-docs-eyebrow">Design system</p>
              <h1>Labs UI Components</h1>
              <p className="ui-header-tagline-sr">
                Shared UI libraries used across Tiff Zhang Labs applications.
              </p>
            </div>
          </div>
          <div className="ui-header-nav">
            <div className="ui-tab-row" role="tablist" aria-label="Catalog views">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'gallery'}
                className={`ui-tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
                onClick={() => setTab('gallery')}
              >
                Gallery
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'docs'}
                className={`ui-tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setTab('docs')}
              >
                Docs
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'theme'}
                className={`ui-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
                onClick={() => setTab('theme')}
              >
                Theme
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'regression'}
                className={`ui-tab-btn ui-tab-btn--with-badge ${
                  activeTab === 'regression' ? 'active' : ''
                }`}
                aria-label={regressionBadgeLabel}
                onClick={() => setTab('regression', 'screenshots')}
              >
                Regression
                {regressionAttentionCount !== null && regressionAttentionCount > 0 ? (
                  <span className="ui-regression-nav-badge" aria-hidden>
                    {regressionAttentionCount > 99 ? '99+' : regressionAttentionCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="ui-docs-card">
        {activeTab === 'gallery' || activeTab === 'docs' ? (
          <div className="ui-docs-controls">
            <label>
              Kind
              <select
                value={kindFilter}
                onChange={(event) =>
                  setKindFilter(event.target.value as 'all' | SharedCatalogKind)
                }
              >
                <option value="all">All</option>
                {KIND_ORDER.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="name, path, description, app, tag"
              />
            </label>
          </div>
        ) : null}

        {activeTab === 'docs' ? (
          <div className="ui-docs-layout">
            <aside className="ui-docs-sidebar" aria-label="Table of contents">
              <h3>Table of Contents</h3>
              <p>{filteredEntries.length} entries</p>
              <nav className="ui-toc-list">
                {groupedFilteredEntries.map((group) => (
                  <section key={`toc-group-${group.section}`} className="ui-toc-section">
                    <button
                      type="button"
                      className="ui-toc-section-toggle"
                      onClick={() => toggleSection(group.section)}
                    >
                      <span>{group.section}</span>
                      <small>{group.entries.length}</small>
                    </button>
                    {!isSectionCollapsed(group.section) ? (
                      <div className="ui-toc-links">
                        {group.entries.map((entry) => (
                          <button
                            type="button"
                            key={`toc-${entry.id}`}
                            className="ui-toc-link"
                            onClick={() => jumpToDocsEntry(entry.id)}
                          >
                            {entry.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ))}
              </nav>
            </aside>
            <div className="ui-catalog-grid">
              {groupedFilteredEntries.map((group) => (
                <section key={`catalog-group-${group.section}`} className="ui-catalog-section">
                  <button
                    type="button"
                    className="ui-catalog-section-toggle"
                    onClick={() => toggleSection(group.section)}
                  >
                    <h2 className="ui-catalog-section-title">{group.section}</h2>
                    <span>{group.entries.length}</span>
                  </button>
                  {!isSectionCollapsed(group.section) ? (
                    <div className="ui-catalog-section-grid">
                      {group.entries.map((entry) => (
                        <article id={`doc-${entry.id}`} key={entry.id} className="ui-catalog-card">
                          <header className="ui-catalog-card-header">
                            <h2>{entry.name}</h2>
                            <div className="ui-chip-row">
                              <span className={`ui-chip ui-chip-kind ui-kind-${entry.kind}`}>
                                {entry.kind}
                              </span>
                              <span className={`ui-chip ui-chip-stability ui-stability-${entry.stability}`}>
                                {entry.stability}
                              </span>
                              <span className="ui-chip ui-chip-owner">{entry.owner}</span>
                            </div>
                          </header>

                          {entry.demoId ? (
                            <div className="ui-live-preview">
                              <DemoPanel
                                entry={entry}
                                bpmBySurface={bpmBySurface}
                                setBpmBySurface={setBpmBySurface}
                                keyBySurface={keyBySurface}
                                setKeyBySurface={setKeyBySurface}
                                progressionByAppearance={progressionByAppearance}
                                setProgressionByAppearance={setProgressionByAppearance}
                                styleByAppearance={styleByAppearance}
                                setStyleByAppearance={setStyleByAppearance}
                                metronomeEnabled={metronomeEnabled}
                                setMetronomeEnabled={setMetronomeEnabled}
                              />
                            </div>
                          ) : null}

                          <p className="ui-card-description">{entry.description}</p>
                          <div className="ui-meta-grid">
                            <p>
                              <strong>Path:</strong> <code>{entry.path}</code>
                            </p>
                            <p>
                              <strong>Export:</strong> <code>{entry.exportType}</code>
                            </p>
                            <p>
                              <strong>Used by:</strong> {renderAppsUsingLinks(entry.appsUsing)}
                            </p>
                          </div>
                          {entry.tags.length > 0 ? (
                            <div className="ui-tag-row">
                              {entry.tags.map((tag) => (
                                <span key={`${entry.id}-${tag}`} className="ui-chip ui-chip-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        ) : activeTab === 'gallery' ? (
          <div className="ui-gallery-grid">
            {demoEntries.map((entry) => (
              <article key={`gallery-${entry.id}`} className="ui-gallery-item">
                <header className="ui-gallery-item-header">
                  <h2>{entry.name}</h2>
                  <button
                    type="button"
                    className="ui-doc-link-btn"
                    onClick={() => jumpToDocsEntry(entry.id)}
                  >
                    Open docs
                  </button>
                </header>
                <div className="ui-live-preview ui-live-preview-flat">
                  <DemoPanel
                    entry={entry}
                    bpmBySurface={bpmBySurface}
                    setBpmBySurface={setBpmBySurface}
                    keyBySurface={keyBySurface}
                    setKeyBySurface={setKeyBySurface}
                    progressionByAppearance={progressionByAppearance}
                    setProgressionByAppearance={setProgressionByAppearance}
                    styleByAppearance={styleByAppearance}
                    setStyleByAppearance={setStyleByAppearance}
                    metronomeEnabled={metronomeEnabled}
                    setMetronomeEnabled={setMetronomeEnabled}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : activeTab === 'theme' ? (
          <div className="ui-theme-tab">
            <section className="ui-theme-foundation" aria-label="Default theme foundation">
              <h2>Default Theme Foundation</h2>
              <p className="ui-theme-copy">
                The default contract uses semantic tokens and density buckets so shared controls
                stay visually consistent while each app can still override palette and spacing.
              </p>
              <div className="ui-theme-swatches">
                <span className="ui-theme-swatch ui-swatch-primary">Primary</span>
                <span className="ui-theme-swatch ui-swatch-accent">Accent</span>
                <span className="ui-theme-swatch ui-swatch-surface">Surface</span>
                <span className="ui-theme-swatch ui-swatch-border">Border</span>
              </div>
              <div className="ui-size-buckets">
                <div className="ui-size-demo compact">
                  <strong>Compact</strong>
                  <label htmlFor="density-compact">Progression</label>
                  <input
                    id="density-compact"
                    value={densityDrafts.compact}
                    onChange={(event) =>
                      setDensityDrafts((prev) => ({ ...prev, compact: event.target.value }))
                    }
                  />
                  <button type="button">Apply</button>
                </div>
                <div className="ui-size-demo comfortable">
                  <strong>Comfortable</strong>
                  <label htmlFor="density-comfortable">Progression</label>
                  <input
                    id="density-comfortable"
                    value={densityDrafts.comfortable}
                    onChange={(event) =>
                      setDensityDrafts((prev) => ({ ...prev, comfortable: event.target.value }))
                    }
                  />
                  <button type="button">Apply</button>
                </div>
                <div className="ui-size-demo touch">
                  <strong>Touch</strong>
                  <label htmlFor="density-touch">Progression</label>
                  <input
                    id="density-touch"
                    value={densityDrafts.touch}
                    onChange={(event) =>
                      setDensityDrafts((prev) => ({ ...prev, touch: event.target.value }))
                    }
                  />
                  <button type="button">Apply</button>
                </div>
              </div>
            </section>
            <section className="ui-theme-guidance">
              <article>
                <h3>Material Design in Labs</h3>
                <p>
                  We follow Material principles for hierarchy, spacing rhythm, interactive states,
                  and elevation while still using app-specific visual identity tokens.
                </p>
              </article>
              <article>
                <h3>Relationship to Material UI</h3>
                <p>
                  `getAppTheme()` bridges the shared token contract into MUI so MUI components and
                  CSS-first shared controls render with the same palette, spacing, radius, and
                  typography choices.
                </p>
              </article>
              <article>
                <h3>How apps should apply MUI</h3>
                <p>
                  Wrap each app with `ThemeProvider` using its app theme id, define semantic
                  `--theme-*` CSS variables at the app root, and pass explicit dropdown class hooks
                  for portal-rendered menus to preserve app-level context.
                </p>
              </article>
            </section>
          </div>
        ) : (
          <RegressionPanel
            routeSection={regressionSection}
            onRouteSectionChange={setRegressionRoute}
            runnerExpandNonce={runnerExpandNonce}
          />
        )}
      </section>
    </main>
  );
}

export default App;
