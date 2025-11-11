import React from 'react';
import type { TimeSignature } from '../types';

interface PlaybackControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
  isPlaying,
  onPlay,
  onStop,
}) => {
  const handleNumeratorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimeSignatureChange({
      ...timeSignature,
      numerator: parseInt(e.target.value, 10),
    });
  };

  const handleDenominatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTimeSignatureChange({
      ...timeSignature,
      denominator: parseInt(e.target.value, 10),
    });
  };

  return (
    <div className="playback-controls-bar">
      {/* Timing Controls */}
      <div className="timing-controls">
        <div className="timing-inputs">
          <div className="time-signature-control">
            <label htmlFor="time-sig-numerator" className="sr-only">Time signature numerator</label>
            <select
              id="time-sig-numerator"
              className="control-select"
              value={timeSignature.numerator}
              onChange={handleNumeratorChange}
              aria-label="Time signature numerator"
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="9">9</option>
              <option value="12">12</option>
            </select>
            <span className="time-sig-slash">/</span>
            <select
              className="control-select"
              value={timeSignature.denominator}
              onChange={handleDenominatorChange}
              aria-label="Time signature denominator"
            >
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
          </div>
          <div className="bpm-control-inline">
            <label htmlFor="bpm-input" className="sr-only">BPM</label>
            <input
              id="bpm-input"
              type="number"
              className="control-input"
              value={bpm}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onBpmChange(120);
                } else {
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    onBpmChange(num);
                  }
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value, 10);
                if (isNaN(num) || num < 20) {
                  onBpmChange(20);
                } else if (num > 300) {
                  onBpmChange(300);
                }
              }}
              min="20"
              max="300"
              disabled={isPlaying}
              placeholder="BPM"
            />
            <span className="input-suffix">BPM</span>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="playback-buttons">
        {!isPlaying ? (
          <button
            className="play-button"
            onClick={onPlay}
            type="button"
            aria-label="Play rhythm (Spacebar)"
            title="Play (Spacebar)"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Play
          </button>
        ) : (
          <button
            className="stop-button"
            onClick={onStop}
            type="button"
            aria-label="Stop playback (Spacebar)"
            title="Stop (Spacebar)"
          >
            <span className="material-symbols-outlined">stop</span>
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default PlaybackControls;

