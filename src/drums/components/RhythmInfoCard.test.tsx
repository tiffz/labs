import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RhythmDefinition } from '../utils/rhythmRecognition';
import RhythmInfoCard from './RhythmInfoCard';

const simpleVexFlowNoteMock = vi.fn((props: unknown) => <div data-testid="mini-notation" {...(props as object)} />);

vi.mock('./SimpleVexFlowNote', () => ({
  default: (props: unknown) => simpleVexFlowNoteMock(props),
}));

describe('RhythmInfoCard', () => {
  beforeEach(() => {
    simpleVexFlowNoteMock.mockClear();
    vi.stubGlobal(
      'requestIdleCallback',
      (callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
        return 1;
      }
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());
  });

  it('uses explicit variation time signatures for previews and selection', async () => {
    const rhythm: RhythmDefinition = {
      id: 'test-rhythm',
      name: 'Test Rhythm',
      description: 'desc',
      learnMoreLinks: [],
      basePattern: 'D-----T-----T---',
      timeSignature: { numerator: 8, denominator: 8 },
      variations: [
        {
          notation: 'D-K-K-D-K-K-T-K-',
          note: '8/8 with ka ornaments',
          timeSignature: { numerator: 8, denominator: 8 },
        },
        {
          notation: 'D--T--T-',
          note: '2/4 variation',
          timeSignature: { numerator: 2, denominator: 4 },
        },
      ],
      relatedRhythmIds: [],
    };
    const onSelectVariation = vi.fn();

    render(
      <RhythmInfoCard
        rhythm={rhythm}
        currentNotation="D--D--D-"
        onSelectVariation={onSelectVariation}
      />
    );

    await waitFor(() => {
      expect(simpleVexFlowNoteMock).toHaveBeenCalled();
    });
    const firstPreviewProps = simpleVexFlowNoteMock.mock.calls[0]?.[0] as
      | {
          timeSignature?: { numerator: number; denominator: number };
        }
      | undefined;
    expect(firstPreviewProps?.timeSignature).toEqual({ numerator: 8, denominator: 8 });

    const buttons = screen.getAllByRole('button');
    const twoFourButton = buttons.find((button) =>
      button.textContent?.includes('2/4 variation')
    );
    expect(twoFourButton).toBeDefined();
    fireEvent.click(twoFourButton as HTMLButtonElement);

    expect(onSelectVariation).toHaveBeenCalledWith('D--T--T-', {
      numerator: 2,
      denominator: 4,
    });
  });
});
