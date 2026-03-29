import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
