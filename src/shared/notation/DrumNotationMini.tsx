import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, BarlineType } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound, TimeSignature } from '../rhythm/types';
import { drawDrumSymbol } from './drumSymbols';
import DiceIcon from '../components/DiceIcon';
import {
  getDefaultBeatGrouping,
  isCompoundTimeSignature,
  isAsymmetricTimeSignature,
  getBeatGroupingInSixteenths,
} from '../rhythm/timeSignatureUtils';
import { highlightVexFlowMiniNoteGroup } from './playbackSvgHighlight';
import { RhythmTemplateVariationControls } from './RhythmTemplateVariationControls';

/**
 * ARCHITECTURE DECISION: DrumNotationMini vs VexFlowRenderer
 *
 * This component and `src/drums/components/VexFlowRenderer.tsx` both render drum
 * notation using VexFlow, but they intentionally DO NOT share rendering code.
 *
 * Why separate implementations?
 * - DrumNotationMini: Read-only, single measure, playback visualization with theming
 * - VexFlowRenderer: Multi-measure editor with drag-drop, selection, metronome dots
 *
 * These serve fundamentally different purposes. Merging them would require:
 * - Parameter explosion (isEditable, showMetronome, enableDragDrop, etc.)
 * - Conditional rendering paths throughout
 * - Coupling that would make both harder to maintain
 *
 * Per Sandi Metz's "The Wrong Abstraction": prefer duplication over the wrong
 * abstraction. The duplicated beaming logic and constants are acceptable - they're
 * cheaper to maintain than a condition-laden shared component.
 *
 * Shared utilities (types, drumSymbols, timeSignatureUtils) ARE appropriate to share
 * because they're pure functions/data without consumer-specific behavior.
 *
 * @see https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
 */

/**
 * Style configuration for the drum notation renderer.
 * Use a single `inkColor` for staff lines, barlines, noteheads, stems, beams, and time signature.
 */
export interface NotationStyle {
  /** Unified ink for all notation glyphs and lines (staff, barlines, notes, time signature). */
  inkColor: string;
  /** Color for highlighted/active notes during playback. */
  highlightColor: string;
  /** Background color (for contrast). */
  backgroundColor?: string;
}

export type NotationStyleInput = 'light' | 'dark' | NotationStyle;

/**
 * Predefined style presets
 */
 
export const NOTATION_STYLES = {
  light: {
    inkColor: '#333333',
    highlightColor: '#9d8ec7',
    backgroundColor: '#ffffff',
  },
  dark: {
    inkColor: '#c8c4d8',
    highlightColor: '#c9a0b8',
    backgroundColor: '#262630',
  },
} as const satisfies Record<'light' | 'dark', NotationStyle>;

/** Resolve a preset name or custom style object to a full {@link NotationStyle}. */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveNotationStyle(style: NotationStyleInput = 'light'): NotationStyle {
  if (typeof style === 'string') {
    return NOTATION_STYLES[style];
  }
  return style;
}

/** Derive VexFlow layout from the requested render height (host apps tune density via `height`). */
// eslint-disable-next-line react-refresh/only-export-components
export function computeMiniNotationLayout(
  height: number,
  options: { showDrumSymbols: boolean; showMetronomeDots: boolean },
): {
  staveY: number;
  staveHeight: number;
  renderHeight: number;
  symbolGap: number;
  metronomeDotGap: number;
} {
  const edgePadding = 2;
  const isUltraCompact = height <= 68;
  /** Room above the top staff line for time-signature numerals. */
  const timeSignatureSpace = isUltraCompact ? 4 : 8;
  /** Stems, flags, and noteheads extend below the bottom staff line. */
  const noteBottomPad = isUltraCompact ? 16 : 20;
  /** Metronome dots render below the bottom staff line (see draw loop). */
  const metronomeDotRadius = 5;
  const symbolGap = height <= 68 ? 5 : height <= 72 ? 6 : height <= 90 ? 7 : 8;
  const metronomeDotGap = height <= 68 ? 9 : height <= 72 ? 11 : height <= 90 ? 14 : 18;
  const symbolSpace = options.showDrumSymbols
    ? isUltraCompact
      ? Math.round(Math.min(12, Math.max(7, height * 0.12)))
      : Math.round(Math.min(14, Math.max(9, height * 0.14)))
    : 0;
  const staveY = symbolSpace + timeSignatureSpace + edgePadding;
  const belowStaffPad = options.showMetronomeDots
    ? Math.max(noteBottomPad, metronomeDotGap + metronomeDotRadius + edgePadding)
    : noteBottomPad;
  const bottomPad = edgePadding + belowStaffPad;
  /** Fixed staff height — do not shrink when adding top headroom. */
  const staveHeight = options.showMetronomeDots ? 48 : isUltraCompact ? 46 : 50;
  const contentHeight = staveY + staveHeight + bottomPad;
  const renderHeight = Math.max(height, contentHeight);
  return { staveY, staveHeight, renderHeight, symbolGap, metronomeDotGap };
}

