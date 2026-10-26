// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { newSong } from '../song/songPageHelpers';
import type { EncoreSong } from '../../types';
import { PracticeExercisesSection } from './PracticeExercisesSection';

function renderSection(song: EncoreSong) {
  return render(
    <PracticeExercisesSection
      song={song}
      onPersistSong={vi.fn()}
      googleAccessToken={null}
      signInWithGoogle={vi.fn(async () => {})}
      withBlockingJob={vi.fn() as never}
    />,
  );
}

describe('PracticeExercisesSection for instrumentals', () => {
  it('shows the guided exercises for a song with lyrics', () => {
    renderSection(newSong());
    expect(screen.getByText('Guided exercises')).toBeTruthy();
  });

  it('hides them for an instrumental, since every exercise is about lyrics', () => {
    renderSection({ ...newSong(), instrumental: true });
    expect(screen.queryByText('Guided exercises')).toBeNull();
  });

  it('keeps them visible when an exercise was already started, so the work is not hidden', () => {
    renderSection({
      ...newSong(),
      instrumental: true,
      practiceExerciseRuns: [
        { id: 'nq', kind: 'characterNineQuestions', status: 'draft', startedAt: '1', updatedAt: '1', answers: ['a'] },
      ],
    });
    expect(screen.getByText('Guided exercises')).toBeTruthy();
  });
});
