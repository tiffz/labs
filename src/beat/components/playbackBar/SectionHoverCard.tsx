import React from 'react';
import TextField from '@mui/material/TextField';
import type { Section } from '../../utils/sectionDetector';
import type { KeyChange } from '../../utils/chordAnalyzer';
import {
  formatTime,
  getChordsForSection,
  getKeyChangeForSection,
  getTempoInfoForSection,
  type SectionTempoInfo,
} from './playbackBarHelpers';
import type { ChordEvent } from '../../utils/chordAnalyzer';
import type { TempoRegion } from '../../utils/tempoRegions';

export interface SectionHoverCardProps {
  section: Section;
  locked: boolean;
  draftLabel: string;
  onDraftLabelChange: (value: string) => void;
  position: { x: number; y: number };
  chordChanges: ChordEvent[];
  keyChanges: KeyChange[];
  tempoRegions?: TempoRegion[];
  onRenameSection?: (sectionId: string, label: string) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * Hover/selection tooltip for a timeline section. Pure leaf: owns no state
 * beyond the controlled draft label; consumer decides when to show/hide.
 */
export default function SectionHoverCard({
  section,
  locked,
  draftLabel,
  onDraftLabelChange,
  position,
  chordChanges,
  keyChanges,
  tempoRegions,
  onRenameSection,
  onPointerEnter,
  onPointerLeave,
}: SectionHoverCardProps) {
  const chords = getChordsForSection(section, chordChanges);
  const keyChange: KeyChange | null = getKeyChangeForSection(section, keyChanges);
  const tempoInfo: SectionTempoInfo = getTempoInfoForSection(section, tempoRegions);

  const commitRename = () => {
    if (!onRenameSection) return;
    const trimmed = draftLabel.trim();
    if (trimmed.length > 0 && trimmed !== section.label) {
      onRenameSection(section.id, trimmed);
    } else {
      onDraftLabelChange(section.label);
    }
  };

  return (
    <div
      className="section-hover-card"
      style={{
        left: `${Math.min(Math.max(position.x, 190), window.innerWidth - 190)}px`,
        top: `${position.y + 10}px`,
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {!locked && onRenameSection ? (
        <TextField
          value={draftLabel}
          size="small"
          className="section-hover-name-input"
          onChange={(event) => onDraftLabelChange(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter') commitRename();
            if (event.key === 'Escape') onDraftLabelChange(section.label);
          }}
        />
      ) : (
        <div className="section-hover-title">{section.label}</div>
      )}
      <div className="section-hover-times">
        <span>{formatTime(section.startTime)}</span>
        <span className="section-hover-arrow">→</span>
        <span>{formatTime(section.endTime)}</span>
      </div>
      <div className="section-hover-duration">
        Duration: {Math.round(section.endTime - section.startTime)}s
      </div>

      {locked && chords.length > 0 && (
        <div className="section-hover-chords">
          <span className="section-hover-label">Chords (estimated):</span>
          <span className="section-chord-list">{chords.join(' → ')}</span>
        </div>
      )}

      {locked && keyChange && (
        <div className="section-hover-key-change">
          <span className="material-symbols-outlined key-change-icon">change_circle</span>
          <span>
            Detected key change to <strong>{keyChange.key} {keyChange.scale}</strong>
          </span>
        </div>
      )}

      {locked && (tempoInfo.bpm || tempoInfo.description) && (
        <div className="section-hover-tempo">
          <span className="material-symbols-outlined tempo-icon">timer</span>
          <span>
            {tempoInfo.bpm && <strong>{tempoInfo.bpm} BPM</strong>}
            {tempoInfo.bpm && tempoInfo.description && ' · '}
            {tempoInfo.description && <em>{tempoInfo.description}</em>}
          </span>
        </div>
      )}

      <div className="section-hover-hint">
        Click to select · Shift+click to extend
      </div>
    </div>
  );
}