/** Grow the SVG to fit VexFlow's real stave geometry (layout `staveHeight` is a budget hint only). */
function resolveMiniNotationRenderHeight(
  requestedHeight: number,
  layout: ReturnType<typeof computeMiniNotationLayout>,
  stave: Stave,
  options: { showMetronomeDots: boolean },
): number {
  const edgePadding = 2;
  const noteBottomPad = requestedHeight <= 68 ? 16 : 20;
  const metronomeDotRadius = 5;
  const bottomLineY = stave.getYForLine(4);
  let contentBottom = bottomLineY + noteBottomPad + edgePadding;
  if (options.showMetronomeDots) {
    contentBottom = Math.max(
      contentBottom,
      bottomLineY + layout.metronomeDotGap + metronomeDotRadius + edgePadding,
    );
  }
  return Math.max(requestedHeight, layout.renderHeight, contentBottom);
}

/** Minimum SVG width so dense 16th patterns do not collide with the end barline. */
// eslint-disable-next-line react-refresh/only-export-components
export function estimateMiniNotationRenderWidth(
  requestedWidth: number,
  notes: Pick<Note, 'durationInSixteenths'>[],
): number {
  const sixteenths = notes.reduce((sum, note) => sum + note.durationInSixteenths, 0);
  const staveX = requestedWidth <= 300 ? 6 : 12;
  const timeSignaturePad = 48;
  const endBarPad = 18;
  const minPerSixteenth = 10.5;
  const contentMin = staveX + timeSignaturePad + sixteenths * minPerSixteenth + endBarPad;
  return Math.max(requestedWidth, Math.ceil(contentMin));
}

/** Notehead bounds in SVG coordinates (after VexFlow draw). */
export type MiniNotationNoteheadBounds = {
  centerX: number;
  topY: number;
  bottomY: number;
};

const NOTEHEAD_SELECTOR =
  '.vf-notehead, path[class*="notehead"], ellipse[class*="notehead"], circle[class*="notehead"]';

function svgPointFromElementLocal(
  svg: SVGSVGElement,
  el: SVGGraphicsElement,
  x: number,
  y: number,
): { x: number; y: number } | null {
  if (typeof svg.createSVGPoint !== 'function') return null;
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;

  const withTransform = el as SVGGraphicsElement & {
    getTransformToElement?: (target: SVGElement) => DOMMatrix;
  };
  if (typeof withTransform.getTransformToElement === 'function') {
    try {
      const matrix = withTransform.getTransformToElement(svg as unknown as SVGElement);
      const transformed = pt.matrixTransform(matrix);
      return { x: transformed.x, y: transformed.y };
    } catch {
      /* fall through */
    }
  }

  if (typeof el.getCTM !== 'function') return null;
  const ctm = el.getCTM();
  if (!ctm) return null;
  const transformed = pt.matrixTransform(ctm);
  return { x: transformed.x, y: transformed.y };
}

