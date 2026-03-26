import { useMemo, useState } from 'react';
import BpmInput from '../shared/components/music/BpmInput';
import KeyInput from '../shared/components/music/KeyInput';
import ChordProgressionInput from '../shared/components/music/ChordProgressionInput';
import ChordStyleInput from '../shared/components/music/ChordStyleInput';
import DiceIcon from '../shared/components/DiceIcon';
import { COMMON_CHORD_PROGRESSIONS } from '../shared/music/commonChordProgressions';
import { CHORD_STYLE_OPTIONS, type ChordStyleId } from '../piano/data/chordExercises';
import { ALL_KEYS, type MusicKey } from '../shared/music/musicInputConstants';
import { SHARED_MODULES, type SharedModuleKind } from './sharedRegistry';

const KIND_ORDER: SharedModuleKind[] = ['component', 'hook', 'utility', 'model', 'service', 'doc'];
const APPEARANCES = ['default', 'piano', 'words', 'chords'] as const;
type Appearance = typeof APPEARANCES[number];
const BPM_SURFACES = ['default', 'piano', 'words', 'chords', 'beat', 'drums'] as const;
const KEY_SURFACES = ['default', 'piano', 'words', 'chords', 'beat'] as const;
type BpmSurface = typeof BPM_SURFACES[number];
type KeySurface = typeof KEY_SURFACES[number];

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
  switch (appearance) {
    case 'piano':
      return 'ep-custom-prog-input';
    default:
      return undefined;
  }
}

