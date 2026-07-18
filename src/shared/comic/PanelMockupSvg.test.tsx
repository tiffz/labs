import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultGeneratedLayout } from './layoutGenerate';
import { defaultFillsForLayout } from './layoutPresets';
import { PanelMockupSvg } from './PanelMockupSvg';

describe('PanelMockupSvg background images', () => {
  it('renders no <image> elements when no background image is set', () => {
    const layout = defaultGeneratedLayout(2);
    const fills = defaultFillsForLayout(layout);
    const { container } = render(<PanelMockupSvg layout={layout} fills={fills} width={400} height={300} />);
    expect(container.querySelectorAll('image')).toHaveLength(0);
  });

  it('renders a page background image tinted with the duotone filter', () => {
    const layout = defaultGeneratedLayout(2);
    const fills = defaultFillsForLayout(layout);
    const { container } = render(
      <PanelMockupSvg
        layout={layout}
        fills={fills}
        width={400}
        height={300}
        pageBackgroundImage={{ url: 'https://example.com/photo.jpg', title: 'Photo', license: 'CC BY 4.0' }}
      />,
    );
    // Soft wash: unfiltered base + soft duotone overlay for readability.
    const images = container.querySelectorAll('image.comic-mockup-svg__page-background');
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute('href')).toBe('https://example.com/photo.jpg');
    expect(images[0]?.getAttribute('filter')).toBeNull();
    expect(images[1]?.getAttribute('filter')).toMatch(/^url\(#.+-duotone\)$/);
    expect(container.querySelector('filter feComponentTransfer')).toBeTruthy();
  });

  it('renders a per-panel background image and skips the procedural composition', () => {
    const layout = defaultGeneratedLayout(1);
    const fills = [
      {
        panelIndex: 0,
        composition: 'city-scene' as const,
        blocks: [],
        text: { kind: 'none' as const },
        backgroundImage: { url: 'https://example.com/panel.jpg', title: 'Panel photo', license: 'Public domain' },
      },
    ];
    const { container } = render(<PanelMockupSvg layout={layout} fills={fills} width={400} height={300} sketchy />);
    const panelImages = container.querySelectorAll('image.comic-mockup-svg__panel-background');
    expect(panelImages).toHaveLength(2);
    expect(panelImages[0]?.getAttribute('href')).toBe('https://example.com/panel.jpg');
    expect(panelImages[0]?.getAttribute('filter')).toBeNull();
    expect(panelImages[1]?.getAttribute('filter')).toMatch(/^url\(#.+-duotone\)$/);
  });
});
