import { useId, type ReactElement } from 'react';

import type { MockupPaletteApplyResult } from '../palette';
import type { LabsPrintSpec } from '../zine/labsPrintSpec';
import { bleedOverlayPercents } from '../zine/bleedConfig';
import { bleedConfigForLabsPrintSpec, trimSizeFromLabsPrintSpec } from '../zine/labsPrintSpec';
import { renderCharacterMarker, renderHorizonScene } from './characterMarkers';
import { EmojiCharacterMarker } from './EmojiCharacterMarker';
import {
  castLabelBySlot,
  emojiBySlot,
  placementForFill,
  resolvePanelSpeakerIds,
  slotForSpeakerIndex,
} from './comicCast';
import { DUOTONE_GRAYSCALE_MATRIX, softPhotoDuotoneTables } from './duotoneFilter';
import { mockupDimensionsForPrintSpec } from './panelMockupDimensions';
import {
  markerLayoutBounds,
  panelCircleClipAttrs,
  panelPixelBounds,
  panelSvgPointsAttr,
  resolvePanelClip,
} from './panelClipPath';
import { renderMockupComposition } from './mockupCompositions';
import { isLegacyStickFill, legacyStickPose, resolvePanelComposition, resolvePanelTextBlocks } from './panelFillResolve';
import { layoutPanelTextBlocks, type PanelTextLayout, type PanelTextLayoutOptions } from './speechBubbleLayout';
import { BUBBLE_FONT_FAMILY, bubbleTextOffsetY, speechBubblePathForLayout } from './speechBubblePath';
import { adaptBlocksToPanelBudget } from './speechBubbleSlotLayout';
import { SfxLayoutGraphic } from './SfxLayoutGraphic';
import type {
  ComicCastMember,
  PanelBackgroundImage,
  PanelCharacterId,
  PanelFillSpec,
  PanelLayoutSpec,
  PanelRect,
  PanelTextBlock,
} from './types';
import { stickFigureSvg } from './stickFigures';

const DEFAULT_WIDTH = 400;
const SKETCH_STROKE = 3.25;
const SKETCH_BUBBLE_STROKE = 3.1;

export type PanelMockupSvgProps = {
  layout: PanelLayoutSpec;
  fills: PanelFillSpec[];
  colors?: MockupPaletteApplyResult;
  width?: number;
  height?: number;
  showReadingOrder?: boolean;
  printSpec?: LabsPrintSpec;
  showBleedGuides?: boolean;
  selectedPanelIndex?: number | null;
  onPanelSelect?: (panelIndex: number) => void;
  /** Photo shown through panel gutters/page background, palette-tinted (duotone). */
  pageBackgroundImage?: PanelBackgroundImage;
  /** Hand-drawn wireframe strokes (Scrapboard). */
  sketchy?: boolean;
  /** Let bubble bodies extend past panel edges; tails stay anchored in-panel. */
  allowBubbleEscape?: boolean;
  /** Override placer (`slots` recommended for Scrapboard). */
  placeMode?: PanelTextLayoutOptions['placeMode'];
  /**
   * Page cast for emoji markers (Scrapboard). When set with `sketchy`, skips procedural
   * scenery and renders arrangement-driven emoji characters.
   */
  cast?: ComicCastMember[];
};

function dialogueCharacterIds(blocks: PanelTextBlock[]): PanelCharacterId[] {
  const ids = new Set<PanelCharacterId>();
  for (const block of blocks) {
    if (block.kind === 'dialogue' && block.content.trim()) {
      ids.add(block.characterId);
    }
  }
  return [...ids].sort();
}

function panelUsesCircleClip(panel: PanelRect): boolean {
  return (panel.shape ?? 'rect') === 'circle';
}

