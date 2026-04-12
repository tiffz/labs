import { useState } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SubdivisionVolumes } from '../engine/types';
import type { SongProfile } from '../storage/pulseStorage';

interface SongProfileManagerProps {
  currentBpm: number;
  currentTimeSignature: TimeSignature;
  currentVolumes: SubdivisionVolumes;
  currentBeatGrouping?: string;
  profiles: SongProfile[];
  onSave: (name: string, profile: Omit<SongProfile, 'id' | 'name' | 'createdAt' | 'updatedAt'>) => void;
  onLoad: (profile: SongProfile) => void;
  onDelete: (id: number) => void;
}

export function SongProfileManager({
  currentBpm,
  currentTimeSignature,
  currentVolumes,
  currentBeatGrouping,
  profiles,
  onSave,
  onLoad,
  onDelete,
}: SongProfileManagerProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, {
      bpm: currentBpm,
      timeSignature: currentTimeSignature,
      volumes: currentVolumes,
      beatGrouping: currentBeatGrouping,
    });
    setName('');
  };

  return (
    <div>
      <div className="pulse-save-row">
        <input
          className="pulse-save-input"
          type="text"
          placeholder="Profile name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          aria-label="Profile name"
        />
        <button className="pulse-save-btn" onClick={handleSave} type="button">
          SAVE
        </button>
      </div>

      <div className="pulse-profile-list">
        {profiles.length === 0 && (
          <div className="pulse-profile-meta" style={{ textAlign: 'center', padding: 12 }}>
            No saved profiles
          </div>
        )}
        {profiles.map((p) => (
          <div className="pulse-profile-item" key={p.id}>
            <div>
              <div className="pulse-profile-name">{p.name}</div>
              <div className="pulse-profile-meta">
                {p.bpm} BPM · {p.timeSignature.numerator}/{p.timeSignature.denominator}
                {p.beatGrouping ? ` (${p.beatGrouping})` : ''}
              </div>
            </div>
            <div className="pulse-profile-actions">
              <button
                className="pulse-profile-btn"
                onClick={() => onLoad(p)}
                type="button"
              >
                LOAD
              </button>
              <button
                className="pulse-profile-btn is-danger"
                onClick={() => onDelete(p.id!)}
                type="button"
              >
                DEL
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
