import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SharedExportPopover from './SharedExportPopover';
import type { ExportSourceAdapter } from '../../music/exportTypes';

vi.mock('../../music/exportService', () => ({
  executeExport: vi.fn(async () => ({ downloadedFiles: ['mock.wav'] })),
  formatDuration: vi.fn(() => '8.0s'),
}));

function createAdapter(stems: ExportSourceAdapter['stems']): ExportSourceAdapter {
  return {
    id: 'test',
    title: 'Export Test',
    fileBaseName: 'test',
    stems,
    supportsFormat: () => true,
    estimateDurationSeconds: () => 8,
    renderMidi: async () => new Uint8Array([1, 2, 3]),
  };
}

describe('SharedExportPopover', () => {
  it('hides parts/stems section when only one stem exists', () => {
    render(
      <SharedExportPopover
        open
        anchorEl={document.body}
        onClose={vi.fn()}
        adapter={createAdapter([{ id: 'mix', label: 'Mix', defaultSelected: true }])}
        persistKey="test-single"
      />
    );

    expect(screen.queryByText('Parts / stems')).not.toBeInTheDocument();
  });

  it('shows parts/stems section when multiple stems exist', () => {
    render(
      <SharedExportPopover
        open
        anchorEl={document.body}
        onClose={vi.fn()}
        adapter={createAdapter([
          { id: 'piano', label: 'Piano', defaultSelected: true },
          { id: 'drums', label: 'Drums', defaultSelected: true },
        ])}
        persistKey="test-multi"
      />
    );

    expect(screen.getByText('Parts / stems')).toBeInTheDocument();
    expect(screen.getByText('Piano')).toBeInTheDocument();
    expect(screen.getByText('Drums')).toBeInTheDocument();
  });

  it('uses format descriptions as tooltips and hides inline descriptions', () => {
    render(
      <SharedExportPopover
        open
        anchorEl={document.body}
        onClose={vi.fn()}
        adapter={createAdapter([{ id: 'mix', label: 'Mix', defaultSelected: true }])}
        persistKey="test-tooltips"
      />
    );

    const midiLabel = screen.getByText('MIDI').closest('label');
    expect(midiLabel).toHaveAttribute('title', expect.stringContaining('Tiny note/event'));
    expect(
      screen.queryByText('Tiny note/event file for DAWs and notation editors.')
    ).not.toBeInTheDocument();
  });

  it('hides loop controls for score sheet formats', async () => {
    const adapter: ExportSourceAdapter = {
      id: 'drums-score',
      title: 'Export Rhythm',
      fileBaseName: 'maqsum',
      stems: [{ id: 'drums', label: 'Drums', defaultSelected: true }],
      supportsFormat: (format) => format === 'png' || format === 'wav',
      estimateDurationSeconds: () => 8,
      renderScoreSheet: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
    };

    render(
      <SharedExportPopover
        open
        anchorEl={document.body}
        onClose={vi.fn()}
        adapter={adapter}
        persistKey="test-score-format"
      />
    );

    const pngRadio = screen.getByLabelText('PNG');
    await act(async () => {
      pngRadio.click();
    });

    expect(screen.queryByLabelText(/Loops/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Score title')).toBeInTheDocument();
    expect(screen.getByText(/print-ready PNG/i)).toBeInTheDocument();
  });

  it('keeps a custom score title after closing and reopening the popover', async () => {
    const adapter: ExportSourceAdapter = {
      id: 'drums-score',
      title: 'Export Rhythm',
      fileBaseName: 'maqsum',
      defaultScoreTitle: 'Custom Rhythm',
      stems: [{ id: 'drums', label: 'Drums', defaultSelected: true }],
      supportsFormat: (format) => format === 'png',
      estimateDurationSeconds: () => 8,
      renderScoreSheet: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
    };

    const view = render(
      <SharedExportPopover
        open
        anchorEl={document.body}
        onClose={vi.fn()}
        adapter={adapter}
        persistKey="test-score-title"
      />,
    );

    await act(async () => {
      screen.getByLabelText('PNG').click();
    });

    const titleInput = screen.getByLabelText('Score title');
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'My Cat Has Zoomies' } });
    });

    view.rerender(
      <SharedExportPopover
        open={false}
        anchorEl={document.body}
        onClose={vi.fn()}
        adapter={adapter}
        persistKey="test-score-title"
      />,
    );

    view.rerender(
      <SharedExportPopover
        open
        anchorEl={document.body}
        onClose={vi.fn()}
        adapter={adapter}
        persistKey="test-score-title"
      />,
    );

    await act(async () => {
      screen.getByLabelText('PNG').click();
    });

    expect(screen.getByLabelText('Score title')).toHaveValue('My Cat Has Zoomies');
  });
});
