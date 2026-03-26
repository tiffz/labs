import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import BpmInput from '../shared/components/music/BpmInput';
import KeyInput from '../shared/components/music/KeyInput';
import ChordProgressionInput from '../shared/components/music/ChordProgressionInput';
import ChordStyleInput from '../shared/components/music/ChordStyleInput';
import DiceIcon from '../shared/components/DiceIcon';
import AppTooltip from '../shared/components/AppTooltip';
import MetronomeToggleButton from '../shared/components/MetronomeToggleButton';
import DrumNotationMini from '../shared/notation/DrumNotationMini';
import { COMMON_CHORD_PROGRESSIONS } from '../shared/music/commonChordProgressions';
import { CHORD_STYLE_OPTIONS, type ChordStyleId } from '../piano/data/chordExercises';
import { ALL_KEYS, type MusicKey } from '../shared/music/musicInputConstants';
import { parseRhythm } from '../shared/rhythm';
import {
  SHARED_CATALOG,
  type SharedCatalogEntry,
  type SharedCatalogKind,
} from './generatedSharedCatalog';

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
type CatalogTab = 'docs' | 'gallery';
const BPM_SURFACES = ['default', 'piano', 'words', 'chords', 'beat', 'drums'] as const;
const KEY_SURFACES = ['default', 'piano', 'words', 'chords', 'beat'] as const;
type BpmSurface = (typeof BPM_SURFACES)[number];
type KeySurface = (typeof KEY_SURFACES)[number];

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

function getAppsLabel(entry: SharedCatalogEntry): string {
  if (entry.appsUsing.length === 0) return 'Unused';
  return entry.appsUsing.map((app) => app.toUpperCase()).join(', ');
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
                    : appearance === 'chords'
                      ? keys.chords
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
            showOnLabel
            onLabelText="On"
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
    case 'drum-notation-mini': {
      const rhythm = parseRhythm('D-T-K-T-', { numerator: 4, denominator: 4 });
      return (
        <div className="ui-mini-notation-wrap">
          <DrumNotationMini rhythm={rhythm} width={280} height={120} style="light" />
        </div>
      );
    }
    default:
      return null;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<CatalogTab>('docs');
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

  const componentsCount = SHARED_CATALOG.filter((entry) => entry.kind === 'component').length;
  const utilityCount = SHARED_CATALOG.filter((entry) => entry.kind === 'utility').length;
  const withDemoCount = SHARED_CATALOG.filter((entry) => entry.demoId).length;
  const demoEntries = filteredEntries.filter((entry) => Boolean(entry.demoId));

  const jumpToDocsEntry = (entryId: string) => {
    setActiveTab('docs');
    window.setTimeout(() => {
      const el = document.getElementById(`doc-${entryId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  return (
    <main className="ui-docs-app">
      <header className="ui-docs-header">
        <p className="ui-docs-eyebrow">Shared UI</p>
        <h1>Unified Shared Catalog</h1>
        <p>
          One card per shared export: live preview when available, plus docs,
          path, ownership, and app usage in the same place.
        </p>
        <div className="ui-summary-row">
          <article>
            <strong>{SHARED_CATALOG.length}</strong>
            <span>Exports tracked</span>
          </article>
          <article>
            <strong>{componentsCount}</strong>
            <span>Component exports</span>
          </article>
          <article>
            <strong>{utilityCount}</strong>
            <span>Utility exports</span>
          </article>
          <article>
            <strong>{withDemoCount}</strong>
            <span>Live demo-ready</span>
          </article>
        </div>
        <div className="ui-tab-row" role="tablist" aria-label="Catalog views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'docs'}
            className={`ui-tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            Docs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'gallery'}
            className={`ui-tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            Gallery
          </button>
        </div>
      </header>

      <section className="ui-docs-card">
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

        {activeTab === 'docs' ? (
          <div className="ui-docs-layout">
            <aside className="ui-docs-sidebar" aria-label="Table of contents">
              <h3>Table of Contents</h3>
              <p>{filteredEntries.length} entries</p>
              <nav className="ui-toc-list">
                {filteredEntries.map((entry) => (
                  <button
                    type="button"
                    key={`toc-${entry.id}`}
                    className="ui-toc-item"
                    onClick={() => jumpToDocsEntry(entry.id)}
                  >
                    <span>{entry.name}</span>
                    <small>{entry.kind}</small>
                  </button>
                ))}
              </nav>
            </aside>
            <div className="ui-catalog-grid">
              {filteredEntries.map((entry) => (
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
                      <strong>Used by:</strong> {getAppsLabel(entry)}
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
          </div>
        ) : (
          <div className="ui-gallery-grid">
            {demoEntries.map((entry) => (
              <article key={`gallery-${entry.id}`} className="ui-gallery-card">
                <header className="ui-gallery-card-header">
                  <h2>{entry.name}</h2>
                  <button
                    type="button"
                    className="ui-doc-link-btn"
                    onClick={() => jumpToDocsEntry(entry.id)}
                  >
                    Open docs
                  </button>
                </header>
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
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
