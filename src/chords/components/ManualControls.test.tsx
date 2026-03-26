import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChordProgressionState, LockedOptions } from '../types';
import ManualControls from './ManualControls';

vi.mock('./ChordStylePreview', () => ({
  default: () => <div data-testid="style-preview" />,
}));

function makeState(): ChordProgressionState {
  return {
    progression: {
      name: 'Test progression',
      progression: ['I', 'V', 'vi', 'IV'],
    },
    key: 'C',
    tempo: 100,
    timeSignature: { numerator: 4, denominator: 4 },
    stylingStrategy: 'simple',
    voicingOptions: {
      useInversions: false,
      useOpenVoicings: false,
      randomizeOctaves: false,
    },
    soundType: 'piano',
    measuresPerChord: 1,
  };
}

describe('ManualControls progression input', () => {
  const openProgressionEditor = () => {
    return screen.getByPlaceholderText('I–V–vi–IV or C–G–Am–F');
  };

  it('applies custom chord-symbol progression on Enter', () => {
    const onStateChange = vi.fn();
    const lockedOptions: LockedOptions = {};
    render(
      <ManualControls
        state={makeState()}
        lockedOptions={lockedOptions}
        onStateChange={onStateChange}
        onLockChange={vi.fn()}
        onRandomize={vi.fn()}
      />
    );
    onStateChange.mockClear();

    const input = openProgressionEditor();
    fireEvent.change(input, { target: { value: 'Dm-G-C-F' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onStateChange).toHaveBeenCalled();
    const lastCallArg = onStateChange.mock.calls.at(-1)?.[0];
    expect(lastCallArg).toMatchObject({
      progression: expect.objectContaining({
        progression: ['ii', 'V', 'I', 'IV'],
      }),
      key: 'C',
    });
  });

  it('allows single-chord custom progression input', () => {
    const onStateChange = vi.fn();
    const lockedOptions: LockedOptions = {};
    render(
      <ManualControls
        state={makeState()}
        lockedOptions={lockedOptions}
        onStateChange={onStateChange}
        onLockChange={vi.fn()}
        onRandomize={vi.fn()}
      />
    );
    onStateChange.mockClear();

    const input = openProgressionEditor();
    fireEvent.change(input, { target: { value: 'I' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onStateChange).toHaveBeenCalled();
    const lastCallArg = onStateChange.mock.calls.at(-1)?.[0];
    expect(lastCallArg).toMatchObject({
      progression: expect.objectContaining({
        progression: ['I'],
      }),
    });
  });
});

