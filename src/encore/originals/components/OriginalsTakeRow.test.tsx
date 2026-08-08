import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OriginalsTakeRow } from './OriginalsTakeRow';
import type { OriginalAudioTake } from '../types';

function take(overrides: Partial<OriginalAudioTake> = {}): OriginalAudioTake {
  return {
    id: 't1',
    label: 'Take one.m4a',
    timestamp: 1_780_000_000_000,
    source: 'imported',
    ...overrides,
  };
}

function renderRow(props: Partial<React.ComponentProps<typeof OriginalsTakeRow>> = {}) {
  return render(
    <OriginalsTakeRow
      take={take()}
      isPreferred={false}
      isPlaying={false}
      playable
      storageStatus="local"
      onPlay={vi.fn()}
      {...props}
    />,
  );
}

describe('OriginalsTakeRow', () => {
  it('collapses notes to a single affordance until the user opens them', () => {
    // The card this replaced rendered an always-open 2-row textarea per take, which dominated the
    // surface for content that is usually empty.
    renderRow({ onNotesChange: vi.fn() });

    expect(screen.queryByRole('textbox', { name: /notes for/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Add notes'));
    expect(screen.getByRole('textbox', { name: /notes for/i })).toBeInTheDocument();
  });

  it('shows existing notes as text and opens an editor on click', () => {
    const onNotesChange = vi.fn();
    renderRow({ take: take({ notes: 'flat on the bridge' }), onNotesChange });

    fireEvent.click(screen.getByText('flat on the bridge'));
    const field = screen.getByRole('textbox', { name: /notes for/i });
    fireEvent.change(field, { target: { value: 'sharp on the bridge' } });
    fireEvent.blur(field);

    expect(onNotesChange).toHaveBeenCalledWith('sharp on the bridge');
  });

  it('does not fire a notes change when the text is unchanged', () => {
    const onNotesChange = vi.fn();
    renderRow({ take: take({ notes: 'keep me' }), onNotesChange });

    fireEvent.click(screen.getByText('keep me'));
    fireEvent.blur(screen.getByRole('textbox', { name: /notes for/i }));

    expect(onNotesChange).not.toHaveBeenCalled();
  });

  it('marks the preferred take in the status line and disables its own star', () => {
    renderRow({ isPreferred: true, storageStatus: 'drive', onMakePreferred: undefined });

    expect(screen.getByText(/Preferred take · Backed up/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preferred take' })).toBeDisabled();
  });

  it('offers re-picking the file when the audio is not on this device', () => {
    const onPlay = vi.fn();
    renderRow({ playable: false, storageStatus: 'missing', onPlay });

    const play = screen.getByRole('button', { name: /choose the file to play it here/i });
    fireEvent.click(play);

    expect(onPlay).toHaveBeenCalled();
    expect(screen.getByText(/Choose the file again to play it here/)).toBeInTheDocument();
  });

  it('hides every mutating affordance in read-only mode', () => {
    renderRow({ readOnly: true, take: take({ notes: 'read me' }) });

    expect(screen.queryByRole('textbox', { name: 'Take name' })).not.toBeInTheDocument();
    expect(screen.queryByText('Add notes')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove take' })).not.toBeInTheDocument();
    expect(screen.getByText('read me')).toBeInTheDocument();
  });

  it('renames on blur and reverts an empty name', () => {
    const onRename = vi.fn();
    renderRow({ onRename });

    const title = screen.getByRole('textbox', { name: 'Take name' });
    fireEvent.change(title, { target: { value: '   ' } });
    fireEvent.blur(title);
    expect(onRename).not.toHaveBeenCalled();

    fireEvent.change(title, { target: { value: 'Chorus idea' } });
    fireEvent.blur(title);
    expect(onRename).toHaveBeenCalledWith('Chorus idea');
  });
});
