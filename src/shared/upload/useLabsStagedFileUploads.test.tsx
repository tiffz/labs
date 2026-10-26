// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLabsStagedFileUploads, type LabsStagedFileUploadsOptions } from './useLabsStagedFileUploads';

const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' });

function Harness(props: Partial<LabsStagedFileUploadsOptions> & { files: File[] }) {
  const { files, ...rest } = props;
  const uploads = useLabsStagedFileUploads({
    outcome: 'Uploads to your Drive',
    onCommit: async () => {},
    confirmLabel: (n) => (n === 1 ? 'Upload' : `Upload ${n} files`),
    ...rest,
  });
  return (
    <>
      <button type="button" onClick={() => uploads.stageFiles(files)}>
        stage
      </button>
      {uploads.panel}
    </>
  );
}

async function stage() {
  await act(async () => {
    fireEvent.click(screen.getByText('stage'));
  });
}

describe('useLabsStagedFileUploads', () => {
  it('saves nothing until confirm, then saves each file', async () => {
    const onCommit = vi.fn(async () => {});
    render(<Harness files={[pdf('a.pdf'), pdf('b.pdf')]} onCommit={onCommit} />);
    await stage();
    expect(onCommit).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload 2 files' }));
    });
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('region', { name: 'Ready to add' })).toBeNull();
  });

  it('refuses every file when the surface cannot save (signed out)', async () => {
    const onCommit = vi.fn(async () => {});
    render(<Harness files={[pdf('a.pdf')]} onCommit={onCommit} unavailable="Sign in with Google to save files here." />);
    await stage();
    expect(screen.getByText('Sign in with Google to save files here.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Upload' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('refuses a file the surface does not take', async () => {
    render(
      <Harness
        files={[new File(['x'], 'song.mp3', { type: 'audio/mpeg' })]}
        accepts={(f) => f.type === 'application/pdf'}
        rejectMessage="Only PDFs go here."
      />,
    );
    await stage();
    expect(screen.getByText('Only PDFs go here.')).toBeTruthy();
  });

  it('keeps a failed file with a plain reason while the others save', async () => {
    const onCommit = vi.fn(async (file: File) => {
      if (file.name === 'b.pdf') throw new Error('HTTP 507 quotaExceeded {"error":...}');
    });
    render(
      <Harness
        files={[pdf('a.pdf'), pdf('b.pdf')]}
        onCommit={onCommit}
        describeError={() => 'Your Google Drive is full.'}
      />,
    );
    await stage();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload 2 files' }));
    });
    expect(screen.queryByText('a.pdf')).toBeNull();
    expect(screen.getByText('b.pdf')).toBeTruthy();
    expect(screen.getByText('Your Google Drive is full.')).toBeTruthy();
  });
});