/** Read the painted notehead box so symbols can center on the glyph, not the stem origin. */
// eslint-disable-next-line react-refresh/only-export-components
export function readMiniNotationNoteheadBounds(
  staveNote: StaveNote,
): MiniNotationNoteheadBounds | null {
  const noteEl = staveNote.getSVGElement();
  if (!noteEl) return null;

  const noteheads = noteEl.querySelectorAll(NOTEHEAD_SELECTOR);
  if (noteheads.length === 0) return null;

  const svg = noteEl.ownerSVGElement;
  if (!svg) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let found = false;

  noteheads.forEach((head) => {
    const el = head as SVGGraphicsElement;
    if (typeof el.getBBox !== 'function') return;
    try {
      const box = el.getBBox();
      if (box.width <= 0 || box.height <= 0) return;
      const tl = svgPointFromElementLocal(svg, el, box.x, box.y);
      const br = svgPointFromElementLocal(
        svg,
        el,
        box.x + box.width,
        box.y + box.height,
      );
      if (!tl || !br) return;
      minX = Math.min(minX, tl.x, br.x);
      maxX = Math.max(maxX, tl.x, br.x);
      minY = Math.min(minY, tl.y, br.y);
      maxY = Math.max(maxY, tl.y, br.y);
      found = true;
    } catch {
      /* try next notehead */
    }
  });

  if (found) {
    return {
      centerX: (minX + maxX) / 2,
      topY: minY,
      bottomY: maxY,
    };
  }

  // Headless tests / pre-layout: map the note group's bbox into SVG space.
  if (typeof (noteEl as SVGGraphicsElement).getBBox === 'function') {
    try {
      const noteBox = (noteEl as SVGGraphicsElement).getBBox();
      if (noteBox.width > 0 && noteBox.height > 0) {
        const tl = svgPointFromElementLocal(svg, noteEl as SVGGraphicsElement, noteBox.x, noteBox.y);
        const br = svgPointFromElementLocal(
          svg,
          noteEl as SVGGraphicsElement,
          noteBox.x + noteBox.width,
          noteBox.y + noteBox.height,
        );
        if (tl && br) {
          return {
            centerX: (tl.x + br.x) / 2,
            topY: tl.y,
            bottomY: br.y,
          };
        }
      }
    } catch {
      /* caller falls back to getAbsoluteX */
    }
  }

  return null;
}

/** Scale drum symbols for compact mini hosts; explicit overrides are clamped to stay legible. */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveMiniDrumSymbolScale(height: number, override?: number): number {
  const compactDefault = height <= 68 ? 0.68 : height <= 72 ? 0.72 : height <= 90 ? 0.78 : 0.85;
  if (override == null || override <= 0) return compactDefault;
  return Math.max(override, compactDefault * 0.92);
}

/** Vertical offset passed to {@link drawDrumSymbol} so path geometry sits above the notehead. */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveMiniDrumSymbolYOffset(height: number, scale: number): number {
  const base = height <= 68 ? -16 : height <= 72 ? -18 : height <= 90 ? -22 : -28;
  return base - Math.max(0, (scale - 0.64) * 6);
}

/** Y argument for {@link drawDrumSymbol} so symbols land in the top symbol band. */
// eslint-disable-next-line react-refresh/only-export-components
export function resolveMiniDrumSymbolDrawY(
  height: number,
  topLineY: number,
  symbolGap: number,
  symbolYOffset: number,
): number {
  const timeSignatureSpace = height <= 68 ? 4 : height <= 72 ? 6 : 8;
  const symbolBandCenter = Math.max(4, topLineY - timeSignatureSpace - symbolGap);
  return symbolBandCenter - symbolYOffset;
}

