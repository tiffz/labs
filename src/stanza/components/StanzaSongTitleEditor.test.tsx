import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StanzaSongTitleEditor from './StanzaSongTitleEditor';

describe('StanzaSongTitleEditor', () => {
  it('commits a trimmed title on Enter', () => {
    const onCommit = vi.fn();
    render(<StanzaSongTitleEditor title="Original" onCommit={onCommit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Original' }));
    const field = screen.getByRole('textbox', { name: 'Song title' });
    fireEvent.change(field, { target: { value: '  Renamed  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledWith('Renamed');
  });

  it('cancels on Escape without committing', () => {
    const onCommit = vi.fn();
    render(<StanzaSongTitleEditor title="Original" onCommit={onCommit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Original' }));
    const field = screen.getByRole('textbox', { name: 'Song title' });
    fireEvent.change(field, { target: { value: 'Draft' } });
    fireEvent.keyDown(field, { key: 'Escape' });

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
  });
});
