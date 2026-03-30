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
 * Style configuration for the drum notation renderer
 */
export interface NotationStyle {
  /** Primary color for staff lines, barlines, and note stems */
  staffColor: string;
  /** Color for noteheads and filled elements */
  noteColor: string;
  /** Color for text (time signature) */
  textColor: string;
  /** Color for highlighted/active notes */
  highlightColor: string;
  /** Background color (for contrast) */
  backgroundColor?: string;
}

/**
 * Predefined style presets
 */
export const NOTATION_STYLES = {
  light: {
    staffColor: '#333333',
    noteColor: '#333333',
    textColor: '#333333',
    highlightColor: '#9d8ec7',
    backgroundColor: '#ffffff',
  },
  dark: {
    staffColor: '#c8c4d8',
    noteColor: '#c8c4d8',
    textColor: '#c8c4d8',
    highlightColor: '#c9a0b8',
    backgroundColor: '#262630',
  },
} as const;

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
  style?: 'light' | 'dark' | NotationStyle;
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
 * Apply colors to all SVG elements - force all colors regardless of current value
 * For elements inside notes/beams, we use lower priority styling so highlighting can override.
 */
function applyColorsToSvg(svg: SVGSVGElement, style: NotationStyle): void {
  // Process ALL elements in the SVG
  svg.querySelectorAll('*').forEach(el => {
    const svgEl = el as SVGElement;
    const tagName = svgEl.tagName.toLowerCase();
    const currentFill = svgEl.getAttribute('fill');
    
    // Check if this element is inside a note or beam group
    // These elements need lower-priority styling so highlighting can override
    const isInsideNote = svgEl.closest('.vf-stavenote') !== null;
    const isInsideBeam = svgEl.closest('.vf-beam') !== null;
    const needsLowPriority = isInsideNote || isInsideBeam;
    
    switch (tagName) {
      case 'path':
      case 'polygon':
      case 'polyline':
        // For note/beam elements: only set style (not attribute) without !important
        // This allows setStyle/setKeyStyle to override
        if (needsLowPriority) {
          svgEl.style.stroke = style.staffColor;
          if (currentFill !== 'none') {
            svgEl.style.fill = style.noteColor;
          }
        } else {
          svgEl.setAttribute('stroke', style.staffColor);
          svgEl.style.setProperty('stroke', style.staffColor, 'important');
          if (currentFill !== 'none') {
            svgEl.setAttribute('fill', style.noteColor);
            svgEl.style.setProperty('fill', style.noteColor, 'important');
          }
        }
        break;
        
      case 'line':
        // Lines: stroke only - same low priority for note/beam elements
        if (needsLowPriority) {
          svgEl.style.stroke = style.staffColor;
        } else {
          svgEl.setAttribute('stroke', style.staffColor);
          svgEl.style.setProperty('stroke', style.staffColor, 'important');
        }
        break;
        
      case 'rect':
        // Rectangles: stroke + fill (if not none)
        if (needsLowPriority) {
          svgEl.style.stroke = style.staffColor;
          if (currentFill !== 'none') {
            svgEl.style.fill = style.noteColor;
          }
        } else {
          svgEl.setAttribute('stroke', style.staffColor);
          svgEl.style.setProperty('stroke', style.staffColor, 'important');
          if (currentFill !== 'none') {
            svgEl.setAttribute('fill', style.noteColor);
            svgEl.style.setProperty('fill', style.noteColor, 'important');
          }
        }
        break;
        
      case 'ellipse':
      case 'circle':
        // Noteheads - always low priority
        svgEl.style.stroke = style.staffColor;
        svgEl.style.fill = style.noteColor;
        break;
        
      case 'text':
      case 'tspan':
        // Text elements - high priority
        svgEl.setAttribute('fill', style.textColor);
        svgEl.style.setProperty('fill', style.textColor, 'important');
        break;
        
      case 'g':
        // Groups might have styles - clear them
        svgEl.style.removeProperty('fill');
        svgEl.style.removeProperty('stroke');
        break;
    }
  });

  // Set default styles on the SVG root as fallback
  svg.style.setProperty('--staff-color', style.staffColor);
  svg.style.setProperty('--note-color', style.noteColor);
  svg.style.setProperty('--text-color', style.textColor);
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
  darbukaLinkOptions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [randomizeTooltip, setRandomizeTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Resolve style to NotationStyle object
  const resolvedStyle = useMemo((): NotationStyle => {
    if (typeof style === 'string') {
      return NOTATION_STYLES[style];
    }
    return style;
  }, [style]);

  useEffect(() => {
    if (!containerRef.current || rhythm.measures.length === 0) {
      return;
    }

    containerRef.current.innerHTML = '';

    try {
      const measure = rhythm.measures[0];
      if (!measure || measure.notes.length === 0) return;

      // Calculate layout - compact for mini display
      // Allow enough space for notes at bottom of staff and metronome dots
      const symbolSpace = showDrumSymbols ? 18 : 0;
      const metronomeSpace = showMetronomeDots ? 18 : 0;
      const staveY = symbolSpace + 2;
      const staveHeight = 85; // Enough height for notes at bottom
      const renderHeight = staveY + staveHeight + metronomeSpace;
      const staveWidth = width - 25;

      // Create renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(width, renderHeight);
      const context = renderer.getContext();

      // Create stave
      const stave = new Stave(12, staveY, staveWidth, { numLines: 5 });
      stave.addTimeSignature(
        `${rhythm.timeSignature.numerator}/${rhythm.timeSignature.denominator}`
      );
      stave.setEndBarType(BarlineType.REPEAT_END);
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
                noteEl.setAttribute('data-highlighted', 'true');
                
                // Highlight ALL elements inside the note's SVG group
                // This includes noteheads (paths in VexFlow 5.x), stems (for unbeamed notes), flags
                noteEl.querySelectorAll('*').forEach(el => {
                  const svgEl = el as SVGElement;
                  const tagName = svgEl.tagName.toLowerCase();
                  if (tagName === 'g' || tagName === 'defs') return;
                  
                  // Set fill for filled elements, stroke for stroked elements
                  const currentFill = svgEl.getAttribute('fill');
                  if (currentFill && currentFill !== 'none') {
                    svgEl.style.setProperty('fill', highlightColor, 'important');
                  }
                  svgEl.style.setProperty('stroke', highlightColor, 'important');
                });
              }
              
              // Additional: Find noteheads by searching for filled paths near the note's X position
              // VexFlow 5.x renders noteheads as path glyphs from SMuFL font
              const staveY = stave.getYForLine(4); // Bottom staff line - where noteheads are
              svg.querySelectorAll('path').forEach(pathEl => {
                const bbox = (pathEl as SVGGraphicsElement).getBBox?.();
                if (bbox && bbox.width > 0 && bbox.height > 0) {
                  const pathX = bbox.x + bbox.width / 2;
                  const pathY = bbox.y + bbox.height / 2;
                  
                  // Check if this path is near our note's X position and near the staff
                  // Noteheads are typically small filled paths near the bottom of the staff
                  const fill = pathEl.getAttribute('fill');
                  if (fill && fill !== 'none' && 
                      Math.abs(pathX - noteX) < 12 && 
                      Math.abs(pathY - staveY) < 25 &&
                      bbox.width < 20 && bbox.height < 20) {
                    pathEl.style.setProperty('fill', highlightColor, 'important');
                  }
                }
              });
              
              // For beamed notes, highlight the stem
              // Method 1: Try to get stem directly from VexFlow's StaveNote API
              try {
                const stem = (staveNote as unknown as { getStem?: () => { getSVGElement?: () => SVGElement } }).getStem?.();
                if (stem) {
                  const stemEl = stem.getSVGElement?.();
                  if (stemEl) {
                    stemEl.querySelectorAll('*').forEach(el => {
                      (el as SVGElement).style.setProperty('stroke', highlightColor, 'important');
                      (el as SVGElement).style.setProperty('fill', highlightColor, 'important');
                    });
                    stemEl.style.setProperty('stroke', highlightColor, 'important');
                  }
                }
              } catch { /* getStem might not exist */ }
              
              // Method 2: Search for VexFlow stem class elements near this note
              svg.querySelectorAll('.vf-stem, [class*="stem"]').forEach(el => {
                const bbox = (el as SVGGraphicsElement).getBBox?.();
                if (bbox) {
                  const elX = bbox.x + bbox.width / 2;
                  if (Math.abs(elX - noteX) < 12) {
                    (el as SVGElement).style.setProperty('stroke', highlightColor, 'important');
                    (el as SVGElement).style.setProperty('fill', highlightColor, 'important');
                    // Also highlight children
                    el.querySelectorAll('*').forEach(child => {
                      (child as SVGElement).style.setProperty('stroke', highlightColor, 'important');
                      (child as SVGElement).style.setProperty('fill', highlightColor, 'important');
                    });
                  }
                }
              });
              
              // Method 3: For beamed notes, search entire SVG for vertical line/rect elements
              if (isBeamed) {
                svg.querySelectorAll('line, rect').forEach(el => {
                  const tagName = el.tagName.toLowerCase();
                  
                  if (tagName === 'line') {
                    const line = el as SVGLineElement;
                    const x1 = parseFloat(line.getAttribute('x1') || '0');
                    const x2 = parseFloat(line.getAttribute('x2') || '0');
                    const y1 = parseFloat(line.getAttribute('y1') || '0');
                    const y2 = parseFloat(line.getAttribute('y2') || '0');
                    
                    // Check if this is a vertical line at the note's X position
                    const isVertical = Math.abs(x2 - x1) < 2;
                    const lineHeight = Math.abs(y2 - y1);
                    const lineX = (x1 + x2) / 2;
                    
                    // Stems are vertical lines, 20-60px tall, at the note's X position
                    if (isVertical && lineHeight > 15 && lineHeight < 80 && Math.abs(lineX - noteX) < 10) {
                      line.style.setProperty('stroke', highlightColor, 'important');
                    }
                  } else if (tagName === 'rect') {
                    const rect = el as SVGRectElement;
                    const bbox = rect.getBBox?.();
                    if (bbox) {
                      const rectX = bbox.x + bbox.width / 2;
                      // Stems as rects are very thin (width < 3) and tall
                      if (bbox.width < 4 && bbox.height > 15 && Math.abs(rectX - noteX) < 10) {
                        rect.style.setProperty('fill', highlightColor, 'important');
                        rect.style.setProperty('stroke', highlightColor, 'important');
                      }
                    }
                  }
                });
              }
            }

            // Draw drum symbol just above the note
            if (showDrumSymbols && note.sound !== 'rest') {
              // VexFlow absolute X sits near the stem; nudge to notehead center.
              const noteX = staveNote.getAbsoluteX() + 6;
              // Position symbol above the top staff line (line 0), with a small gap
              const symbolY = stave.getYForLine(0) - 8;
              const color = isActive ? resolvedStyle.highlightColor : resolvedStyle.noteColor;
              drawDrumSymbol(svg, noteX, symbolY, note.sound, color, drumSymbolScale, 0);
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
                dotX = noteAtBeat.getAbsoluteX() + 6; // Center under notehead
              } else {
                // Estimate position based on beat index
                const staveStart = stave.getNoteStartX();
                const staveEnd = stave.getNoteEndX();
                const staveRange = staveEnd - staveStart;
                dotX = staveStart + (cumulativePosition / 16) * staveRange;
              }
              
              // Position dot below the staff
              const dotY = stave.getYForLine(4) + 18;
              
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
      <div
        ref={containerRef}
        className="drum-notation-mini"
        style={{ width: '100%', overflowX: 'auto' }}
      />
      {darbukaHref ? (
        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center' }}>
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
