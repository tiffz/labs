import { describe, expect, it } from 'vitest';
import {
  isPlaybackFieldSelectPopoverTarget,
  PLAYBACK_FIELD_SELECT_POPOVER_CLASS,
  resolvePlaybackFieldSelectMenuAppearance,
} from './playbackFieldSelect';

describe('playbackFieldSelect host integration', () => {
  it('maps words appearance to a words menu skin', () => {
    expect(resolvePlaybackFieldSelectMenuAppearance('words')).toBe('words');
    expect(resolvePlaybackFieldSelectMenuAppearance('default')).toBe('default');
  });

  it('detects clicks inside a portaled playback field select menu', () => {
    document.body.innerHTML = `
      <div class="${PLAYBACK_FIELD_SELECT_POPOVER_CLASS}">
        <div class="shared-playback-field-select__menu">
          <button type="button" class="shared-playback-field-select__option" id="opt">Piano</button>
        </div>
      </div>
    `;
    const option = document.getElementById('opt');
    expect(option).toBeTruthy();
    expect(isPlaybackFieldSelectPopoverTarget(option)).toBe(true);
    expect(isPlaybackFieldSelectPopoverTarget(document.body)).toBe(false);
  });
});
