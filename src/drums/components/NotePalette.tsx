import React, { useState } from 'react';
import SimpleVexFlowNote from './SimpleVexFlowNote';
import { parsePatternToNotes } from '../utils/notationHelpers';
import { audioPlayer } from '../utils/audioPlayer';
import { COMMON_PATTERNS } from '../data/commonPatterns';
import type { TimeSignature } from '../types';

interface NotePaletteProps {
  onInsertPattern: (pattern: string) => void;
  remainingBeats: number;
  timeSignature: TimeSignature;
}

// Calculate duration of a pattern in sixteenths
function getPatternDuration(pattern: string): number {
  const notes = parsePatternToNotes(pattern);
  return notes.reduce((sum, note) => sum + note.duration, 0);
}

// Single note patterns organized by duration (rows) and sound (columns)
// Using Noto Music font for proper rendering of music symbols
// Duration in sixteenths: 1=sixteenth, 2=eighth, 3=dotted eighth, 4=quarter, 6=dotted quarter
// Unicode rest symbols (U+1D100–U+1D1FF):
// U+1D13B (𝄻) = Whole rest, U+1D13C (𝄼) = Half rest, U+1D13D (𝄽) = Quarter rest
// U+1D13E (𝄾) = Eighth rest, U+1D13F (𝄿) = Sixteenth rest
const SINGLE_NOTE_TABLE = {
  rows: [
    { noteSymbol: '𝅘𝅥.', restSymbol: '𝄽.', duration: 6 },  // Dotted quarter note / dotted quarter rest (quarter rest + dot)
    { noteSymbol: '𝅘𝅥', restSymbol: '𝄽', duration: 4 },   // Quarter note / quarter rest (U+1D13D)
    { noteSymbol: '𝅘𝅥𝅮.', restSymbol: '𝄾.', duration: 3 },  // Dotted eighth note / dotted eighth rest
    { noteSymbol: '𝅘𝅥𝅮', restSymbol: '𝄾', duration: 2 },   // Eighth note / eighth rest (U+1D13E)
    { noteSymbol: '𝅘𝅥𝅯', restSymbol: '𝄿', duration: 1 },   // Sixteenth note / sixteenth rest (U+1D13F)
  ],
  columns: [
    { sound: 'D', label: 'Dum', isRest: false },
    { sound: 'T', label: 'Tak', isRest: false },
    { sound: 'K', label: 'Ka', isRest: false },
    { sound: '_', label: 'Rest', isRest: true },
  ],
};

// Common drum patterns are now imported from data/commonPatterns.ts

const NotePalette: React.FC<NotePaletteProps> = ({ onInsertPattern, remainingBeats }) => {
  const [soundPreviewEnabled, setSoundPreviewEnabled] = useState(true);

  // Helper to create pattern string
  const createPattern = (sound: string, duration: number): string => {
    if (duration === 1) return sound;
    if (sound === '.') {
      return '.'.repeat(duration);
    }
    return sound + '-'.repeat(duration - 1);
  };

  // Check if pattern can be added
  const canAddPattern = (patternDuration: number): boolean => {
    // Check if pattern fits in remaining beats
    return patternDuration <= remainingBeats;
  };

  // Play preview of pattern sounds
  const playPatternPreview = (pattern: string) => {
    if (!soundPreviewEnabled) return;

    const notes = parsePatternToNotes(pattern);
    let delay = 0;
    const msPerSixteenth = 150; // Fast preview tempo

    notes.forEach(note => {
      setTimeout(() => {
        audioPlayer.play(note.sound);
      }, delay);
      delay += note.duration * msPerSixteenth;
    });
  };

  const handleInsertPattern = (pattern: string) => {
    playPatternPreview(pattern);
    onInsertPattern(pattern);
  };

  return (
    <div className="note-palette">
      <div className="palette-header">
        <div className="palette-title-group">
          <h3>Note Palette</h3>
          <p className="palette-subtitle">Click to insert patterns</p>
        </div>
        <label className="sound-preview-toggle">
          <input
            type="checkbox"
            checked={soundPreviewEnabled}
            onChange={(e) => setSoundPreviewEnabled(e.target.checked)}
          />
          <span>Sound preview</span>
        </label>
      </div>

      <div className="palette-section single-notes-section">
        <h4 className="palette-section-title">Single Notes</h4>
        <div className="note-table">
        <table>
          <thead>
            <tr>
              {SINGLE_NOTE_TABLE.columns.map((col, idx) => (
                <th key={idx} className="symbol-header">
                  {col.sound === 'D' && (
                    <svg width="16" height="24" viewBox="-2 -10 16 30">
                      <path 
                        d="M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13" 
                        stroke="black" 
                        strokeWidth="1.8" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {col.sound === 'T' && (
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <path 
                        d="M -6 6 L 0 -6 L 6 6" 
                        stroke="black" 
                        strokeWidth="1.8" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="miter"
                      />
                    </svg>
                  )}
                  {col.sound === 'K' && (
                    <svg width="16" height="16" viewBox="-8 -8 16 16">
                      <path 
                        d="M -6 -6 L 0 6 L 6 -6" 
                        stroke="black" 
                        strokeWidth="1.8" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="miter"
                      />
                    </svg>
                  )}
                  {col.sound === '.' && <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>Rest</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SINGLE_NOTE_TABLE.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {SINGLE_NOTE_TABLE.columns.map((col, colIdx) => {
                  const pattern = createPattern(col.sound, row.duration);
                  const isDisabled = !canAddPattern(row.duration);
                  
                  // Use rest symbol for rest column, note symbol for others
                  const displaySymbol = col.isRest ? row.restSymbol : row.noteSymbol;
                  
                  return (
                    <td key={colIdx}>
                        <button
                          className="palette-button-simple notation-button"
                          onClick={() => handleInsertPattern(pattern)}
                          disabled={isDisabled}
                          title={isDisabled ? 'Would exceed measure length' : `Insert ${displaySymbol} ${col.label}`}
                        >
                        <span className="note-symbol">{displaySymbol}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="palette-section common-patterns-section">
        <h4 className="palette-section-title">Common Patterns</h4>
      <div className="palette-grid common-patterns">
        {COMMON_PATTERNS.map((pattern, index) => {
          const duration = getPatternDuration(pattern);
          const isDisabled = !canAddPattern(duration);
          return (
            <button
              key={index}
              className="palette-button notation-button"
              onClick={() => handleInsertPattern(pattern)}
              disabled={isDisabled}
              title={isDisabled ? 'Would exceed measure length' : `Insert ${pattern}`}
            >
              <SimpleVexFlowNote pattern={pattern} width={85} height={60} />
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default NotePalette;

