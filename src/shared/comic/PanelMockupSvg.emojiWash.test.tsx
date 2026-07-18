import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PanelMockupSvg } from './PanelMockupSvg';
import { createDefaultCast, defaultGeneratedLayout } from './index';

vi.mock('./emojiRasterize', async () => {
  const actual = await vi.importActual<typeof import('./emojiRasterize')>('./emojiRasterize');
  return {
    ...actual,
    rasterizeEmojiToDataUrl: () =>
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    rasterizeEmojiToDataUrlAsync: async () =>
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    clearEmojiRasterCache: () => undefined,
  };
});

describe('PanelMockupSvg emoji markers', () => {
  it('renders raster emoji markers without a soft wash overlay', async () => {
    const layout = defaultGeneratedLayout(2);
    const cast = createDefaultCast();
    const { container } = render(
      <PanelMockupSvg
        layout={layout}
        fills={[
          {
            panelIndex: 0,
            speakerIds: [cast[0]!.id, cast[1]!.id],
            arrangement: 'facing',
            blocks: [],
            text: { kind: 'none' },
          },
        ]}
        cast={cast}
        sketchy
        width={200}
        height={280}
        colors={{
          panelFills: ['#eee', '#ddd'],
          figure: '#336699',
          caption: '#666',
          background: '#f5f5f0',
          sky: '#dce9f5',
          ground: '#e8dcc8',
          bubble: '#fff',
          sfx: '#c00',
        }}
      />,
    );
    await waitFor(() => {
      const base = container.querySelector('image.comic-mockup-svg__emoji-marker-base');
      expect(base).toBeTruthy();
    });
    expect(container.querySelector('image.comic-mockup-svg__emoji-marker-wash')).toBeNull();
    const titled = container.querySelector('.comic-mockup-svg__character-marker--emoji title');
    expect(titled?.textContent).toBeTruthy();
  });
});
