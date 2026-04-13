/**
 * VexFlow renderer for chord progressions
 * Renders grand staff (bass + treble clef) with proper measure-by-measure formatting
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, BarlineType, Dot, Beam, Fraction } from 'vexflow';
import type { ChordProgressionState } from '../types';
import type { Key } from '../../shared/music/chordTypes';
import { progressionToChords } from '../utils/chordTheory';
import { generateVoicing } from '../utils/chordVoicing';
import { generateStyledChordNotes } from '../utils/chordStyling';
import { getKeySignature } from '../utils/keySignature';
import { scrollPlaybackTarget, type PlaybackAutoScrollState } from '../../shared/utils/playbackAutoScroll';
import { spellPitchClass } from '../../shared/music/theory/pitchClass';

interface ChordScoreRendererProps {
  state: ChordProgressionState;
  currentChordIndex?: number | null;
  activeNoteGroups?: Set<string>; // Set of "measureIndex:clef:groupIndex" strings
  isPlaying?: boolean;
}

function midiToPitch(midiNote: number, key: string): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = spellPitchClass(midiNote % 12, key as Key);
  return `${noteName}/${octave}`;
}

function formatChordName(chord: ReturnType<typeof progressionToChords>[number]): string {
  let name = chord.root;
  const qualityMap: Record<string, string> = {
    'minor': 'm',
    'diminished': '°',
    'augmented': '+',
    'sus2': 'sus2',
    'sus4': 'sus4',
    'dominant7': '7',
    'major7': 'maj7',
    'minor7': 'm7',
  };
  name += qualityMap[chord.quality] || '';
  return name;
}

function normalizeKeyForVexFlow(key: string): string {
  const keyMap: Record<string, string> = {
    'A#': 'Bb',
    'C#': 'C#',
    'D#': 'Eb',
    'F#': 'F#',
    'G#': 'Ab',
  };
  return keyMap[key] || key;
}

function notesToStaveNote(
  notes: number[],
  duration: string,
  clef: 'bass' | 'treble',
  key: string
): StaveNote {
  if (notes.length === 0) {
    const restPitch = clef === 'bass' ? 'b/3' : 'b/4';
    const restDuration = duration.includes('r') ? duration : duration + 'r';
    const staveNote = new StaveNote({
      keys: [restPitch],
      duration: restDuration,
      clef: clef,
    });
    return staveNote;
  }
  
  const pitches = notes.map((midiNote) => midiToPitch(midiNote, key));
  const isDotted = duration.includes('d') && !duration.includes('r');
  
  const staveNote = new StaveNote({
    keys: pitches,
    duration: duration,
    clef: clef,
    autoStem: false,
  });

  const normalizedDuration = duration.replace('r', '').replace('d', '');
  const isWholeNote = normalizedDuration === 'w';
  const isLikelyBeamed = normalizedDuration === '8' || normalizedDuration === '16';
  if (!isWholeNote && !isLikelyBeamed) {
    staveNote.setStemDirection(clef === 'treble' ? 1 : -1);
  }
  
  if (isDotted) {
    Dot.buildAndAttach([staveNote], { all: true });
  }
  
  return staveNote;
}

const HIGHLIGHT_COLOR = '#ef4444';
const DEFAULT_COLOR = '#000000';

const ChordScoreRenderer: React.FC<ChordScoreRendererProps> = ({
  state,
  currentChordIndex,
  activeNoteGroups = new Set(),
  isPlaying = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<string>('');
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const noteElementMapRef = useRef<Map<string, SVGElement>>(new Map());
  const measureAnchorMapRef = useRef<Map<number, SVGElement>>(new Map());
  const autoScrollStateRef = useRef<PlaybackAutoScrollState>({
    lastMarker: null,
    lastScrollAtMs: 0,
    lastTargetTop: null,
  });
  const prevHighlightedRef = useRef<Set<string>>(new Set());

  const applyHighlights = useCallback((groups: Set<string>) => {
    const prev = prevHighlightedRef.current;

    // Remove highlight from notes no longer active
    prev.forEach(key => {
      if (!groups.has(key)) {
        const el = noteElementMapRef.current.get(key);
        if (el) setNoteColor(el, DEFAULT_COLOR);
      }
    });

    // Add highlight to newly active notes
    groups.forEach(key => {
      if (!prev.has(key)) {
        const el = noteElementMapRef.current.get(key);
        if (el) setNoteColor(el, HIGHLIGHT_COLOR);
      }
    });

    prevHighlightedRef.current = new Set(groups);
  }, []);

  // Main render effect — only runs when musical content changes (NOT on highlight changes)
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (!scrollContainerRef.current) {
      let element: HTMLElement | null = containerRef.current;
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
            style.overflow === 'auto' || style.overflow === 'scroll') {
          scrollContainerRef.current = element;
          break;
        }
        element = element.parentElement;
      }
      if (!scrollContainerRef.current) {
        scrollContainerRef.current = document.documentElement;
      }
    }
    
    const currentStateKey = JSON.stringify({
      progression: state.progression.name,
      key: state.key,
      tempo: state.tempo,
      timeSignature: state.timeSignature,
      stylingStrategy: state.stylingStrategy,
      measuresPerChord: state.measuresPerChord,
      voicingOptions: state.voicingOptions,
    });
    
    if (stateRef.current === currentStateKey) return;
    stateRef.current = currentStateKey;
    
    containerRef.current.innerHTML = '';
    noteElementMapRef.current.clear();
    measureAnchorMapRef.current.clear();
    prevHighlightedRef.current.clear();

    try {
      const chords = progressionToChords(state.progression.progression, state.key);
      
      if (chords.length === 0) {
        console.warn('No chords to render');
        return;
      }
      
      const trebleVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'treble'));
      const bassVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'bass'));
      
      const styledChords = chords.map((chord, index) => 
        generateStyledChordNotes(chord, trebleVoicings[index], bassVoicings[index], state.stylingStrategy, state.timeSignature)
      );
      
      const measuresPerChord = state.measuresPerChord || 1;
      const expandedStyledChords: typeof styledChords = [];
      const expandedChords: typeof chords = [];
      const expandedChordNames: string[] = [];
      
      chords.forEach((chord, chordIndex) => {
        const styledChord = styledChords[chordIndex];
        const chordNameString = formatChordName(chord);
        
        for (let i = 0; i < measuresPerChord; i++) {
          expandedStyledChords.push(styledChord);
          expandedChords.push(chord);
          expandedChordNames.push(i === 0 ? chordNameString : '');
        }
      });
      
      const totalMeasures = expandedStyledChords.length;
      
      const maxNotesPerMeasure = Math.max(...styledChords.map(sc => 
        sc.trebleNotes.length + sc.bassNotes.length
      ));
      
      const complexityScore = totalMeasures * 0.5 + maxNotesPerMeasure * 2 + measuresPerChord * 2;
      
      const baseComplexity = 10;
      const maxComplexity = 40;
      const minScale = 0.75;
      const maxScale = 1.0;
      const complexityScale = Math.max(minScale, maxScale - ((complexityScore - baseComplexity) / (maxComplexity - baseComplexity)) * (maxScale - minScale));
      
      const densityScale = 0.85;
      const finalScale = complexityScale * densityScale;
      
      const containerWidth = containerRef.current.clientWidth || 1200;
      const baseMeasureWidth = 320;
      const defaultMeasuresPerLine = 4;
      
      const measureWidth = (baseMeasureWidth + Math.max(0, (maxNotesPerMeasure - 4) * 15)) * finalScale;
      
      const maxMeasuresByWidth = Math.floor((containerWidth - 120) / measureWidth);
      const measuresPerLine = maxMeasuresByWidth >= defaultMeasuresPerLine 
        ? defaultMeasuresPerLine 
        : Math.max(1, maxMeasuresByWidth);
      const numLines = Math.ceil(totalMeasures / measuresPerLine);
      
      const baseLineHeight = 240;
      const baseLineSpacing = 40;
      const baseStaffSpacing = 100;
      const lineHeight = baseLineHeight * finalScale;
      const lineSpacing = baseLineSpacing * finalScale;
      const staffSpacing = baseStaffSpacing * finalScale;
      const totalHeight = (lineHeight * numLines) + (lineSpacing * (numLines - 1)) + 40;
      
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(containerWidth, totalHeight);
      const context = renderer.getContext();
      
      context.scale(finalScale, finalScale);
      
      const scaleFactor = 1 / finalScale;
      
      const normalizedKey = normalizeKeyForVexFlow(state.key);
      const keySig = getKeySignature(state.key);
      
      let lastTrebleStaveGlobal: Stave | null = null;
      let lastBassStaveGlobal: Stave | null = null;
      
      for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
        const startMeasure = lineIndex * measuresPerLine;
        const endMeasure = Math.min(startMeasure + measuresPerLine, totalMeasures);
        
        const trebleY = (30 * scaleFactor) + (lineIndex * ((lineHeight + lineSpacing) * scaleFactor));
        const bassY = trebleY + (staffSpacing * scaleFactor);
        
        const trebleStaves: Stave[] = [];
        const bassStaves: Stave[] = [];
        
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          const xPosition = (20 * scaleFactor) + (localMeasureIndex * (measureWidth * scaleFactor));
          const isLastMeasure = measureIndex === totalMeasures - 1;
          
          const trebleStave = new Stave(xPosition, trebleY, measureWidth * scaleFactor);
          if (localMeasureIndex === 0) {
            trebleStave.addClef('treble');
            if (keySig.count > 0) {
              try {
                trebleStave.addKeySignature(normalizedKey);
              } catch (e) {
                console.warn('Failed to add key signature:', e);
              }
            }
            trebleStave.addTimeSignature(`${state.timeSignature.numerator}/${state.timeSignature.denominator}`);
          }
          if (isLastMeasure) {
            trebleStave.setEndBarType(BarlineType.REPEAT_END);
          } else {
            trebleStave.setEndBarType(BarlineType.SINGLE);
          }
          trebleStaves.push(trebleStave);
          
          const bassStave = new Stave(xPosition, bassY, measureWidth * scaleFactor);
          if (localMeasureIndex === 0) {
            bassStave.addClef('bass');
            if (keySig.count > 0) {
              try {
                bassStave.addKeySignature(normalizedKey);
              } catch (e) {
                console.warn('Failed to add key signature:', e);
              }
            }
            bassStave.addTimeSignature(`${state.timeSignature.numerator}/${state.timeSignature.denominator}`);
          }
          if (isLastMeasure) {
            bassStave.setEndBarType(BarlineType.REPEAT_END);
          } else {
            bassStave.setEndBarType(BarlineType.SINGLE);
          }
          bassStaves.push(bassStave);
        }
        
        trebleStaves.forEach(stave => stave.setContext(context).draw());
        bassStaves.forEach(stave => stave.setContext(context).draw());
        
        if (trebleStaves.length > 0 && bassStaves.length > 0) {
          const connector = new StaveConnector(trebleStaves[0], bassStaves[0]);
          connector.setType(StaveConnector.type.BRACE);
          connector.setContext(context).draw();
        }
        
        for (let i = 0; i < trebleStaves.length - 1; i++) {
          const connector = new StaveConnector(trebleStaves[i], trebleStaves[i + 1]);
          connector.setType(StaveConnector.type.SINGLE);
          connector.setContext(context).draw();
        }
        for (let i = 0; i < bassStaves.length - 1; i++) {
          const connector = new StaveConnector(bassStaves[i], bassStaves[i + 1]);
          connector.setType(StaveConnector.type.SINGLE);
          connector.setContext(context).draw();
        }
        
        if (endMeasure === totalMeasures) {
          lastTrebleStaveGlobal = trebleStaves[trebleStaves.length - 1];
          lastBassStaveGlobal = bassStaves[bassStaves.length - 1];
        }
        
        const firstNoteRefs: Map<number, { note: StaveNote; stave: Stave }> = new Map();
        
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          const trebleStave = trebleStaves[localMeasureIndex];
          const bassStave = bassStaves[localMeasureIndex];
          const styledChord = expandedStyledChords[measureIndex];
          
          const trebleNotes: StaveNote[] = [];
          const bassNotes: StaveNote[] = [];
          
          // Note group key -> StaveNote mapping (populated after draw for SVG element capture)
          const trebleNoteKeys: { key: string; note: StaveNote }[] = [];
          const bassNoteKeys: { key: string; note: StaveNote }[] = [];
          
          styledChord.trebleNotes.forEach((trebleGroup, groupIndex) => {
            const trebleNote = notesToStaveNote(
              trebleGroup.notes,
              trebleGroup.duration,
              'treble',
              state.key
            );
            const noteKey = `${measureIndex}:treble:${groupIndex}`;
            trebleNoteKeys.push({ key: noteKey, note: trebleNote });
            trebleNotes.push(trebleNote);
          });
          
          styledChord.bassNotes.forEach((bassGroup, groupIndex) => {
            const bassNote = notesToStaveNote(
              bassGroup.notes,
              bassGroup.duration,
              'bass',
              state.key
            );
            const noteKey = `${measureIndex}:bass:${groupIndex}`;
            bassNoteKeys.push({ key: noteKey, note: bassNote });
            bassNotes.push(bassNote);
          });
          
          const trebleVoice = new Voice({ 
            numBeats: state.timeSignature.numerator, 
            beatValue: state.timeSignature.denominator 
          });
          trebleVoice.setStrict(true);
          trebleVoice.addTickables(trebleNotes);
          
          const bassVoice = new Voice({ 
            numBeats: state.timeSignature.numerator, 
            beatValue: state.timeSignature.denominator 
          });
          bassVoice.setStrict(true);
          bassVoice.addTickables(bassNotes);
          
          const noteStartX = trebleStave.getNoteStartX();
          const staveWidth = trebleStave.getWidth();
          const staveX = trebleStave.getX();
          const staveEndX = staveX + staveWidth;
          
          const barlineWidth = 10 * scaleFactor;
          const rightPadding = 15 * scaleFactor;
          const formatWidth = Math.max(30 * scaleFactor, Math.min(
            staveEndX - noteStartX - barlineWidth - rightPadding,
            staveWidth - (noteStartX - staveX) - barlineWidth - rightPadding
          ));
          
          const addBeams = (notes: StaveNote[], clef: 'treble' | 'bass') => {
            const beamGroup =
              state.timeSignature.denominator === 8
                ? new Fraction(3, 8)
                : new Fraction(1, 4);
            const beams = Beam.generateBeams(notes, {
              groups: [beamGroup],
              beamRests: false,
              maintainStemDirections: false,
            });
            const groupStemDirection = clef === 'treble' ? 1 : -1;
            beams.forEach((beam) => {
              beam.getNotes().forEach((note) => {
                (note as StaveNote).setStemDirection(groupStemDirection);
              });
            });
            return beams;
          };

          const trebleBeams = addBeams(trebleNotes, 'treble');
          const bassBeams = addBeams(bassNotes, 'bass');

          const suppressFlagsForBeamedNotes = (beams: Beam[]) => {
            const beamedNotes = new Set<StaveNote>();
            beams.forEach((beam) => {
              beam.getNotes().forEach((note) => {
                beamedNotes.add(note as StaveNote);
              });
            });
            beamedNotes.forEach((note) => {
              note.setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
            });
          };

          suppressFlagsForBeamedNotes(trebleBeams);
          suppressFlagsForBeamedNotes(bassBeams);
          
          const formatter = new Formatter();
          formatter.joinVoices([trebleVoice, bassVoice]);
          formatter.format([trebleVoice, bassVoice], formatWidth);
          
          trebleVoice.draw(context, trebleStave);
          bassVoice.draw(context, bassStave);
          
          trebleBeams.forEach(beam => beam.setContext(context).draw());
          bassBeams.forEach(beam => beam.setContext(context).draw());

          // Capture SVG element references for later highlight toggling
          for (const { key, note } of trebleNoteKeys) {
            const svgEl = note.getSVGElement();
            if (svgEl) noteElementMapRef.current.set(key, svgEl);
          }
          for (const { key, note } of bassNoteKeys) {
            const svgEl = note.getSVGElement();
            if (svgEl) noteElementMapRef.current.set(key, svgEl);
          }
          
          const firstNote = trebleNotes.length > 0 ? trebleNotes[0] : (bassNotes.length > 0 ? bassNotes[0] : null);
          if (firstNote) {
            firstNoteRefs.set(measureIndex, { note: firstNote, stave: trebleStave });
            const anchorElement = firstNote.getSVGElement();
            if (anchorElement) {
              measureAnchorMapRef.current.set(measureIndex, anchorElement);
            }
          }
        }
        
        const svgElement = containerRef.current?.querySelector('svg');
        if (svgElement) {
          for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
            const chordName = expandedChordNames[measureIndex];
            if (!chordName) continue;
            
            const localMeasureIndex = measureIndex - startMeasure;
            const trebleStave = trebleStaves[localMeasureIndex];
            
            let xPosition: number;
            const noteRef = firstNoteRefs.get(measureIndex);
            if (noteRef) {
              try {
                const bounds = noteRef.note.getBoundingBox();
                if (bounds) {
                  xPosition = bounds.getX();
                } else {
                  xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? (60 + (keySig.count * 4)) * scaleFactor : 40 * scaleFactor);
                }
              } catch {
                xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? (100 + (keySig.count * 7)) * scaleFactor : 25 * scaleFactor);
              }
            } else {
              xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? 100 + (keySig.count * 7) : 25);
            }
            
            const yPosition = trebleY + (5 * scaleFactor);
            
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('x', String(xPosition));
            textElement.setAttribute('y', String(yPosition));
            textElement.setAttribute('font-family', 'Arial, sans-serif');
            const chordNameFontSize = 14 / finalScale;
            textElement.setAttribute('font-size', String(chordNameFontSize));
            textElement.setAttribute('font-weight', 'bold');
            textElement.setAttribute('fill', '#1e293b');
            textElement.setAttribute('text-anchor', 'start');
            textElement.setAttribute('dominant-baseline', 'baseline');
            textElement.textContent = chordName;
            svgElement.appendChild(textElement);
          }
        }
      }
      
      if (lastTrebleStaveGlobal && lastBassStaveGlobal) {
        const barlineConnector = new StaveConnector(lastTrebleStaveGlobal, lastBassStaveGlobal);
        barlineConnector.setType(StaveConnector.type.SINGLE_RIGHT);
        barlineConnector.setContext(context).draw();
      }

      if (
        state.stylingStrategy === 'one-per-beat' &&
        state.timeSignature.numerator === 12 &&
        state.timeSignature.denominator === 8
      ) {
        containerRef.current
          ?.querySelectorAll('.vf-flag, [class*="vf-flag"]')
          .forEach((node) => node.remove());
      }

      // Apply initial highlights if any are active right now
      if (activeNoteGroups.size > 0) {
        applyHighlights(activeNoteGroups);
      }
      
    } catch (error) {
      console.error('Error rendering chord score:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        state: {
          progression: state.progression.name,
          key: state.key,
          timeSignature: state.timeSignature,
          stylingStrategy: state.stylingStrategy,
        },
      });
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: red; padding: 2rem;">Error rendering chord score: ${error instanceof Error ? error.message : String(error)}. Please try again.</p>`;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- activeNoteGroups handled separately to avoid full re-render
  }, [state]);

  // Lightweight highlight effect — toggles fill/stroke on existing SVG elements without re-rendering
  useEffect(() => {
    applyHighlights(activeNoteGroups);
  }, [activeNoteGroups, applyHighlights]);

  useEffect(() => {
    if (!isPlaying || currentChordIndex === null || currentChordIndex === undefined) return;
    const target =
      measureAnchorMapRef.current.get(currentChordIndex)
      ?? containerRef.current?.querySelector(`[data-measure-index="${currentChordIndex}"]`) as SVGElement | null;
    if (!target) return;
    scrollPlaybackTarget({
      marker: currentChordIndex,
      target,
      state: autoScrollStateRef.current,
      scrollContainer: scrollContainerRef.current,
      minIntervalMs: 100,
      minDeltaPx: 40,
      preferredTopRatio: 0.3,
      allowBackward: true,
    });
  }, [isPlaying, currentChordIndex]);

  useEffect(() => {
    if (isPlaying) return;
    autoScrollStateRef.current.lastMarker = null;
    autoScrollStateRef.current.lastScrollAtMs = 0;
    autoScrollStateRef.current.lastTargetTop = null;
  }, [isPlaying]);

  return (
    <div className="chord-score-container" ref={containerRef} />
  );
};

/**
 * Toggle fill/stroke on all renderable children of a VexFlow SVG group element.
 * VexFlow renders noteheads as <text> glyphs and stems/ledger-lines as <path>.
 */
function setNoteColor(groupEl: SVGElement, color: string): void {
  // Noteheads are <text> elements — set fill (default is inherited black when absent)
  groupEl.querySelectorAll<SVGElement>('text').forEach(el => {
    el.setAttribute('fill', color);
  });
  // Stems and ledger lines are <path> with stroke and fill="none"
  groupEl.querySelectorAll<SVGElement>('path').forEach(el => {
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none' && stroke !== 'transparent') {
      el.setAttribute('stroke', color);
    }
  });
}

export default ChordScoreRenderer;