function sortByKindAndName() {
  const kindRank = new Map(KIND_ORDER.map((kind, index) => [kind, index]));
  return [...SHARED_MODULES].sort((a, b) => {
    const aRank = kindRank.get(a.kind) ?? 999;
    const bRank = kindRank.get(b.kind) ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

function App() {
  const [filter, setFilter] = useState<'all' | SharedModuleKind>('all');
  const [query, setQuery] = useState('');
  const [bpm, setBpm] = useState<Record<BpmSurface, number>>({
    default: 96,
    piano: 88,
    words: 104,
    chords: 120,
    beat: 92,
    drums: 100,
  });
  const [keys, setKeys] = useState<Record<KeySurface, MusicKey>>({
    default: 'C',
    piano: 'F',
    words: 'G',
    chords: 'D',
    beat: 'Bb',
  });
  const [progressions, setProgressions] = useState<Record<Appearance, string>>({
    default: 'I–V–vi–IV',
    piano: 'I–vi–IV–V',
    words: 'G-C-Am-F',
    chords: 'ii–V–I',
  });
  const [styleIds, setStyleIds] = useState<Record<Appearance, ChordStyleId>>({
    default: 'simple',
    piano: 'oom-pahs',
    words: 'pop-rock-ballad',
    chords: 'one-per-beat',
  });

  const modules = useMemo(sortByKindAndName, []);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return modules.filter((entry) => {
      if (filter !== 'all' && entry.kind !== filter) return false;
      if (!normalized) return true;
      return (
        entry.name.toLowerCase().includes(normalized) ||
        entry.path.toLowerCase().includes(normalized) ||
        entry.purpose.toLowerCase().includes(normalized) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(normalized))
      );
    });
  }, [filter, modules, query]);

  return (
    <main className="ui-docs-app">
      <header className="ui-docs-header">
        <p className="ui-docs-eyebrow">Shared UI</p>
        <h1>Shared UI Catalog</h1>
        <p>
          Build and validate shared controls in a docs-style workspace. Each section includes implementation
          guidance next to live, per-app style previews.
        </p>
      </header>

      <section className="ui-docs-card">
        <h2>Shared Components</h2>
        <p>
          Use these contracts as the baseline for app integration. App wrappers should primarily customize
          color, surface, and spacing while preserving shared interaction behavior.
        </p>

        <article className="ui-component-section">
          <div className="ui-component-docs">
            <h3>BpmInput</h3>
            <p>Tempo control with numeric steppers, slider, and common presets.</p>
            <div className="ui-doc-chips">
              <span>value</span>
              <span>onChange</span>
              <span>className</span>
              <span>dropdownClassName</span>
              <span>sliderClassName</span>
            </div>
            <pre className="ui-doc-snippet"><code>{`import BpmInput from '../shared/components/music/BpmInput';

<BpmInput
  value={tempo}
  onChange={setTempo}
  className="app-bpm-input"
/>`}</code></pre>
          </div>
          <div className="ui-gallery-track ui-gallery-track-docs">
            {BPM_SURFACES.map((appearance) => (
              <section
                key={`bpm-${appearance}`}
                className={`ui-preview-card ui-theme-${appearance}${appearance === 'beat' ? ' beat-app' : ''}`}
              >
                <header>{appearance}</header>
                {appearance === 'words' ? (
                  <label className="ui-words-inline-control ui-words-inline-control-bpm">
                    bpm
                    <BpmInput
                      value={bpm[appearance]}
                      onChange={(next) => setBpm((prev) => ({ ...prev, [appearance]: next }))}
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
                            setBpm((prev) => ({ ...prev, [appearance]: next }));
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
                          value={bpm[appearance]}
                          onChange={(next) => setBpm((prev) => ({ ...prev, [appearance]: next }))}
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
                      value={bpm[appearance]}
                      onChange={(next) => setBpm((prev) => ({ ...prev, [appearance]: next }))}
                      className={getBpmClass(appearance)}
                      dropdownClassName={getBpmDropdownClass(appearance)}
                      sliderClassName={getBpmSliderClass(appearance)}
                    />
                  </div>
                ) : appearance === 'drums' ? (
                  <div className="bpm-control-inline">
                    <BpmInput
                      value={bpm[appearance]}
                      onChange={(next) => setBpm((prev) => ({ ...prev, [appearance]: next }))}
                      className={getBpmClass(appearance)}
                      dropdownClassName={getBpmDropdownClass(appearance)}
                      sliderClassName={getBpmSliderClass(appearance)}
                    />
                    <span className="input-suffix">BPM</span>
                  </div>
                ) : (
                  <BpmInput
                    value={bpm[appearance]}
                    onChange={(next) => setBpm((prev) => ({ ...prev, [appearance]: next }))}
                    className={getBpmClass(appearance)}
                    dropdownClassName={getBpmDropdownClass(appearance)}
                    sliderClassName={getBpmSliderClass(appearance)}
                  />
                )}
              </section>
            ))}
          </div>
        </article>

        <article className="ui-component-section">
          <div className="ui-component-docs">
            <h3>KeyInput</h3>
            <p>Key selector with step controls and 12-key dropdown chip grid.</p>
            <div className="ui-doc-chips">
              <span>value</span>
              <span>onChange</span>
              <span>showStepButtons</span>
              <span>className</span>
              <span>dropdownClassName</span>
            </div>
            <pre className="ui-doc-snippet"><code>{`import KeyInput from '../shared/components/music/KeyInput';

<KeyInput
  value={key}
  onChange={setKey}
  showStepButtons
  className="app-key-input"
/>`}</code></pre>
          </div>
          <div className="ui-gallery-track ui-gallery-track-docs">
            {KEY_SURFACES.map((appearance) => (
              <section
                key={`key-${appearance}`}
                className={`ui-preview-card ui-theme-${appearance}${appearance === 'beat' ? ' beat-app' : ''}`}
              >
                <header>{appearance}</header>
                {appearance === 'words' ? (
                  <label className="ui-words-inline-control">
                    key
                    <KeyInput
                      value={keys[appearance]}
                      onChange={(next) =>
                        setKeys((prev) => ({ ...prev, [appearance]: next }))
                      }
                      className={getKeyClass(appearance)}
                      dropdownClassName={getKeyDropdownClass(appearance)}
                      trailingActions={(
                        <button
                          type="button"
                          className="ui-words-inline-dice-button ui-words-icon-tooltip"
                          aria-label="Randomize key"
                          onClick={() => {
                            const next = ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)] as MusicKey;
                            setKeys((prev) => ({ ...prev, [appearance]: next }));
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
                          value={keys[appearance]}
                          onChange={(next) =>
                            setKeys((prev) => ({ ...prev, [appearance]: next }))
                          }
                          className={getKeyClass(appearance)}
                          dropdownClassName={getKeyDropdownClass(appearance)}
                          showStepButtons
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <KeyInput
                    value={keys[appearance]}
                    onChange={(next) =>
                      setKeys((prev) => ({ ...prev, [appearance]: next }))
                    }
                    className={getKeyClass(appearance)}
                    dropdownClassName={getKeyDropdownClass(appearance)}
                    showStepButtons={appearance !== 'beat'}
                  />
                )}
              </section>
            ))}
          </div>
        </article>

        <article className="ui-component-section">
          <div className="ui-component-docs">
            <h3>ChordProgressionInput</h3>
            <p>Custom progression input with preset library and optional key-aware resolution.</p>
            <div className="ui-doc-chips">
              <span>value</span>
              <span>onChange</span>
              <span>onSelectPreset</span>
              <span>appearance</span>
              <span>keyContext</span>
            </div>
            <pre className="ui-doc-snippet"><code>{`import ChordProgressionInput from '../shared/components/music/ChordProgressionInput';

<ChordProgressionInput
  value={progression}
  onChange={setProgression}
  onSelectPreset={handlePreset}
  appearance="default"
  keyContext={key}
/>`}</code></pre>
          </div>
          <div className="ui-gallery-track ui-gallery-track-docs">
            {APPEARANCES.map((appearance) => (
              <section key={`prog-${appearance}`} className={`ui-preview-card ui-theme-${appearance}`}>
                <header>{appearance}</header>
                {appearance === 'chords' ? (
                  <div className="option-chip-row">
                    <span className="option-chip-label">Progression:</span>
                    <div className="option-chip-container">
                      <div className="option-chip">
                        <ChordProgressionInput
                          value={progressions[appearance]}
                          onChange={(next) =>
                            setProgressions((prev) => ({ ...prev, [appearance]: next }))
                          }
                          onSelectPreset={(index) => {
                            const preset = COMMON_CHORD_PROGRESSIONS[index];
                            if (!preset) return;
                            setProgressions((prev) => ({
                              ...prev,
                              [appearance]: preset.progression.join('–'),
                            }));
                          }}
                          appearance={appearance}
                          className={getProgressionInputClass(appearance)}
                          inputClassName={getProgressionTextInputClass(appearance)}
                          showResolvedForKey
                          keyContext={keys[appearance]}
                          presetColumns={2}
                          dropdownClassName={getProgressionDropdownClass(appearance)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChordProgressionInput
                    value={progressions[appearance]}
                    onChange={(next) =>
                      setProgressions((prev) => ({ ...prev, [appearance]: next }))
                    }
                    onSelectPreset={(index) => {
                      const preset = COMMON_CHORD_PROGRESSIONS[index];
                      if (!preset) return;
                      setProgressions((prev) => ({
                        ...prev,
                        [appearance]: preset.progression.join('–'),
                      }));
                    }}
                    appearance={appearance}
                    className={getProgressionInputClass(appearance)}
                    inputClassName={getProgressionTextInputClass(appearance)}
                    showResolvedForKey
                    keyContext={keys[appearance]}
                    presetColumns={2}
                    dropdownClassName={getProgressionDropdownClass(appearance)}
                  />
                )}
              </section>
            ))}
          </div>
        </article>

        <article className="ui-component-section">
          <div className="ui-component-docs">
            <h3>ChordStyleInput</h3>
            <p>Shared style picker with compact trigger and themed option cards.</p>
            <div className="ui-doc-chips">
              <span>value</span>
              <span>onChange</span>
              <span>options</span>
              <span>appearance</span>
              <span>dropdownClassName</span>
            </div>
            <pre className="ui-doc-snippet"><code>{`import ChordStyleInput from '../shared/components/music/ChordStyleInput';

<ChordStyleInput
  value={styleId}
  onChange={setStyleId}
  options={CHORD_STYLE_OPTIONS}
  appearance="default"
/>`}</code></pre>
          </div>
          <div className="ui-gallery-track ui-gallery-track-docs">
            {APPEARANCES.map((appearance) => (
              <section key={`style-${appearance}`} className={`ui-preview-card ui-theme-${appearance}`}>
                <header>{appearance}</header>
                <ChordStyleInput
                  value={styleIds[appearance]}
                  onChange={(next) =>
                    setStyleIds((prev) => ({
                      ...prev,
                      [appearance]: next as ChordStyleId,
                    }))
                  }
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
        </article>
      </section>

      <section className="ui-docs-card">
        <h2>Shared Code Inventory</h2>
        <p>Includes visual components and non-visual shared modules used across multiple apps.</p>
        <div className="ui-docs-controls">
          <label>
            Kind
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as 'all' | SharedModuleKind)}
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
              placeholder="name, purpose, tag, or path"
            />
          </label>
        </div>
        <div className="ui-docs-table-wrap">
          <table className="ui-docs-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Stability</th>
                <th>Owner</th>
                <th>Purpose</th>
                <th>Theming Hooks</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.kind}</td>
                  <td>{entry.stability}</td>
                  <td>{entry.owner}</td>
                  <td>{entry.purpose}</td>
                  <td>{entry.themingHooks?.join(', ') ?? '-'}</td>
                  <td>
                    <code>{entry.path}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
