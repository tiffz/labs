import type { ReactElement } from 'react';

import type { StanzaPracticeSource } from '../utils/stanzaPracticeSource';

export type StanzaPracticeSourceSwitchProps = {
  active: StanzaPracticeSource;
  localLabel?: string;
  onChange: (source: StanzaPracticeSource) => void;
  onRemoveUpload?: () => void;
};

/** Switch between YouTube and an uploaded file when both exist on one song row. */
export function StanzaPracticeSourceSwitch({
  active,
  localLabel = 'Uploaded file',
  onChange,
  onRemoveUpload,
}: StanzaPracticeSourceSwitchProps): ReactElement {
  return (
    <div className="stanza-practice-source-switch" role="group" aria-label="Practice source">
      <span className="stanza-practice-source-switch__label">Source</span>
      <div className="stanza-practice-source-switch__group">
        <button
          type="button"
          className={`stanza-practice-source-switch__option${active === 'youtube' ? ' stanza-practice-source-switch__option--active' : ''}`}
          aria-pressed={active === 'youtube'}
          onClick={() => onChange('youtube')}
        >
          YouTube
        </button>
        <button
          type="button"
          className={`stanza-practice-source-switch__option${active === 'local' ? ' stanza-practice-source-switch__option--active' : ''}`}
          aria-pressed={active === 'local'}
          onClick={() => onChange('local')}
        >
          {localLabel}
        </button>
      </div>
      {onRemoveUpload ? (
        <button
          type="button"
          className="stanza-link-quiet stanza-practice-source-switch__remove"
          onClick={onRemoveUpload}
        >
          Remove upload
        </button>
      ) : null}
    </div>
  );
}
