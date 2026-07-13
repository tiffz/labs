import TextField from '@mui/material/TextField';
import { useCallback, useMemo, useRef, useState, type ReactElement } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import { applyPaletteToMockup, createPaletteFromHexes, parsePalettePaste, type ComicPalette } from '../shared/palette';
import {
  artworkDimensionsWithBleed,
  convertPrintUnits,
  bleedConfigForLabsPrintSpec,
  pixelsAtDpi,
  trimSizeFromLabsPrintSpec,
} from '../shared/zine';
import { ScrapboardBoardEditor, type ScrapboardBoardEditorProps } from './components/ScrapboardBoardEditor';
import { ScrapboardLayoutGallery } from './components/ScrapboardLayoutGallery';
import { ScrapboardPanelTextEditor } from './components/ScrapboardPanelTextEditor';
import { ScrapboardPrintSpecPanel } from './components/ScrapboardPrintSpecPanel';
import { ScrapboardToolbar } from './components/ScrapboardToolbar';
import { useScrapboardBoard } from './hooks/useScrapboardBoard';

export { ScrapboardBoardEditor, type ScrapboardBoardEditorProps };

export default function App(): ReactElement {
  const board = useScrapboardBoard(4);
  const [palettePaste, setPalettePaste] = useState('');
  const [palette, setPalette] = useState<ComicPalette | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const colors = useMemo(
    () => applyPaletteToMockup(palette, board.layout.panels.length),
    [board.layout.panels.length, palette],
  );

  const onApplyPalette = (): void => {
    const hexes = parsePalettePaste(palettePaste);
    if (!hexes) return;
    setPalette(createPaletteFromHexes(hexes, 'Board palette', 'import'));
  };

  const onExportPng = useCallback(async (): Promise<void> => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;
    const trim = trimSizeFromLabsPrintSpec(board.printSpec);
    const bleed = bleedConfigForLabsPrintSpec(board.printSpec);
    const artwork = artworkDimensionsWithBleed(trim, bleed);
    const widthPx = pixelsAtDpi(convertPrintUnits(artwork.width, artwork.unit, 'in'), board.printSpec.dpi);
    const heightPx = pixelsAtDpi(convertPrintUnits(artwork.height, artwork.unit, 'in'), board.printSpec.dpi);
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => {
          if (!png) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(png);
          a.download = 'scrapboard-mockup.png';
          a.click();
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [board.printSpec, colors.background]);

  return (
    <div className="scrapboard-app" data-testid="scrapboard-app">
      <SkipToMain />
      <header className="scrapboard-header">
        <div className="scrapboard-header__brand">
          <h1 className="scrapboard-title">Scrapboard</h1>
          <p className="scrapboard-tagline">Panel layouts and rough comps, fast.</p>
        </div>
        <ScrapboardToolbar board={board} onExportPng={() => void onExportPng()} />
      </header>

      <main id="main" className="scrapboard-main">
        <aside className="scrapboard-controls" aria-label="Generation controls">
          <ScrapboardPanelTextEditor board={board} />

          <section className="scrapboard-controls__section scrapboard-palette">
            <h2 className="scrapboard-section-title">Palette tint</h2>
            <TextField
              size="small"
              fullWidth
              label="Palette source"
              placeholder="Hex row, Coolors, or /palette/ link"
              value={palettePaste}
              onChange={(e) => setPalettePaste(e.target.value)}
              className="scrapboard-mui-field"
              data-testid="scrapboard-palette-input"
            />
            <button type="button" className="scrapboard-btn scrapboard-btn--ghost" onClick={onApplyPalette}>
              Apply palette
            </button>
          </section>

          <section
            className={[
              'scrapboard-controls__section',
              'scrapboard-print-wrap',
              printOpen ? 'scrapboard-print-wrap--open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <button
              type="button"
              className="scrapboard-disclosure"
              aria-expanded={printOpen}
              onClick={() => setPrintOpen((open) => !open)}
              data-testid="scrapboard-print-toggle"
            >
              Page &amp; export settings
            </button>
            {printOpen ? (
              <ScrapboardPrintSpecPanel
                printSpec={board.printSpec}
                onChange={board.setPrintSpec}
                showBleedGuides={board.showBleedGuides}
                onShowBleedGuidesChange={board.setShowBleedGuides}
              />
            ) : null}
          </section>
        </aside>

        <section className="scrapboard-stage" aria-label="Page preview">
          <div className="scrapboard-canvas" aria-label="Mockup preview" ref={svgRef}>
            <ScrapboardBoardEditor
              layout={board.layout}
              fills={board.fills}
              colors={colors}
              printSpec={board.printSpec}
              showBleedGuides={board.showBleedGuides}
              allowBubbleEscape={board.allowBubbleEscape}
              selectedPanelIndex={board.selectedPanelIndex}
              onPanelSelect={board.setSelectedPanelIndex}
            />
          </div>
        </section>

        <aside className="scrapboard-layout-rail" aria-label="Layout options">
          <ScrapboardLayoutGallery
            layouts={board.layoutCandidates}
            selectedId={board.selectedLayoutId}
            onSelect={board.selectLayout}
          />
        </aside>
      </main>
    </div>
  );
}
