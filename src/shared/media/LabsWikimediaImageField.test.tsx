import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LabsWikimediaImageField } from './LabsWikimediaImageField';

function mockFetchOnce(pages: Record<string, unknown>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: { pages } }),
    }),
  );
}

describe('LabsWikimediaImageField', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('embeds search inline without a nested trigger when presentation=inline', () => {
    render(
      <LabsWikimediaImageField
        variant="sketchy"
        presentation="inline"
        label="Page photo"
        onSelectImage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('labs-wikimedia-field-inline')).toBeInTheDocument();
    expect(screen.queryByTestId('labs-wikimedia-field-trigger')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search photos')).toBeInTheDocument();
  });

  it('shows a thumbnail when a photo is selected and opens search on click', async () => {
    mockFetchOnce({
      '1': {
        title: 'File:Mountain.jpg',
        imageinfo: [
          {
            url: 'https://commons.wikimedia.org/wiki/File:Mountain.jpg',
            thumburl: 'https://commons.wikimedia.org/thumb/Mountain.jpg',
            extmetadata: { LicenseShortName: { value: 'CC BY 4.0' } },
          },
        ],
      },
    });

    const onSelect = vi.fn();
    render(
      <LabsWikimediaImageField
        variant="sketchy"
        value={{
          title: 'Current.jpg',
          url: 'https://example.com/current.jpg',
          thumbUrl: 'https://example.com/current-thumb.jpg',
          license: 'CC BY 4.0',
        }}
        onSelectImage={onSelect}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByTestId('labs-wikimedia-field-thumb')).toHaveAttribute(
      'src',
      'https://example.com/current-thumb.jpg',
    );

    fireEvent.click(screen.getByTestId('labs-wikimedia-field-trigger'));
    expect(screen.getByTestId('labs-wikimedia-field-menu')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search photos'), { target: { value: 'mountain' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(screen.getByText('Mountain.jpg')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Mountain\.jpg/i }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Mountain.jpg', license: 'CC BY 4.0' }),
    );
  });
});
