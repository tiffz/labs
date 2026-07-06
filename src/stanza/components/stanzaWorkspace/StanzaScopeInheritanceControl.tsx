import AppTooltip from '../../../shared/components/AppTooltip';
import type { StanzaMetronomeTimingScope, StanzaSegmentMetronomeCalibration } from '../../db/stanzaDb';
import {
  resolveStanzaScopeBreadcrumbBpms,
} from '../../utils/stanzaScopePractice';
import type { ReactElement } from 'react';

export interface StanzaScopeInheritanceControlProps {
  timingScope: StanzaMetronomeTimingScope;
  onTimingScopeChange: (scope: StanzaMetronomeTimingScope) => void;
  sectionDisplayName: string;
  sectionToggleLabel: string;
  segmentCalibration?: StanzaSegmentMetronomeCalibration;
  songCalibration?: StanzaSegmentMetronomeCalibration;
  /** Live BPM from the calibration rail while the user edits (debounced persist). */
  liveRailBpm?: number;
  sectionHasCustomDrumPattern?: boolean;
}

export default function StanzaScopeInheritanceControl({
  timingScope,
  onTimingScopeChange,
  sectionDisplayName,
  sectionToggleLabel,
  segmentCalibration,
  songCalibration,
  liveRailBpm,
  sectionHasCustomDrumPattern = false,
}: StanzaScopeInheritanceControlProps): ReactElement {
  const { songBpm, sectionBpm } = resolveStanzaScopeBreadcrumbBpms({
    songCalibration,
    segmentCalibration,
    timingScope,
    liveRailBpm,
  });
  const sectionHasDistinctBpm = sectionBpm != null;
  const sectionShowsCustomState = sectionHasDistinctBpm || sectionHasCustomDrumPattern;

  return (
    <div
      className={[
        'stanza-scope-inheritance',
        timingScope === 'song' ? 'stanza-scope-inheritance--song-active' : 'stanza-scope-inheritance--section-active',
        sectionShowsCustomState ? 'stanza-scope-inheritance--section-has-override' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="radiogroup"
      aria-label="Practice settings apply to"
    >
      <div className="stanza-scope-inheritance__song">
        <button
          type="button"
          role="radio"
          aria-checked={timingScope === 'song'}
          className={[
            'stanza-scope-inheritance__option',
            'stanza-scope-inheritance__option--song',
            timingScope === 'song' ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            if (timingScope !== 'song') onTimingScopeChange('song');
          }}
        >
          <span className="stanza-scope-inheritance__option-label">Whole song</span>
          {songBpm != null ? (
            <span className="stanza-scope-inheritance__option-meta">{songBpm} BPM</span>
          ) : null}
        </button>
      </div>

      <div className="stanza-scope-inheritance__bridge" aria-hidden>
        <span className="material-symbols-outlined stanza-scope-inheritance__chevron">chevron_right</span>
      </div>

      <div className="stanza-scope-inheritance__section">
        <button
          type="button"
          role="radio"
          aria-checked={timingScope === 'section'}
          title={sectionDisplayName}
          className={[
            'stanza-scope-inheritance__option',
            'stanza-scope-inheritance__option--section',
            timingScope === 'section' ? 'is-active' : '',
            sectionShowsCustomState ? 'has-override' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            if (timingScope !== 'section') onTimingScopeChange('section');
          }}
        >
          <span className="stanza-scope-inheritance__option-label">{sectionToggleLabel}</span>
          {sectionBpm != null ? (
            <span className="stanza-scope-inheritance__option-meta">{sectionBpm} BPM</span>
          ) : null}
          {sectionHasCustomDrumPattern ? (
            <AppTooltip title={`${sectionDisplayName} has its own drum pattern`}>
              <span
                className="stanza-scope-inheritance__drum-badge material-symbols-outlined"
                aria-label="Custom drum pattern"
              >
                percussion
              </span>
            </AppTooltip>
          ) : null}
        </button>
      </div>
    </div>
  );
}

