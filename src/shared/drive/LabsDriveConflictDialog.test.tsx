import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LabsDriveConflictDialog from '../google/LabsDriveConflictDialog';

describe('LabsDriveConflictDialog', () => {
  it('renders merge, replace, and cancel actions', () => {
    const onMerge = vi.fn();
    const onReplace = vi.fn();
    const onCancel = vi.fn();

    render(
      <LabsDriveConflictDialog
        open
        dialogTitleId="conflict-title"
        busy={false}
        title="Drive backup differs"
        intro="Your device and Drive both changed."
        detail="3 songs on Drive · 2 on this device"
        recommendation="Merge keeps both sides."
        onCancel={onCancel}
        onReplaceOnly={onReplace}
        onMergeThenUpload={onMerge}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Drive backup differs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Merge and upload' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this device only' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onMerge).toHaveBeenCalledOnce();
    expect(onReplace).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows optional replace warning copy', () => {
    render(
      <LabsDriveConflictDialog
        open
        dialogTitleId="conflict-title"
        busy={false}
        title="Drive backup differs"
        intro="Both copies changed."
        detail="5 sections on Drive · 2 here"
        recommendation="Merge keeps both."
        replaceWarning="Drive has more section markers overall."
        onCancel={vi.fn()}
        onReplaceOnly={vi.fn()}
        onMergeThenUpload={vi.fn()}
      />,
    );

    expect(screen.getByText('Drive has more section markers overall.')).toBeInTheDocument();
  });

  it('disables actions while busy', () => {
    render(
      <LabsDriveConflictDialog
        open
        dialogTitleId="conflict-title"
        busy
        title="Drive backup differs"
        intro="Both copies changed."
        detail="Syncing…"
        recommendation="Merge keeps both."
        onCancel={vi.fn()}
        onReplaceOnly={vi.fn()}
        onMergeThenUpload={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Merge and upload' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use this device only' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