export function PanelMockupSvg({
  layout,
  fills,
  colors,
  width: widthProp,
  height: heightProp,
  showReadingOrder = true,
  printSpec,
  showBleedGuides = false,
  selectedPanelIndex = null,
  onPanelSelect,
  pageBackgroundImage,
  sketchy = false,
  allowBubbleEscape = false,
  placeMode,
  cast,
}: PanelMockupSvgProps): ReactElement {
  const clipPrefix = useId().replace(/:/g, '');
  const clipId = (index: number): string => `${clipPrefix}-panel-clip-${index}`;
  const duotoneFilterId = `${clipPrefix}-duotone`;
  const dims = mockupDimensionsForPrintSpec(printSpec, widthProp ?? DEFAULT_WIDTH);
  const width = widthProp ?? dims.width;
  const height = heightProp ?? dims.height;
  const fillByIndex = new Map(fills.map((f) => [f.panelIndex, f]));
  const panelColors = colors?.panelFills ?? layout.panels.map(() => '#f5f5f0');
  const figureColor = colors?.figure ?? '#333333';
  const accentColor = colors?.caption ?? '#666666';
  const backgroundColor = colors?.background ?? '#ebe8e0';
  const skyColor = colors?.sky ?? '#dce9f5';
  const groundColor = colors?.ground ?? '#e8dcc8';
  const duotoneTables = softPhotoDuotoneTables(figureColor, skyColor);
  const characterFirst = Boolean(sketchy && cast && cast.length > 0);
  const panelStroke = sketchy ? SKETCH_STROKE : 2;
  const bubbleStroke = sketchy ? SKETCH_BUBBLE_STROKE : 1.75;

  const bleedPercents =
    printSpec && showBleedGuides
      ? bleedOverlayPercents(
          trimSizeFromLabsPrintSpec(printSpec),
          bleedConfigForLabsPrintSpec(printSpec),
        )
      : null;

  const textOverlays: ReactElement[] = [];

  const panelNodes = layout.panels.map((panel, index) => {
    const bounds = panelPixelBounds(panel, width, height, 2);
    const clip = resolvePanelClip(panel);
    const points = panelSvgPointsAttr(clip, bounds);
    const fill = fillByIndex.get(index);
    const orderIndex = layout.readingOrder.indexOf(index);
    const inner = {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
    };
    // Re-budget against *rendered* panel pixels so gallery switches / strip layouts
    // never keep wide-panel mad-libs that collapse to "…" spaghetti balloons.
    const textBlocks = adaptBlocksToPanelBudget(resolvePanelTextBlocks(fill), inner);
    const characterIds = sketchy ? dialogueCharacterIds(textBlocks) : [];
    const composition = resolvePanelComposition(fill);
    const hasBackgroundImage = Boolean(fill?.backgroundImage);
    const markerPlacement =
      characterFirst && cast ? placementForFill(fill, cast) : undefined;
    const speakerIds =
      characterFirst && cast ? resolvePanelSpeakerIds(fill, cast) : [];
    const emojisBySlot = characterFirst && cast ? emojiBySlot(fill, cast) : {};
    const labelsBySlot = characterFirst && cast ? castLabelBySlot(fill, cast) : {};
    const slotIds: PanelCharacterId[] =
      characterFirst && speakerIds.length > 0
        ? speakerIds.map((_, i) => slotForSpeakerIndex(i))
        : characterIds;
    const showHorizon =
      !hasBackgroundImage &&
      sketchy &&
      (characterFirst
        ? speakerIds.length > 0
        : (composition === 'horizon-scene' || composition === 'empty') && characterIds.length > 0);
    const textLayoutOptions: PanelTextLayoutOptions = {
      allowBubbleEscape,
      placeMode: placeMode ?? (sketchy ? 'slots' : 'force'),
      markerPlacement,
    };
    const textLayout = layoutPanelTextBlocks(textBlocks, inner, textLayoutOptions);
    const textOverlay = renderPanelTextOverlay(
      textLayout,
      colors?.bubble ?? '#ffffff',
      sketchy,
      bubbleStroke,
      index,
      colors?.sfx,
    );

    if (allowBubbleEscape && textOverlay) {
      textOverlays.push(textOverlay);
    }

    const isCircle = panelUsesCircleClip(panel);
    const circle = isCircle ? panelCircleClipAttrs(bounds) : null;

    return (
      <g
        key={index}
        data-panel-index={index}
        data-panel-bleed={panel.bleedMode ?? 'trim'}
        data-panel-shape={panel.shape ?? 'rect'}
        className={onPanelSelect ? 'comic-mockup-svg__panel--interactive' : undefined}
        onClick={onPanelSelect ? () => onPanelSelect(index) : undefined}
        // Canvas content, not chrome: panels can render tiny in thumbnail strips
        // and the panel inspector duplicates the selection affordance.
        data-labs-allow-small-touch-target={onPanelSelect ? '' : undefined}
        role={onPanelSelect ? 'button' : undefined}
        tabIndex={onPanelSelect ? 0 : undefined}
        onKeyDown={
          onPanelSelect
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onPanelSelect(index);
                }
              }
            : undefined
        }
      >
        <g clipPath={`url(#${clipId(index)})`}>
          {isCircle && circle ? (
            <circle
              cx={circle.cx}
              cy={circle.cy}
              r={circle.r}
              fill={panelColors[index] ?? '#f5f5f0'}
              stroke="none"
            />
          ) : (
            <polygon points={points} fill={panelColors[index] ?? '#f5f5f0'} stroke="none" />
          )}
          {fill?.backgroundImage ? (
            <>
              <image
                href={fill.backgroundImage.url}
                x={inner.x}
                y={inner.y}
                width={inner.w}
                height={inner.h}
                preserveAspectRatio="xMidYMid slice"
                opacity={0.55}
                crossOrigin="anonymous"
                className="comic-mockup-svg__panel-background comic-mockup-svg__panel-background--base"
              />
              <image
                href={fill.backgroundImage.url}
                x={inner.x}
                y={inner.y}
                width={inner.w}
                height={inner.h}
                preserveAspectRatio="xMidYMid slice"
                filter={`url(#${duotoneFilterId})`}
                opacity={0.72}
                crossOrigin="anonymous"
                className="comic-mockup-svg__panel-background"
              />
            </>
          ) : null}
          {hasBackgroundImage
            ? null
            : showHorizon
              ? renderHorizonScene(inner, figureColor, panelStroke * 0.85, skyColor, groundColor)
              : characterFirst
                ? null
                : renderPanelComposition(fill, inner, figureColor, accentColor, sketchy)}
          {/* Clip dialogue when escape is off; markers stay outside so slant clips never crop cast. */}
          {!allowBubbleEscape ? textOverlay : null}
        </g>
        {isCircle && circle ? (
          <circle
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill="none"
            stroke={selectedPanelIndex === index ? '#f4a000' : '#333'}
            strokeWidth={selectedPanelIndex === index ? panelStroke + 1.5 : panelStroke}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <polygon
            points={points}
            fill="none"
            stroke={selectedPanelIndex === index ? '#f4a000' : '#333'}
            strokeWidth={selectedPanelIndex === index ? panelStroke + 1.5 : panelStroke}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* Markers after stroke so thick borders never cover heads; bounds are shape-aware. */}
        {characterFirst
          ? slotIds.map((characterId) => {
              const emoji = emojisBySlot[characterId];
              if (!emoji) return null;
              return (
                <EmojiCharacterMarker
                  key={`emoji-marker-${characterId}`}
                  characterId={characterId}
                  bounds={markerLayoutBounds(inner, panel.shape ?? 'rect', panelStroke)}
                  emoji={emoji}
                  placement={markerPlacement}
                  name={labelsBySlot[characterId]}
                />
              );
            })
          : characterIds.map((characterId) =>
              renderCharacterMarker(
                characterId,
                markerLayoutBounds(inner, panel.shape ?? 'rect', panelStroke),
                figureColor,
                panelStroke * 0.9,
              ),
            )}
        {showReadingOrder && orderIndex >= 0 ? (
          <text
            x={bounds.x + 10}
            y={bounds.y + 18}
            fontSize={14}
            fontWeight="700"
            fill={accentColor}
            stroke="#ffffff"
            strokeWidth={3.25}
            paintOrder="stroke fill"
            className="comic-mockup-svg__panel-index"
          >
            {orderIndex + 1}
          </text>
        ) : null}
      </g>
    );
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={['comic-mockup-svg', sketchy ? 'comic-mockup-svg--sketchy' : ''].filter(Boolean).join(' ')}
      data-testid="comic-mockup-svg"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      <rect width={width} height={height} fill={backgroundColor} />
      <defs>
        <filter id={duotoneFilterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={DUOTONE_GRAYSCALE_MATRIX} />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={duotoneTables.r} />
            <feFuncG type="table" tableValues={duotoneTables.g} />
            <feFuncB type="table" tableValues={duotoneTables.b} />
          </feComponentTransfer>
        </filter>
        {layout.panels.map((panel, index) => {
          const bounds = panelPixelBounds(panel, width, height, 2);
          const clip = resolvePanelClip(panel);
          const circle = panelUsesCircleClip(panel) ? panelCircleClipAttrs(bounds) : null;
          return (
            <clipPath key={`clip-${index}`} id={clipId(index)}>
              {circle ? (
                <circle cx={circle.cx} cy={circle.cy} r={circle.r} />
              ) : (
                <polygon points={panelSvgPointsAttr(clip, bounds)} />
              )}
            </clipPath>
          );
        })}
      </defs>
      {pageBackgroundImage ? (
        <>
          <image
            href={pageBackgroundImage.url}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
            opacity={0.45}
            crossOrigin="anonymous"
            className="comic-mockup-svg__page-background comic-mockup-svg__page-background--base"
          />
          <image
            href={pageBackgroundImage.url}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
            filter={`url(#${duotoneFilterId})`}
            opacity={0.65}
            crossOrigin="anonymous"
            className="comic-mockup-svg__page-background"
          />
        </>
      ) : null}
      {panelNodes}
      {allowBubbleEscape && textOverlays.length > 0 ? (
        <g className="comic-mockup-svg__text-escape">{textOverlays}</g>
      ) : null}
      {bleedPercents ? (
        <g className="comic-mockup-svg__bleed-guides" aria-hidden>
          <rect
            x={(bleedPercents.bleedWidthPercent / 100) * width}
            y={(bleedPercents.bleedHeightPercent / 100) * height}
            width={width * (1 - (bleedPercents.bleedWidthPercent * 2) / 100)}
            height={height * (1 - (bleedPercents.bleedHeightPercent * 2) / 100)}
            fill="none"
            stroke="rgba(34,197,94,0.75)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        </g>
      ) : null}
    </svg>
  );
}

function renderPanelComposition(
  fill: PanelFillSpec | undefined,
  bounds: { x: number; y: number; w: number; h: number },
  figureColor: string,
  accentColor: string,
  sketchy: boolean,
): ReactElement | null {
  if (fill && isLegacyStickFill(fill)) {
    const pose = legacyStickPose(fill);
    const inner = stickFigureSvg(pose, figureColor);
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    return (
      <g transform={`translate(${cx - bounds.w * 0.25}, ${cy - bounds.h * 0.35}) scale(${bounds.w / 200})`}>
        <g dangerouslySetInnerHTML={{ __html: inner.replace(/<svg[^>]*>|<\/svg>/g, '') }} />
      </g>
    );
  }
  const composition = resolvePanelComposition(fill);
  if (sketchy && composition === 'empty') return null;
  return renderMockupComposition(composition, bounds, figureColor, accentColor);
}

function renderPanelTextOverlay(
  layout: PanelTextLayout,
  bubbleFill: string,
  sketchy: boolean,
  bubbleStroke: number,
  panelIndex: number,
  sfxColor?: string,
): ReactElement | null {
  if (layout.items.length === 0) return null;

  const elements: ReactElement[] = [];
  const captionFont = 'Georgia, "Times New Roman", serif';
  const captionStroke = sketchy ? 2 : 1.25;

  for (const [index, item] of layout.items.entries()) {
    if (item.kind === 'caption') {
      elements.push(
        renderCaptionBox(item.layout, index, 'cap', captionFont, captionStroke, sketchy),
      );
      continue;
    }
    if (item.kind === 'bubble') {
      const bubble = item.layout;
      const paths = speechBubblePathForLayout(
        bubble.cx,
        bubble.cy,
        bubble.halfW,
        bubble.halfH,
        bubble.tailX,
        bubble.tailY,
        bubble.metrics.shape,
      );
      const textOffsetY = bubbleTextOffsetY(
        bubble.cx,
        bubble.cy,
        bubble.halfW,
        bubble.halfH,
        bubble.tailX,
        bubble.tailY,
        bubble.metrics.shape,
        bubble.metrics.padY,
        bubble.metrics.fontSize,
      );
      /* Top-anchor inside the pad box — centered blocks overflow when halfH was capped. */
      const textTop =
        bubble.cy -
        bubble.halfH +
        bubble.metrics.padY +
        bubble.metrics.fontSize * 0.5 +
        textOffsetY;
      const fullText = bubble.sourceContent?.trim() || bubble.lines.join(' ');
      const showFullTextTitle = Boolean(bubble.truncated && fullText);
      elements.push(
        <g key={`bubble-${index}`} className="comic-mockup-svg__bubble-group">
          {/* Single continuous outline (body + tail) — one stroke, no mouth-chord seam. */}
          <g className="comic-mockup-svg__bubble">
            {showFullTextTitle ? <title>{fullText}</title> : null}
            <path
              d={paths.body}
              fill={bubbleFill}
              stroke="#333"
              strokeWidth={bubbleStroke}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={bubble.cx}
              y={textTop}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={bubble.metrics.fontSize}
              fill="#333"
              fontFamily={BUBBLE_FONT_FAMILY}
            >
              {bubble.lines.map((line, lineIndex) => (
                <tspan key={lineIndex} x={bubble.cx} dy={lineIndex === 0 ? 0 : bubble.metrics.lineHeight}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        </g>,
      );
      continue;
    }
    if (item.kind === 'sfx') {
      elements.push(<SfxLayoutGraphic key={`sfx-${index}`} sfx={item.layout} color={sfxColor} />);
    }
  }

  return (
    <g className="comic-mockup-svg__text" data-panel-text-index={panelIndex}>
      {elements}
    </g>
  );
}

function renderCaptionBox(
  caption: {
    x: number;
    y: number;
    width: number;
    height: number;
    lines: string[];
  },
  index: number,
  keyPrefix: string,
  captionFont: string,
  captionStroke: number,
  sketchy: boolean,
): ReactElement {
  return (
    <g key={`${keyPrefix}-${index}`} className="comic-mockup-svg__caption">
      <rect
        x={caption.x}
        y={caption.y}
        width={caption.width}
        height={caption.height}
        fill="#fff"
        stroke="#333"
        strokeWidth={captionStroke}
        rx={sketchy ? 6 : 3}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={caption.x + caption.width / 2}
        y={
          caption.y +
          caption.height / 2 -
          ((Math.max(caption.lines.length, 1) - 1) * 11) / 2
        }
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fill="#444"
        fontStyle="italic"
        fontFamily={captionFont}
      >
        {caption.lines.map((line, lineIndex) => (
          <tspan
            key={lineIndex}
            x={caption.x + caption.width / 2}
            dy={lineIndex === 0 ? 0 : 11}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
