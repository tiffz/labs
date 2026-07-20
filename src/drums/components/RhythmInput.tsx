import React, { useState, useRef, useEffect, lazy, Suspense, useMemo } from 'react';
import type { TimeSignature, ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { } from '../utils/timeSignatureUtils';
import RhythmPresets from './RhythmPresets';
import DrumSymbolIcon from './DrumSymbolIcon';
import { detectTabType, isTab, type TabType } from '../utils/tabDetector';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import { formatRhythm } from '../utils/formatting';
import AppTooltip from '../../shared/components/AppTooltip';

const TabImportWizard = lazy(() =>
  import('./TabImportWizard').then((m) => ({ default: m.TabImportWizard })),
);

/** Export pulls lamejs/ffmpeg/MIDI builders — keep off the first-paint graph. */
const SharedExportPopover = lazy(() => import('../../shared/components/music/SharedExportPopover'));

interface RhythmInputProps {
  notation: string;
  onNotationChange: (notation: string) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  parsedRhythm: ParsedRhythm;
  bpm: number;
  playbackSettings: PlaybackSettings;
  metronomeEnabled: boolean;
  onClear: () => void;
  onDeleteLast: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRandomize: () => void;
  onShare: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  canUndo: boolean;
  canRedo: boolean;
}

const RhythmInput: React.FC<RhythmInputProps> = ({
  notation,
  onNotationChange,
  timeSignature,
  onTimeSignatureChange,
  parsedRhythm,
  bpm,
  playbackSettings,
  metronomeEnabled,
  onClear,
  onDeleteLast,
  onUndo,
  onRedo,
  onRandomize,
  onShare,
  canUndo,
  canRedo,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showTabImportModal, setShowTabImportModal] = useState(false);
  const [pastedTabText, setPastedTabText] = useState('');
  const [pastedTabType, setPastedTabType] = useState<TabType>('unknown');
  const [exportAdapter, setExportAdapter] = useState<ExportSourceAdapter | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  const exportAdapterOptions = useMemo(
    () => ({
      rhythm: parsedRhythm,
      bpm,
      playbackSettings,
      metronomeEnabled,
      notation,
      timeSignature,
    }),
    [parsedRhythm, bpm, playbackSettings, metronomeEnabled, notation, timeSignature],
  );

  useEffect(() => {
    if (!showDownloadDropdown) return;
    let cancelled = false;
    void import('../utils/exportAdapter').then(({ createDrumsExportAdapter }) => {
      if (cancelled) return;
      setExportAdapter(createDrumsExportAdapter(exportAdapterOptions));
    });
    return () => {
      cancelled = true;
    };
  }, [showDownloadDropdown, exportAdapterOptions]);

  // NOTE: Selection syncing between display and textarea has been disabled
  // because it doesn't work correctly with repeat syntax (|x3, %, etc.)
  // and was causing random text highlighting while typing.
  // Users can manage their own textarea selection naturally while editing.

  // Validate and filter input to only allow valid notation characters
  const handleNotationChange = (value: string) => {
    // Allow: D, d, T, t, K, k, S, s (slap), _ (rest), - (extend), space, newline
    // Also allow repeat syntax: % (simile), | (barline), x (multiplier), digits (repeat count)
    // Also allow : for section repeats (|: ... :|)
    const validChars = /^[DdTtKkSs_\-\s\n%|x:\d]*$/;
    if (validChars.test(value)) {
      onNotationChange(value);
    }
    // If invalid characters are present, ignore the change
  };

  // Handle paste events to detect tab format (drum or guitar)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');

    // Check if the pasted content looks like a tab (drum or guitar)
    if (isTab(pastedText)) {
      e.preventDefault(); // Don't paste the raw text
      setPastedTabText(pastedText);
      setPastedTabType(detectTabType(pastedText));
      setShowTabImportModal(true);
    }
    // Otherwise, let the normal paste handling occur
  };

  // Handle tab import confirmation
  const handleTabImport = (convertedNotation: string) => {
    onNotationChange(convertedNotation);
    setShowTabImportModal(false);
    setPastedTabText('');
    setPastedTabType('unknown');
  };

  // Handle tab import cancellation
  const handleTabCancel = () => {
    setShowTabImportModal(false);
    setPastedTabText('');
    setPastedTabType('unknown');
  };

  // Auto-resize textarea on mount and when notation changes
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      // Only resize if focused
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (inputRef.current && document.activeElement === inputRef.current) {
            inputRef.current.style.height = 'auto';
            const scrollHeight = inputRef.current.scrollHeight;
            inputRef.current.style.height = `${Math.max(scrollHeight, 2.5 * 16)}px`;
          }
        });
      });
    }
  }, [notation]);

  // Auto-format notation to put 2 measures per line (matching VexFlow display)
  const handleBlur = () => {
    if (!notation) return;
    const formatted = formatRhythm(notation, timeSignature);
    if (formatted !== notation) {
      onNotationChange(formatted);
    }
  };


  return (
    <div className="input-section">
      <div className="input-section-content">
        <div className="input-header">
          <div className="input-label-group">
            <label className="input-label" htmlFor="rhythm-notation-input">
              Rhythm Notation
            </label>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- hover wrapper; button inside is the interactive element */}
            <div
              className="help-button-wrapper"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <button
                className="help-button"
                onClick={() => setShowTooltip(!showTooltip)}
                type="button"
                aria-label="Show notation help"
              >
                ?
              </button>
              {showTooltip && (
                <div className="tooltip notation-guide-tooltip">
                <div className="tooltip-title">Notation Guide</div>

                <div className="notation-guide__body">
                  <section className="notation-guide__panel">
                    <h4 className="notation-guide__label">Drum sounds</h4>
                    <div className="notation-guide__sound-grid">
                      <div className="notation-guide__sound-item">
                        <DrumSymbolIcon sound="dum" size={22} className="notation-guide__glyph" />
                        <span><code>D</code> Dum</span>
                      </div>
                      <div className="notation-guide__sound-item">
                        <DrumSymbolIcon sound="tak" size={22} className="notation-guide__glyph" />
                        <span><code>T</code> Tak</span>
                      </div>
                      <div className="notation-guide__sound-item">
                        <DrumSymbolIcon sound="ka" size={22} className="notation-guide__glyph" />
                        <span><code>K</code> Ka</span>
                      </div>
                      <div className="notation-guide__sound-item">
                        <DrumSymbolIcon sound="slap" size={22} className="notation-guide__glyph" />
                        <span><code>S</code> Slap</span>
                      </div>
                      <div className="notation-guide__sound-item notation-guide__sound-item--wide">
                        <span className="notation-guide__glyph notation-guide__glyph--rest" aria-hidden>_</span>
                        <span><code>_</code> Rest</span>
                      </div>
                    </div>
                  </section>

                  <section className="notation-guide__panel notation-guide__panel--rules">
                    <div className="notation-guide__rule-block">
                      <h4 className="notation-guide__label">Duration</h4>
                      <ul className="notation-guide__list">
                        <li>Dashes (<code>-</code>) extend duration</li>
                        <li>Each character = 16th note</li>
                      </ul>
                    </div>
                    <div className="notation-guide__rule-block">
                      <h4 className="notation-guide__label">Dotted notes</h4>
                      <ul className="notation-guide__list">
                        <li><code>D--</code> dotted 8th</li>
                        <li><code>D-----</code> dotted quarter</li>
                      </ul>
                    </div>
                    <div className="notation-guide__rule-block">
                      <h4 className="notation-guide__label">Repeats</h4>
                      <ul className="notation-guide__list">
                        <li><code>%</code> repeat previous measure</li>
                        <li><code>|x4</code> repeat measure ×4</li>
                        <li><code>|: … :| x4</code> repeat section ×4</li>
                      </ul>
                    </div>
                  </section>
                </div>

                <div className="tooltip-attribution">
                  Notation from <a href="http://www.khafif.com/rhy/" target="_blank" rel="noopener noreferrer">Khafif Middle Eastern Rhythms</a>, <a href="https://www.amirschoolofmusic.com/store/p/pdf-mastering-darbuka-1" target="_blank" rel="noopener noreferrer">Mastering Darbuka</a>, and <a href="https://en.wikipedia.org/wiki/Dumbek_rhythms#Notation" target="_blank" rel="noopener noreferrer">Dumbek rhythms</a>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Edit Controls */}
          <div className="rhythm-edit-controls">
            <RhythmPresets
              currentNotation={notation}
              currentTimeSignature={timeSignature}
              onSelectPreset={(notation, ts) => {
                onNotationChange(notation);
                onTimeSignatureChange(ts);
              }}
              onImportTab={() => {
                setPastedTabText('');
                setPastedTabType('unknown');
                setShowTabImportModal(true);
              }}
            />
            <div className="icon-button-group">
              <AppTooltip title="Share">
                <button
                  className="icon-button"
                  onClick={(e) => onShare(e)}
                  type="button"
                  aria-label="Share rhythm"
                >
                  <span className="material-symbols-outlined">share</span>
                </button>
              </AppTooltip>
              <div style={{ position: 'relative' }}>
                <AppTooltip title="Download">
                  <button
                    ref={downloadButtonRef}
                    className="icon-button"
                    onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                    type="button"
                    aria-label="Download rhythm"
                  >
                    <span className="material-symbols-outlined">download</span>
                  </button>
                </AppTooltip>
                {showDownloadDropdown && exportAdapter && (
                  <Suspense fallback={null}>
                    <SharedExportPopover
                      open={showDownloadDropdown}
                      anchorEl={downloadButtonRef.current}
                      onClose={() => setShowDownloadDropdown(false)}
                      adapter={exportAdapter}
                      persistKey="drums"
                    />
                  </Suspense>
                )}
              </div>
              <AppTooltip title="Randomize">
                <button
                  className="icon-button"
                  onClick={onRandomize}
                  type="button"
                  aria-label="Randomize rhythm"
                >
                  <span className="material-symbols-outlined">shuffle</span>
                </button>
              </AppTooltip>
              <AppTooltip title="Undo">
                <button
                  className="icon-button"
                  onClick={onUndo}
                  type="button"
                  disabled={!canUndo}
                  aria-label="Undo"
                >
                  <span className="material-symbols-outlined">undo</span>
                </button>
              </AppTooltip>
              <AppTooltip title="Redo">
                <button
                  className="icon-button"
                  onClick={onRedo}
                  type="button"
                  disabled={!canRedo}
                  aria-label="Redo"
                >
                  <span className="material-symbols-outlined">redo</span>
                </button>
              </AppTooltip>
              <AppTooltip title="Delete Last Note">
                <button
                  className="icon-button"
                  onClick={onDeleteLast}
                  type="button"
                  disabled={notation.length === 0}
                  aria-label="Delete last note"
                >
                  <span className="material-symbols-outlined">backspace</span>
                </button>
              </AppTooltip>
              <AppTooltip title="Clear">
                <button
                  className="icon-button icon-button-danger"
                  onClick={onClear}
                  type="button"
                  disabled={notation.length === 0}
                  aria-label="Clear rhythm"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </AppTooltip>
            </div>
          </div>
        </div>

        {/* Input field */}
        <div className="rhythm-input-container">
          <textarea
            ref={inputRef}
            id="rhythm-notation-input"
            className="input-field input-field-expandable"
            value={notation}
            onPaste={handlePaste}
            onChange={(e) => {
              handleNotationChange(e.target.value);
              // Auto-resize textarea if focused
              if (inputRef.current && document.activeElement === inputRef.current) {
                requestAnimationFrame(() => {
                  if (inputRef.current && document.activeElement === inputRef.current) {
                    inputRef.current.style.height = 'auto';
                    const scrollHeight = inputRef.current.scrollHeight;
                    inputRef.current.style.height = `${Math.max(scrollHeight, 2.5 * 16)}px`;
                  }
                });
              }
            }}
            onBlur={() => {
              handleBlur();
              // Collapse to single line on blur
              if (inputRef.current) {
                inputRef.current.style.height = '2.5rem';
              }
            }}
            onFocus={() => {
              // Expand on focus to 4 lines tall
              if (inputRef.current) {
                inputRef.current.style.height = '6rem'; // ~4 lines (1.5rem per line)
              }
            }}
            placeholder="D-T-__T-D---T---"
            spellCheck={false}
            rows={1}
          />
          {/* Visual feedback is handled by the canvas preview - no separate UI here */}
        </div>
      </div>

      {/* Tab Import Wizard (supports drum and guitar tabs) */}
      {showTabImportModal ? (
        <Suspense fallback={null}>
          <TabImportWizard
            isOpen={showTabImportModal}
            onClose={handleTabCancel}
            onImport={(notation) => handleTabImport(notation)}
            rawTabText={pastedTabText}
            initialTabType={pastedTabType}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default RhythmInput;