interface DrumNotationMiniProps {
  /** Parsed rhythm to render */
  rhythm: ParsedRhythm;
  /** Index of the currently playing note (for highlighting) */
  currentNoteIndex?: number | null;
  /** Width of the notation in pixels */
  width?: number;
  /** Height of the notation in pixels */
  height?: number;
  /** Theme preset ('light' or 'dark') or custom NotationStyle */
  style?: NotationStyleInput;
  /** Whether to show drum symbols above notes */
  showDrumSymbols?: boolean;
  /** Scale factor for drum symbols (default: 0.65) */
  drumSymbolScale?: number;
  /** Whether to show metronome dots under beat positions */
  showMetronomeDots?: boolean;
  /** Current beat index for metronome dot highlighting (0-indexed) */
  currentBeat?: number | null;
  /** Whether playback is active (for metronome dot animation) */
  isPlaying?: boolean;
  /** Optional embedded template randomization controls */
  templateRandomizeOptions?: {
    onRandomPreset?: () => void;
    onRandomFull?: () => void;
    randomPresetTooltip?: string;
    randomFullTooltip?: string;
  };
  /** Optional preset variation carousel (e.g. Maqsum ka ornaments). */
  templateVariationOptions?: {
    presetLabel: string;
    variations: readonly { notation: string; label: string }[];
    activeVariationIndex: number;
    onPrevious: () => void;
    onNext: () => void;
    className?: string;
  };
  /** Optional Darbuka Trainer link rendered under the mini notation */
  darbukaLinkOptions?: {
    notation?: string;
    bpm?: number;
    timeSignature?: TimeSignature;
    metronomeEnabled?: boolean;
    href?: string;
    label?: string;
    className?: string;
    style?: React.CSSProperties;
  };
}

/**
 * Maps Darbuka sounds to staff positions
 */
const SOUND_TO_PITCH: Record<DrumSound, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
  slap: 'f/4',
  rest: 'b/4',
  simile: 'b/4',
};

/**
 * Maps note durations to VexFlow duration strings
 */
const DURATION_MAP: Record<string, string> = {
  sixteenth: '16',
  eighth: '8',
  quarter: 'q',
  half: 'h',
  whole: 'w',
};

/**
 * Creates beams based on beat groupings
 */
function createBeamsFromBeatGroups(
  staveNotes: StaveNote[],
  notes: Note[],
  timeSignature: TimeSignature
): Beam[] {
  const beams: Beam[] = [];
  const beatGrouping = getDefaultBeatGrouping(timeSignature);
  const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, timeSignature);

  let currentPosition = 0;
  let currentNoteIndex = 0;

  const useSubGrouping =
    !isCompoundTimeSignature(timeSignature) && !isAsymmetricTimeSignature(timeSignature);

  for (const beatGroupSize of beatGroupingInSixteenths) {
    const groupEndPosition = currentPosition + beatGroupSize;

    const processNotes = (endPosition: number) => {
      let notesInGroup: StaveNote[] = [];

      while (currentNoteIndex < notes.length && currentPosition < endPosition) {
        const note = notes[currentNoteIndex];
        const staveNote = staveNotes[currentNoteIndex];
        const vexDuration = staveNote.getDuration();
        
        const isBeamable =
          note.sound !== 'rest' &&
          (note.duration === 'eighth' || note.duration === 'sixteenth') &&
          (vexDuration === '8' || vexDuration === '8d' || vexDuration === '16' || vexDuration === '16d');

        if (isBeamable) {
          notesInGroup.push(staveNote);
        } else {
          if (notesInGroup.length > 1) {
            try { beams.push(new Beam(notesInGroup)); } catch { /* ignore */ }
          }
          notesInGroup = [];
        }

        currentPosition += note.durationInSixteenths;
        currentNoteIndex++;
      }

      if (notesInGroup.length > 1) {
        try { beams.push(new Beam(notesInGroup)); } catch { /* ignore */ }
      }
    };

    if (useSubGrouping) {
      while (currentPosition < groupEndPosition && currentNoteIndex < notes.length) {
        const subGroupEndPosition = Math.min(currentPosition + 4, groupEndPosition);
        processNotes(subGroupEndPosition);
      }
    } else {
      processNotes(groupEndPosition);
    }
  }

  return beams;
}

/**
 * Apply unified ink to all SVG elements. Skips playback-highlighted groups so
 * post-processing can paint the active note with highlightColor.
 */
