import React, { useState, useMemo } from 'react';
import RhythmInput from './components/RhythmInput';
import RhythmDisplay from './components/RhythmDisplay';
import NotePalette from './components/NotePalette';
import { parseRhythm } from './utils/rhythmParser';
import type { TimeSignature } from './types';

const App: React.FC = () => {
  const [notation, setNotation] = useState<string>('D-T-..K-D---T---');
  const [timeSignature, setTimeSignature] = useState<TimeSignature>({
    numerator: 4,
    denominator: 4,
  });

  const parsedRhythm = useMemo(() => {
    return parseRhythm(notation, timeSignature);
  }, [notation, timeSignature]);

  // Calculate remaining beats in current measure (in sixteenths)
  const remainingBeats = useMemo(() => {
    // Calculate sixteenths per measure
    // For 4/4: 4 beats * (16 sixteenths / 4 quarter notes) = 16 sixteenths
    // For 3/4: 3 beats * (16 sixteenths / 4 quarter notes) = 12 sixteenths
    // For 6/8: 6 beats * (16 sixteenths / 8 eighth notes) = 12 sixteenths
    const beatsPerMeasure = timeSignature.denominator === 8
      ? timeSignature.numerator * 2  // eighth notes -> sixteenths
      : timeSignature.numerator * 4; // quarter notes -> sixteenths
    
    if (parsedRhythm.measures.length === 0) {
      return beatsPerMeasure; // Empty, so full measure available
    }
    
    const lastMeasure = parsedRhythm.measures[parsedRhythm.measures.length - 1];
    const remaining = beatsPerMeasure - lastMeasure.totalDuration;
    
    // If measure is complete (0 remaining), return full measure for next measure
    return remaining === 0 ? beatsPerMeasure : remaining;
  }, [parsedRhythm, timeSignature]);

  const handleInsertPattern = (pattern: string) => {
    // Append the pattern to the end of the current notation
    setNotation(prevNotation => prevNotation + pattern);
  };

  return (
    <div className="app-layout">
      {/* Main content area */}
      <div className="main-content">
        <header className="header-inline">
          <h1>Darbuka Rhythm Trainer</h1>
        </header>

        <div className="main-workspace">
          <RhythmInput
            notation={notation}
            onNotationChange={setNotation}
            timeSignature={timeSignature}
            onTimeSignatureChange={setTimeSignature}
          />

          <RhythmDisplay rhythm={parsedRhythm} />
        </div>

      </div>

      {/* Right sidebar: Note Palette (full height) */}
      <aside className="palette-sidebar">
        <NotePalette 
          onInsertPattern={handleInsertPattern} 
          remainingBeats={remainingBeats}
          timeSignature={timeSignature}
        />
      </aside>
    </div>
  );
};

export default App;

