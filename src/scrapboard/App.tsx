import { useCallback, useMemo, useRef, useState, type ReactElement } from 'react';

import SkipToMain from '../shared/components/SkipToMain';
import type { PanelBackgroundImage } from '../shared/comic';
import type { LabsWikimediaImageResult } from '../shared/media';
import { applyPaletteToMockup, type ComicPalette } from '../shared/palette';
import {
  artworkDimensionsWithBleed,
  convertPrintUnits,
  bleedConfigForLabsPrintSpec,
  pixelsAtDpi,
  trimSizeFromLabsPrintSpec,
} from '../shared/zine';
import { ScrapboardBoardEditor, type ScrapboardBoardEditorProps } from './components/ScrapboardBoardEditor';
import { ScrapboardExportSheet } from './components/ScrapboardExportSheet';
import { ScrapboardLayoutGallery } from './components/ScrapboardLayoutGallery';
import { ScrapboardPageFinishBar } from './components/ScrapboardPageFinishBar';
import { ScrapboardPanelTextEditor } from './components/ScrapboardPanelTextEditor';
import { ScrapboardToolbar } from './components/ScrapboardToolbar';
import { useScrapboardBoard } from './hooks/useScrapboardBoard';

export { ScrapboardBoardEditor, type ScrapboardBoardEditorProps };

export default function App(): ReactElement {
  const board = useScrapboardBoard(4);
  const [palette, setPalette] = useState<ComicPalette | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSettingsOpen, setExportSettingsOpen] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const colors = useMemo(
    () => applyPaletteToMockup(palette, board.layout.panels.length),
    [board.layout.panels.length, palette],
  );

  const onSelectPageBackgroundImage = useCallback(
    (result: LabsWikimediaImageResult): void => {
      const image: PanelBackgroundImage = {
        url: result.url,
        thumbUrl: result.thumbUrl,
        title: result.title,
        license: result.license,
      };
      board.setPageBackgroundImage(image);
    },
    [board],
  );

  const runExportPng = useCallback(async (): Promise<void> => {
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
        <ScrapboardToolbar board={board} onExportPng={() => setExportOpen(true)} />
      </header>

      <div className="scrapboard-page-finish-wrap">
        <ScrapboardPageFinishBar
          palette={palette}
          onPaletteApply={setPalette}
          cast={board.cast}
          onAddCastMember={() => board.addCastMember()}
          onUpdateCastMember={board.updateCastMember}
          onRemoveCastMember={board.removeCastMember}
          pageBackgroundImage={board.pageBackgroundImage}
          onSelectPageBackgroundImage={onSelectPageBackgroundImage}
          onClearPageBackgroundImage={() => board.setPageBackgroundImage(null)}
          printSpec={board.printSpec}
          onPrintSpecChange={board.setPrintSpec}
          showBleedGuides={board.showBleedGuides}
          onShowBleedGuidesChange={board.setShowBleedGuides}
        />
      </div>

      <main id="main" className="scrapboard-main">
        <aside className="scrapboard-controls" aria-label="Panel inspector">
          <ScrapboardPanelTextEditor board={board} />
        </aside>

        <section className="scrapboard-stage" aria-label="Page preview">
          <div className="scrapboard-canvas" aria-label="Mockup preview" ref={svgRef}>
            <ScrapboardBoardEditor
              layout={board.layout}
              fills={board.fills}
              cast={board.cast}
              colors={colors}
              printSpec={board.printSpec}
              showBleedGuides={board.showBleedGuides}
              allowBubbleEscape={board.allowBubbleEscape}
              selectedPanelIndex={board.selectedPanelIndex}
              onPanelSelect={board.setSelectedPanelIndex}
              pageBackgroundImage={board.pageBackgroundImage ?? undefined}
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

      <ScrapboardExportSheet
        open={exportOpen}
        onClose={() => {
          setExportOpen(false);
          setExportSettingsOpen(false);
        }}
        printSpec={board.printSpec}
        onPrintSpecChange={board.setPrintSpec}
        showBleedGuides={board.showBleedGuides}
        onShowBleedGuidesChange={board.setShowBleedGuides}
        onConfirmExport={() => void runExportPng()}
        showSettings={exportSettingsOpen}
        onShowSettingsChange={setExportSettingsOpen}
      />
    </div>
  );
}