function applyInkToSvgElement(el: SVGElement, inkColor: string): void {
  if (el.closest('[data-highlighted="true"]')) return;

  const tagName = el.tagName.toLowerCase();
  const currentFill = el.getAttribute('fill');

  switch (tagName) {
    case 'path':
    case 'polygon':
    case 'polyline':
    case 'ellipse':
    case 'circle':
    case 'rect':
      el.setAttribute('stroke', inkColor);
      el.style.setProperty('stroke', inkColor, 'important');
      if (currentFill !== 'none') {
        el.setAttribute('fill', inkColor);
        el.style.setProperty('fill', inkColor, 'important');
      }
      break;

    case 'line':
      el.setAttribute('stroke', inkColor);
      el.style.setProperty('stroke', inkColor, 'important');
      break;

    case 'text':
    case 'tspan':
      el.setAttribute('fill', inkColor);
      el.style.setProperty('fill', inkColor, 'important');
      break;

    case 'g':
      el.style.removeProperty('fill');
      el.style.removeProperty('stroke');
      break;
  }
}

function applyColorsToSvg(svg: SVGSVGElement, style: NotationStyle): void {
  svg.querySelectorAll('*').forEach(el => applyInkToSvgElement(el as SVGElement, style.inkColor));
  svg.style.setProperty('--notation-ink', style.inkColor);
  svg.style.setProperty('--notation-highlight', style.highlightColor);
}

/**
 * Compact drum notation renderer for playback visualization
 * Shows a single measure with optional note highlighting
 */
