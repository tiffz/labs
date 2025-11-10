import React, { useState, useMemo } from 'react';
import RhythmInput from './components/RhythmInput';
import RhythmDisplay from './components/RhythmDisplay';
import { parseRhythm } from './utils/rhythmParser';
import type { TimeSignature } from './types';

const App: React.FC = () => {
  const [notation, setNotation] = useState<string>('D---T-K-D-D-T---');
  const [timeSignature, setTimeSignature] = useState<TimeSignature>({
    numerator: 4,
    denominator: 4,
  });

  const parsedRhythm = useMemo(() => {
    return parseRhythm(notation, timeSignature);
  }, [notation, timeSignature]);

  return (
    <div className="container">
      <header className="header">
        <h1>Darbuka Rhythm Trainer</h1>
        <p>Learn and practice Darbuka drum rhythms</p>
      </header>

      <RhythmInput
        notation={notation}
        onNotationChange={setNotation}
        timeSignature={timeSignature}
        onTimeSignatureChange={setTimeSignature}
      />

      <RhythmDisplay rhythm={parsedRhythm} />

      <footer style={{ textAlign: 'center', marginTop: '3rem', color: '#9ca3af' }}>
        <p>Made with ♡ for Darbuka enthusiasts</p>
      </footer>
    </div>
  );
};

export default App;

