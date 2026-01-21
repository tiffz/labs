import React, { useState, useRef, useEffect } from 'react';
import type { TimeSignature, ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { getSixteenthsPerMeasure } from '../utils/timeSignatureUtils';
import RhythmPresets from './RhythmPresets';
import DownloadDropdown from './DownloadDropdown';
import { TabImportWizard } from './TabImportWizard';
import { detectTabType, isTab, type TabType } from '../utils/tabDetector';
import { formatRhythm } from '../utils/formatting';

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
  downloadFormat: 'wav' | 'mp3';
  downloadLoops: number;
  onDownloadFormatChange: (format: 'wav' | 'mp3') => void;
  onDownloadLoopsChange: (loops: number) => void;
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
  downloadFormat,
  downloadLoops,
  onDownloadFormatChange,
  onDownloadLoopsChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showTabImportModal, setShowTabImportModal] = useState(false);
  const [pastedTabText, setPastedTabText] = useState('');
  const [pastedTabType, setPastedTabType] = useState<TabType>('unknown');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

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
            <button
              className="help-button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              type="button"
              aria-label="Show notation help"
            >
              ?
            </button>
            {showTooltip && (
              <div
                className="tooltip"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <div className="tooltip-title">Notation Guide</div>

                <div className="tooltip-section">
                  <strong>Drum Sounds:</strong>
                  <div className="tooltip-symbols">
                    <div className="tooltip-symbol-item">
                      <svg width="20" height="26" viewBox="-2 -10 16 30">
                        <path
                          d="M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13"
                          stroke="black"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span><code>D</code> = Dum (bass)</span>
                    </div>
                    <div className="tooltip-symbol-item">
                      <svg width="16" height="16" viewBox="-8 -8 16 16">
                        <path
                          d="M -6 6 L 0 -6 L 6 6"
                          stroke="black"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="miter"
                        />
                      </svg>
                      <span><code>T</code> = Tak (high)</span>
                    </div>
                    <div className="tooltip-symbol-item">
                      <svg width="16" height="16" viewBox="-8 -8 16 16">
                        <path
                          d="M -6 -6 L 0 6 L 6 -6"
                          stroke="black"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="miter"
                        />
                      </svg>
                      <span><code>K</code> = Ka (high)</span>
                    </div>
                    <div className="tooltip-symbol-item">
                      <svg width="16" height="16" viewBox="-8 -8 16 16">
                        <circle
                          cx="0"
                          cy="0"
                          r="7"
                          fill="black"
                          stroke="none"
                        />
                      </svg>
                      <span><code>S</code> = Slap (accented)</span>
                    </div>
                    <div className="tooltip-symbol-item">
                      <span><code>_</code> = Rest (silence)</span>
                    </div>
                  </div>
                </div>

                <div className="tooltip-section">
                  <strong>Duration:</strong>
                  <div className="tooltip-row">Add dashes (<code>-</code>) to extend duration</div>
                  <div className="tooltip-row">Each character = 16th note</div>
                </div>
                <div className="tooltip-section">
                  <strong>Dotted Notes:</strong>
                  <div className="tooltip-row"><code>D--</code> = dotted 8th (3 sixteenths)</div>
                  <div className="tooltip-row"><code>D-----</code> = dotted quarter (6 sixteenths)</div>
                </div>
                <div className="tooltip-section">
                  <strong>Repeats:</strong>
                  <div className="tooltip-row"><code>%</code> = Repeat previous measure</div>
                  <div className="tooltip-row"><code>|x4</code> = Repeat previous measure 4 times</div>
                  <div className="tooltip-row"><code>|: D ... :| x4</code> = Repeat section 4 times</div>
                </div>
                <div className="tooltip-attribution">
                  Notation from <a href="http://www.khafif.com/rhy/" target="_blank" rel="noopener noreferrer">Khafif Middle Eastern Rhythms</a>, <a href="https://www.amirschoolofmusic.com/store/p/pdf-mastering-darbuka-1" target="_blank" rel="noopener noreferrer">Mastering Darbuka</a>, and <a href="https://en.wikipedia.org/wiki/Dumbek_rhythms#Notation" target="_blank" rel="noopener noreferrer">Dumbek rhythms</a>
                </div>
              </div>
            )}
          </div>

          {/* Edit Controls */}
          <div className="rhythm-edit-controls">
            <RhythmPresets
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
              <button
                className="icon-button"
                onClick={(e) => onShare(e)}
                type="button"
                aria-label="Share rhythm"
                data-tooltip="Share"
              >
                <span className="material-symbols-outlined">share</span>
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  ref={downloadButtonRef}
                  className="icon-button"
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  type="button"
                  aria-label="Download rhythm"
                  data-tooltip="Download"
                >
                  <span className="material-symbols-outlined">download</span>
                </button>
                {showDownloadDropdown && (
                  <DownloadDropdown
                    rhythm={parsedRhythm}
                    notation={notation}
                    bpm={bpm}
                    playbackSettings={playbackSettings}
                    metronomeEnabled={metronomeEnabled}
                    isOpen={showDownloadDropdown}
                    onClose={() => setShowDownloadDropdown(false)}
                    buttonRef={downloadButtonRef}
                    format={downloadFormat}
                    loops={downloadLoops}
                    onFormatChange={onDownloadFormatChange}
                    onLoopsChange={onDownloadLoopsChange}
                  />
                )}
              </div>
              <button
                className="icon-button"
                onClick={onRandomize}
                type="button"
                aria-label="Randomize rhythm"
                data-tooltip="Randomize"
              >
                <span className="material-symbols-outlined">shuffle</span>
              </button>
              <button
                className="icon-button"
                onClick={onUndo}
                type="button"
                disabled={!canUndo}
                aria-label="Undo"
                data-tooltip="Undo"
              >
                <span className="material-symbols-outlined">undo</span>
              </button>
              <button
                className="icon-button"
                onClick={onRedo}
                type="button"
                disabled={!canRedo}
                aria-label="Redo"
                data-tooltip="Redo"
              >
                <span className="material-symbols-outlined">redo</span>
              </button>
              <button
                className="icon-button"
                onClick={onDeleteLast}
                type="button"
                disabled={notation.length === 0}
                aria-label="Delete last note"
                data-tooltip="Delete Last Note"
              >
                <span className="material-symbols-outlined">backspace</span>
              </button>
              <button
                className="icon-button icon-button-danger"
                onClick={onClear}
                type="button"
                disabled={notation.length === 0}
                aria-label="Clear rhythm"
                data-tooltip="Clear"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
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
      {showTabImportModal && (
        <TabImportWizard
          isOpen={showTabImportModal}
          onClose={handleTabCancel}
          onImport={(notation) => handleTabImport(notation)}
          rawTabText={pastedTabText}
          initialTabType={pastedTabType}
        />
      )}
    </div>
  );
};

export default RhythmInput;


