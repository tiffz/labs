import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LabsWikimediaImageSearch } from './LabsWikimediaImageSearch';
import { classifyWikimediaLicense } from './wikimediaLicense';

function mockFetchOnce(pages: Record<string, unknown>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: { pages } }),
    }),
  );
}

describe('classifyWikimediaLicense', () => {
  it('classifies public domain variants', () => {
    expect(classifyWikimediaLicense('Public domain')).toBe('pd');
    expect(classifyWikimediaLicense('CC0 1.0')).toBe('pd');
    expect(classifyWikimediaLicense('PD-US')).toBe('pd');
  });

  it('classifies CC BY-SA before CC BY', () => {
    expect(classifyWikimediaLicense('CC BY-SA 4.0')).toBe('cc-by-sa');
    expect(classifyWikimediaLicense('Attribution-ShareAlike 3.0')).toBe('cc-by-sa');
  });

  it('classifies CC BY', () => {
    expect(classifyWikimediaLicense('CC BY 3.0')).toBe('cc-by');
    expect(classifyWikimediaLicense('Attribution 2.0')).toBe('cc-by');
  });

  it('falls back to other for unrecognized strings', () => {
    expect(classifyWikimediaLicense('See Commons')).toBe('other');
  });
});

describe('LabsWikimediaImageSearch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('searches and renders results with license text', async () => {
    mockFetchOnce({
      '1': {
        title: 'File:Cat.jpg',
        imageinfo: [
          {
            url: 'https://commons.wikimedia.org/wiki/File:Cat.jpg',
            thumburl: 'https://commons.wikimedia.org/thumb/Cat.jpg',
            extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' } },
          },
        ],
      },
    });

    render(<LabsWikimediaImageSearch />);
    fireEvent.change(screen.getByLabelText('Search photos'), { target: { value: 'cat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(screen.getByText('Cat.jpg')).toBeInTheDocument());
    expect(screen.getByText('CC BY-SA 4.0')).toBeInTheDocument();
  });

  it('filters results by license family client-side', async () => {
    mockFetchOnce({
      '1': {
        title: 'File:Public.jpg',
        imageinfo: [
          {
            url: 'https://commons.wikimedia.org/wiki/File:Public.jpg',
            extmetadata: { LicenseShortName: { value: 'Public domain' } },
          },
        ],
      },
      '2': {
        title: 'File:Shared.jpg',
        imageinfo: [
          {
            url: 'https://commons.wikimedia.org/wiki/File:Shared.jpg',
            extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' } },
          },
        ],
      },
    });

    render(<LabsWikimediaImageSearch />);
    fireEvent.change(screen.getByLabelText('Search photos'), { target: { value: 'photo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByText('Public.jpg')).toBeInTheDocument());
    expect(screen.getByText('Shared.jpg')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('License'), { target: { value: 'pd' } });

    expect(screen.getByText('Public.jpg')).toBeInTheDocument();
    expect(screen.queryByText('Shared.jpg')).not.toBeInTheDocument();
  });

  it('applies the sketchy host skin class', () => {
    render(<LabsWikimediaImageSearch variant="sketchy" showHeading={false} />);
    expect(screen.getByTestId('labs-wikimedia-search')).toHaveAttribute('data-variant', 'sketchy');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('calls onSelectImage when a thumbnail is chosen', async () => {
    mockFetchOnce({
      '1': {
        title: 'File:Pick.jpg',
        imageinfo: [
          {
            url: 'https://commons.wikimedia.org/wiki/File:Pick.jpg',
            thumburl: 'https://commons.wikimedia.org/thumb/Pick.jpg',
            mime: 'image/jpeg',
            extmetadata: { LicenseShortName: { value: 'CC BY 3.0' } },
          },
        ],
      },
    });

    const onSelectImage = vi.fn();
    render(<LabsWikimediaImageSearch onSelectImage={onSelectImage} />);
    fireEvent.change(screen.getByLabelText('Search photos'), { target: { value: 'pick' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByText('Pick.jpg')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Use Pick.jpg' }));
    expect(onSelectImage).toHaveBeenCalledWith({
      title: 'Pick.jpg',
      url: 'https://commons.wikimedia.org/wiki/File:Pick.jpg',
      thumbUrl: 'https://commons.wikimedia.org/thumb/Pick.jpg',
      license: 'CC BY 3.0',
    });
  });

  it('random picks a scenic result and applies it when onSelectImage is set', async () => {
    mockFetchOnce({
      '1': {
        title: 'File:RandomScene.jpg',
        imageinfo: [
          {
            url: 'https://commons.wikimedia.org/wiki/File:RandomScene.jpg',
            thumburl: 'https://commons.wikimedia.org/thumb/RandomScene.jpg',
            mime: 'image/jpeg',
            extmetadata: { LicenseShortName: { value: 'Public domain' } },
          },
        ],
      },
    });

    const onSelectImage = vi.fn();
    render(<LabsWikimediaImageSearch onSelectImage={onSelectImage} />);
    fireEvent.click(screen.getByTestId('labs-wikimedia-random'));

    await waitFor(() => expect(onSelectImage).toHaveBeenCalledTimes(1));
    expect(onSelectImage.mock.calls[0]?.[0]).toMatchObject({
      title: 'RandomScene.jpg',
      license: 'Public domain',
    });
    expect(screen.getByTestId('labs-wikimedia-random')).toBeEnabled();
  });
});
