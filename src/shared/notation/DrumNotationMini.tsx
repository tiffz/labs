import React, { useEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, BarlineType } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound, TimeSignature } from '../rhythm/types';
import { drawDrumSymbol } from './drumSymbols';
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
 * Uses both attributes and inline styles with important flags
 */
function applyColorsToSvg(svg: SVGSVGElement, style: NotationStyle): void {
  // Helper to force color on an element
  const forceColors = (el: SVGElement, stroke: string | null, fill: string | null) => {
    if (stroke) {
      el.setAttribute('stroke', stroke);
      el.style.setProperty('stroke', stroke, 'important');
    }
    if (fill) {
      el.setAttribute('fill', fill);
      el.style.setProperty('fill', fill, 'important');
    }
  };

  // Process ALL elements in the SVG
  svg.querySelectorAll('*').forEach(el => {
    const svgEl = el as SVGElement;
    const tagName = svgEl.tagName.toLowerCase();
    const currentFill = svgEl.getAttribute('fill');
    
    switch (tagName) {
      case 'path':
      case 'polygon':
      case 'polyline':
        // Paths: stroke + fill (if not none)
        forceColors(svgEl, style.staffColor, currentFill !== 'none' ? style.noteColor : null);
        break;
        
      case 'line':
        // Lines: stroke only
        forceColors(svgEl, style.staffColor, null);
        break;
        
      case 'rect':
        // Rectangles: stroke + fill (if not none) - includes barlines
        forceColors(svgEl, style.staffColor, currentFill !== 'none' ? style.noteColor : null);
        break;
        
      case 'ellipse':
      case 'circle':
        // Noteheads
        forceColors(svgEl, style.staffColor, style.noteColor);
        break;
        
      case 'text':
      case 'tspan':
        // Text elements
        forceColors(svgEl, null, style.textColor);
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
            (beam.getNotes() as StaveNote[]).forEach(n => beamedNotes.add(n));
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

          // Post-process notes: highlighting and drum symbols
          staveNoteRefs.forEach(({ staveNote, note, index }) => {
            const isActive = currentNoteIndex === index;

            // Apply highlight to active note (entire note including stem, head, flags)
            if (isActive) {
              const noteEl = staveNote.getSVGElement();
              if (noteEl) {
                // Mark element for debugging
                noteEl.setAttribute('data-highlighted', 'true');
                
                // Force highlight color on ALL descendant SVG elements
                // VexFlow uses: path (stems, flags), ellipse (noteheads), rect (dots)
                noteEl.querySelectorAll('*').forEach(el => {
                  const svgEl = el as SVGElement;
                  const tagName = svgEl.tagName.toLowerCase();
                  
                  // Skip container and non-renderable elements
                  if (tagName === 'g' || tagName === 'defs' || tagName === 'title' || tagName === 'desc') return;
                  
                  const currentFill = svgEl.getAttribute('fill');
                  
                  // Paths need both fill AND stroke for flags (filled) and stems (stroked)
                  if (tagName === 'path' || tagName === 'polygon' || tagName === 'polyline') {
                    // Always set fill for paths - flags are filled paths
                    svgEl.setAttribute('fill', resolvedStyle.highlightColor);
                    svgEl.style.setProperty('fill', resolvedStyle.highlightColor, 'important');
                    // Set stroke for stems
                    svgEl.setAttribute('stroke', resolvedStyle.highlightColor);
                    svgEl.style.setProperty('stroke', resolvedStyle.highlightColor, 'important');
                  }
                  // Lines (used for ledger lines, ties)
                  else if (tagName === 'line') {
                    svgEl.setAttribute('stroke', resolvedStyle.highlightColor);
                    svgEl.style.setProperty('stroke', resolvedStyle.highlightColor, 'important');
                  }
                  // Noteheads are typically ellipses - force fill
                  else if (tagName === 'ellipse' || tagName === 'circle') {
                    svgEl.setAttribute('fill', resolvedStyle.highlightColor);
                    svgEl.style.setProperty('fill', resolvedStyle.highlightColor, 'important');
                  }
                  // Rectangles (dots, barlines) - only if visible
                  else if (tagName === 'rect' && currentFill && currentFill !== 'none') {
                    svgEl.setAttribute('fill', resolvedStyle.highlightColor);
                    svgEl.style.setProperty('fill', resolvedStyle.highlightColor, 'important');
                  }
                });
              }
            }

            // Draw drum symbol just above the note
            if (showDrumSymbols && note.sound !== 'rest') {
              const noteX = staveNote.getAbsoluteX();
              // Center symbol above the notehead (notehead width ~10-12px, so offset by ~6px)
              const symbolXOffset = 6;
              // Position symbol above the top staff line (line 0), with a small gap
              const symbolY = stave.getYForLine(0) - 8;
              const color = isActive ? resolvedStyle.highlightColor : resolvedStyle.noteColor;
              drawDrumSymbol(svg, noteX + symbolXOffset, symbolY, note.sound, color, drumSymbolScale, 0);
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

  return (
    <div
      ref={containerRef}
      className="drum-notation-mini"
      style={{ width: '100%', overflowX: 'auto' }}
    />
  );
};

export default DrumNotationMini;
