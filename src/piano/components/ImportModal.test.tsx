import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImportModal from './ImportModal';
import type { PianoScore } from '../types';

const importScoreMock = vi.fn();

vi.mock('../utils/importScore', () => ({
  importScore: (...args: unknown[]) => importScoreMock(...args),
}));

function makeScore(): PianoScore {
  return {
    id: 'test-score',
    title: 'Test',
    key: 'C',
    tempo: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    parts: [{ id: 'rh', name: 'RH', clef: 'treble', hand: 'right', measures: [{ notes: [] }] }],
  };
}

describe('ImportModal initial file handling', () => {
  it('processes initialFile only once per open session', async () => {
    importScoreMock.mockResolvedValue({ score: makeScore() });
    const file = new File(['midi'], 'gravity.mid', { type: 'audio/midi' });

    const { rerender } = render(
      <ImportModal
        open={true}
        initialFile={file}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />
    );

    await waitFor(() => expect(importScoreMock).toHaveBeenCalledTimes(1));

    rerender(
      <ImportModal
        open={true}
        initialFile={file}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />
    );

    await waitFor(() => expect(importScoreMock).toHaveBeenCalledTimes(1));
  });
});