const DrumNotationMini: React.FC<DrumNotationMiniProps> = ({
  rhythm,
  currentNoteIndex = null,
  width = 400,
  height = 100,
  style = 'light',
  showDrumSymbols = true,
  drumSymbolScale = 0.65,
  showMetronomeDots = false,
  currentBeat = null,
  isPlaying = false,
  templateRandomizeOptions,
  templateVariationOptions,
  darbukaLinkOptions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [randomizeTooltip, setRandomizeTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Resolve style to NotationStyle object
  const resolvedStyle = useMemo((): NotationStyle => resolveNotationStyle(style), [style]);

  useEffect(() => {
    if (!containerRef.current || rhythm.measures.length === 0) {
      return;
    }

    containerRef.current.innerHTML = '';

    try {
      const measure = rhythm.measures[0];
      if (!measure || measure.notes.length === 0) return;

      const renderWidth = estimateMiniNotationRenderWidth(width, measure.notes);

      // Calculate layout — `height` drives vertical density for host apps (Stanza rail, etc.)
      const layout = computeMiniNotationLayout(height, {
        showDrumSymbols,
        showMetronomeDots,
      });
      const { staveY, symbolGap, metronomeDotGap } = layout;
      const symbolScale = resolveMiniDrumSymbolScale(height, drumSymbolScale);
      const symbolYOffset = resolveMiniDrumSymbolYOffset(height, symbolScale);
      const staveX = renderWidth <= 300 ? 6 : 12;
      const staveWidth = Math.max(120, renderWidth - staveX - 14);

      const stave = new Stave(staveX, staveY, staveWidth, { numLines: 5 });
      stave.addTimeSignature(
        `${rhythm.timeSignature.numerator}/${rhythm.timeSignature.denominator}`
      );
      stave.setEndBarType(BarlineType.REPEAT_END);

      const renderHeight = resolveMiniNotationRenderHeight(height, layout, stave, {
        showMetronomeDots,
      });

      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(renderWidth, renderHeight);
      const context = renderer.getContext();
      containerRef.current.style.minWidth = `${renderWidth}px`;
      containerRef.current.style.width = `${renderWidth}px`;
      containerRef.current.style.minHeight = `${renderHeight}px`;
      containerRef.current.style.height = `${renderHeight}px`;

      stave.setContext(context).draw();

      // Store refs for post-processing
      const staveNoteRefs: { staveNote: StaveNote; note: Note; index: number }[] = [];

      // Create StaveNotes
      const staveNotes = measure.notes.map((note: Note, noteIndex: number) => {
        let duration = DURATION_MAP[note.duration] || 'q';
        const pitch = SOUND_TO_PITCH[note.sound];
        const isRest = note.sound === 'rest';

        if (note.isDotted) duration += 'd';
        if (isRest) duration += 'r';

        const staveNote = new StaveNote({
          keys: [pitch],
          duration,
          clef: 'percussion',
          autoStem: false,
        });

        const isWholeNote = note.duration === 'whole';
        staveNote.setStemDirection(isRest || isWholeNote ? 0 : 1);

        if (note.isDotted) {
          Dot.buildAndAttach([staveNote], { all: true });
        }

        // Apply highlight style BEFORE drawing (VexFlow's built-in styling)
        const isActive = currentNoteIndex === noteIndex;
        if (isActive) {
          // setStyle affects stems and flags
          staveNote.setStyle({
            fillStyle: resolvedStyle.highlightColor,
            strokeStyle: resolvedStyle.highlightColor,
          });
          // setKeyStyle affects noteheads - apply to all keys (usually just one for drums)
          try {
            const keys = staveNote.getKeys();
            keys.forEach((_, keyIndex) => {
              staveNote.setKeyStyle(keyIndex, {
                fillStyle: resolvedStyle.highlightColor,
                strokeStyle: resolvedStyle.highlightColor,
              });
            });
          } catch {
            // setKeyStyle might fail in some edge cases
          }
        }

        staveNoteRefs.push({ staveNote, note, index: noteIndex });
        return staveNote;
      });

      if (staveNotes.length > 0) {
        // Create and format voice
        const voice = new Voice({
          numBeats: rhythm.timeSignature.numerator,
          beatValue: rhythm.timeSignature.denominator,
        });
        voice.setStrict(false);
        voice.addTickables(staveNotes);

        // Create beams
        const beams = createBeamsFromBeatGroups(staveNotes, measure.notes, rhythm.timeSignature);

        // Format and draw
        const formatter = new Formatter();
        formatter.joinVoices([voice]).format([voice], staveWidth - 70);
        voice.draw(context, stave);

        // Draw beams and track which notes got beamed
        const beamedNotes = new Set<StaveNote>();
        beams.forEach(beam => {
          try {
            beam.setContext(context).draw();
            const beamNotes = beam.getNotes() as StaveNote[];
            beamNotes.forEach(n => beamedNotes.add(n));
          } catch { /* ignore */ }
        });

        // Get SVG and apply styling
        const svg = containerRef.current?.querySelector('svg') as SVGSVGElement;
        if (svg) {
          // Apply theme colors to all elements
          applyColorsToSvg(svg, resolvedStyle);

          // Remove flags from beamed notes
          beamedNotes.forEach(note => {
            const el = note.getSVGElement();
            if (el) {
              el.querySelectorAll('.vf-flag, [class*="flag"]').forEach(f => f.remove());
            }
          });

          // Post-process notes: draw drum symbols and add highlighting
          const highlightColor = resolvedStyle.highlightColor;
          
          staveNoteRefs.forEach(({ staveNote, note, index }) => {
            const isActive = currentNoteIndex === index;
            const isBeamed = beamedNotes.has(staveNote);

            // Apply highlight to active note
            if (isActive) {
              const noteX = staveNote.getAbsoluteX();
              const noteEl = staveNote.getSVGElement();

              if (noteEl) {
                let stemSvg: SVGElement | null = null;
                try {
                  stemSvg =
                    (
                      staveNote as unknown as {
                        getStem?: () => { getSVGElement?: () => SVGElement };
                      }
                    )
                      .getStem?.()
                      ?.getSVGElement?.() ?? null;
                } catch {
                  /* getStem might not exist */
                }

                highlightVexFlowMiniNoteGroup(noteEl, svg, {
                  highlightColor,
                  noteX,
                  isBeamed,
                  staveBottomY: stave.getYForLine(4),
                  stemSvg,
                });
              }
            }

            // Draw drum symbol centered above the notehead. Use painted bounds for X only —
            // notehead topY from getBoundingClientRect is unreliable in real browsers.
            if (showDrumSymbols && note.sound !== 'rest') {
              const bounds = readMiniNotationNoteheadBounds(staveNote);
              const noteX = bounds?.centerX ?? staveNote.getAbsoluteX() + 6;
              const symbolY = resolveMiniDrumSymbolDrawY(
                height,
                stave.getYForLine(0),
                symbolGap,
                symbolYOffset,
              );
              const color = isActive ? resolvedStyle.highlightColor : resolvedStyle.inkColor;
              drawDrumSymbol(svg, noteX, symbolY, note.sound, color, symbolScale, symbolYOffset);
            }
          });

          // Draw metronome dots under beat positions
          if (showMetronomeDots) {
            const beatGrouping = getDefaultBeatGrouping(rhythm.timeSignature);
            const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, rhythm.timeSignature);
            
            let cumulativePosition = 0;
            beatGroupingInSixteenths.forEach((_, beatIndex) => {
              // Find the note at this beat position
              let noteAtBeat: StaveNote | null = null;
              let positionCheck = 0;
              
              for (const { staveNote, note } of staveNoteRefs) {
                if (positionCheck === cumulativePosition) {
                  noteAtBeat = staveNote;
                  break;
                }
                positionCheck += note.durationInSixteenths;
                if (positionCheck > cumulativePosition) {
                  // The beat falls within this note
                  noteAtBeat = staveNote;
                  break;
                }
              }
              
              // Calculate X position - use note position if found, otherwise estimate
              let dotX: number;
              if (noteAtBeat) {
                const bounds = readMiniNotationNoteheadBounds(noteAtBeat);
                dotX = bounds?.centerX ?? noteAtBeat.getAbsoluteX() + 6;
              } else {
                // Estimate position based on beat index
                const staveStart = stave.getNoteStartX();
                const staveEnd = stave.getNoteEndX();
                const staveRange = staveEnd - staveStart;
                dotX = staveStart + (cumulativePosition / 16) * staveRange;
              }
              
              // Position dot below the staff
              const dotY = stave.getYForLine(4) + metronomeDotGap;
              
              // Determine if this beat is active
              const isActiveBeat = isPlaying && currentBeat === beatIndex;
              const isDownbeat = beatIndex === 0;
              
              // Draw the dot
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', dotX.toString());
              circle.setAttribute('cy', dotY.toString());
              circle.setAttribute('r', isDownbeat ? '5' : '4');
              
              if (isActiveBeat) {
                circle.setAttribute('fill', isDownbeat ? '#a855f7' : '#22c55e'); // Purple for downbeat, green for others
                circle.setAttribute('stroke', isDownbeat ? '#9333ea' : '#16a34a');
                circle.setAttribute('stroke-width', '1');
              } else {
                circle.setAttribute('fill', '#4b5563'); // Gray when inactive
                circle.setAttribute('stroke', 'none');
              }
              
              svg.appendChild(circle);
              
              // Move to next beat
              cumulativePosition += beatGroupingInSixteenths[beatIndex];
            });
          }
        }
      }
    } catch (error) {
      console.error('Error rendering drum notation:', error);
    }
  }, [rhythm, currentNoteIndex, width, height, resolvedStyle, showDrumSymbols, drumSymbolScale, showMetronomeDots, currentBeat, isPlaying]);

  if (rhythm.measures.length === 0) {
    return null;
  }

  const darbukaHref = (() => {
    if (!darbukaLinkOptions) return null;
    if (darbukaLinkOptions.href) return darbukaLinkOptions.href;
    if (!darbukaLinkOptions.notation) return null;
    const params = new URLSearchParams();
    params.set('rhythm', darbukaLinkOptions.notation);
    if (typeof darbukaLinkOptions.bpm === 'number') {
      params.set('bpm', String(Math.round(darbukaLinkOptions.bpm)));
    }
    if (darbukaLinkOptions.timeSignature) {
      params.set(
        'time',
        `${darbukaLinkOptions.timeSignature.numerator}/${darbukaLinkOptions.timeSignature.denominator}`
      );
    }
    if (darbukaLinkOptions.metronomeEnabled) {
      params.set('metronome', 'true');
    }
    return `/drums/?${params.toString()}`;
  })();

  return (
    <div style={{ width: '100%' }}>
      {templateVariationOptions ? (
        <RhythmTemplateVariationControls
          presetLabel={templateVariationOptions.presetLabel}
          variations={templateVariationOptions.variations}
          activeVariationIndex={templateVariationOptions.activeVariationIndex}
          onPrevious={templateVariationOptions.onPrevious}
          onNext={templateVariationOptions.onNext}
          className={templateVariationOptions.className}
        />
      ) : null}
      {templateRandomizeOptions?.onRandomPreset || templateRandomizeOptions?.onRandomFull ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '6px',
            marginBottom: '6px',
          }}
        >
          {templateRandomizeOptions.onRandomPreset ? (
            <button
              type="button"
              onClick={templateRandomizeOptions.onRandomPreset}
              aria-label={templateRandomizeOptions.randomPresetTooltip ?? 'Random preset template'}
              onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setRandomizeTooltip({
                  text:
                    templateRandomizeOptions.randomPresetTooltip ??
                    'Random preset template',
                  x: rect.left + rect.width / 2,
                  y: rect.bottom + 8,
                });
              }}
              onMouseLeave={() => setRandomizeTooltip(null)}
              onBlur={() => setRandomizeTooltip(null)}
              style={{
                width: '28px',
                height: '28px',
                minWidth: '28px',
                minHeight: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: '1px solid #9fd8e6',
                background: '#ffffff',
                color: '#0f766e',
                cursor: 'pointer',
              }}
            >
              <DiceIcon variant="single" size={16} />
            </button>
          ) : null}
          {templateRandomizeOptions.onRandomFull ? (
            <button
              type="button"
              onClick={templateRandomizeOptions.onRandomFull}
              aria-label={templateRandomizeOptions.randomFullTooltip ?? 'Fully randomize template'}
              onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setRandomizeTooltip({
                  text:
                    templateRandomizeOptions.randomFullTooltip ??
                    'Fully randomize template',
                  x: rect.left + rect.width / 2,
                  y: rect.bottom + 8,
                });
              }}
              onMouseLeave={() => setRandomizeTooltip(null)}
              onBlur={() => setRandomizeTooltip(null)}
              style={{
                width: '28px',
                height: '28px',
                minWidth: '28px',
                minHeight: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: '1px solid #9fd8e6',
                background: '#ffffff',
                color: '#0f766e',
                cursor: 'pointer',
              }}
            >
              <DiceIcon variant="multiple" size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
      {randomizeTooltip && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                left: `${randomizeTooltip.x}px`,
                top: `${randomizeTooltip.y}px`,
                transform: 'translateX(-50%)',
                background: '#111827',
                color: '#f8fafc',
                borderRadius: '8px',
                padding: '7px 9px',
                fontSize: '11px',
                fontWeight: 600,
                lineHeight: 1.3,
                zIndex: 420,
                maxWidth: '220px',
                pointerEvents: 'none',
                boxShadow: '0 6px 14px rgba(0, 0, 0, 0.22)',
              }}
            >
              {randomizeTooltip.text}
            </div>,
            document.body
          )
        : null}
      <div className="drum-notation-mini-x-scroll">
        <div
          ref={containerRef}
          className="drum-notation-mini"
          style={{
            overflow: 'visible',
            ['--notation-ink' as string]: resolvedStyle.inkColor,
            ['--notation-highlight' as string]: resolvedStyle.highlightColor,
          }}
        />
      </div>
      {darbukaHref ? (
        <div style={{ marginTop: height <= 72 ? '2px' : '6px', display: 'flex', justifyContent: 'center' }}>
          <a
            href={darbukaHref}
            target="_blank"
            rel="noreferrer noopener"
            className={`drum-notation-mini-edit-link${darbukaLinkOptions?.className ? ` ${darbukaLinkOptions.className}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: 'var(--drum-mini-link-size, 0.75rem)',
              fontWeight: 600,
              color: 'var(--drum-mini-link-color, #64748b)',
              textDecoration: 'var(--drum-mini-link-text-decoration, none)',
              padding: 'var(--drum-mini-link-padding, 0)',
              borderRadius: 'var(--drum-mini-link-radius, 0.25rem)',
              border: 'var(--drum-mini-link-border, 0)',
              background: 'var(--drum-mini-link-bg, transparent)',
              ...darbukaLinkOptions?.style,
            }}
          >
            {darbukaLinkOptions?.label ?? 'Edit in Darbuka Trainer'}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px', lineHeight: 1 }}
              aria-hidden="true"
            >
              open_in_new
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );
};

export default DrumNotationMini;
