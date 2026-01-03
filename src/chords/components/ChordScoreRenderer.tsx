/**
 * VexFlow renderer for chord progressions
 * Renders grand staff (bass + treble clef) with proper measure-by-measure formatting
 */

import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, BarlineType, Dot, Beam } from 'vexflow';
import type { ChordProgressionState } from '../types';
import { progressionToChords } from '../utils/chordTheory';
import { generateVoicing } from '../utils/chordVoicing';
import { generateStyledChordNotes } from '../utils/chordStyling';
import { getKeySignature } from '../utils/keySignature';

interface ChordScoreRendererProps {
  state: ChordProgressionState;
  currentChordIndex?: number | null;
  activeNoteGroups?: Set<string>; // Set of "measureIndex:clef:groupIndex" strings
}

/**
 * Converts MIDI note number to VexFlow pitch string
 */
function midiToPitch(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}/${octave}`;
}

/**
 * Formats chord name for display
 */
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

/**
 * Converts VexFlow key to proper format for addKeySignature
 * VexFlow expects keys like "C", "G", "F", "Bb", "Eb", etc.
 * For enharmonic keys, convert to standard form
 */
function normalizeKeyForVexFlow(key: string): string {
  const keyMap: Record<string, string> = {
    'A#': 'Bb', // A# major = Bb major
    'C#': 'C#', // Keep as is
    'D#': 'Eb', // D# major = Eb major
    'F#': 'F#', // Keep as is
    'G#': 'Ab', // G# major = Ab major
  };
  return keyMap[key] || key;
}

/**
 * Converts chord notes to VexFlow StaveNote
 * Handles rests with consistent positioning (middle line for all rests)
 */
function notesToStaveNote(notes: number[], duration: string, clef: 'bass' | 'treble'): StaveNote {
  // Handle rests (empty notes array) - use consistent middle line position
  if (notes.length === 0) {
    // Use middle line (B) for all rests - consistent positioning
    // Treble clef: B/4 is middle line, Bass clef: B/3 is middle line
    const restPitch = clef === 'bass' ? 'b/3' : 'b/4';
    // VexFlow requires 'r' suffix in duration string to indicate rest
    const restDuration = duration.includes('r') ? duration : duration + 'r';
    const staveNote = new StaveNote({
      keys: [restPitch],
      duration: restDuration,
      clef: clef,
    });
    return staveNote;
  }
  
  const pitches = notes.map(midiToPitch);
  
  // Check if this is a dotted note (duration contains 'd' but not 'r' for rest)
  const isDotted = duration.includes('d') && !duration.includes('r');
  
  const staveNote = new StaveNote({
    keys: pitches,
    duration: duration,
    clef: clef,
  });
  
  // Add dot for dotted notes
  if (isDotted) {
    Dot.buildAndAttach([staveNote], { all: true });
  }
  
  return staveNote;
}


const ChordScoreRenderer: React.FC<ChordScoreRendererProps> = ({ state, currentChordIndex, activeNoteGroups = new Set() }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<string>('');
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const noteElementMapRef = useRef<Map<string, SVGElement[]>>(new Map()); // Map note keys to SVG elements

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find the scrollable container (could be the container itself or a parent)
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
      // Fallback to window if no scrollable container found
      if (!scrollContainerRef.current) {
        scrollContainerRef.current = document.documentElement;
      }
    }
    
    // Check if state changed (not just activeNoteGroups)
    const currentStateKey = JSON.stringify({
      progression: state.progression.name,
      key: state.key,
      tempo: state.tempo,
      timeSignature: state.timeSignature,
      stylingStrategy: state.stylingStrategy,
      measuresPerChord: state.measuresPerChord,
      voicingOptions: state.voicingOptions,
    });
    
    const stateChanged = stateRef.current !== currentStateKey;
    
    // Always preserve scroll position during playback (when activeNoteGroups changes)
    // This allows users to scroll while playback is active
    // Only reset scroll position when the actual music state changes
    let scrollTop = 0;
    let scrollLeft = 0;
    let shouldPreserveScroll = false;
    
    if (scrollContainerRef.current) {
      if (scrollContainerRef.current === document.documentElement) {
        scrollTop = window.scrollY;
        scrollLeft = window.scrollX;
      } else {
        scrollTop = scrollContainerRef.current.scrollTop;
        scrollLeft = scrollContainerRef.current.scrollLeft;
      }
      
      // Preserve scroll if:
      // 1. State hasn't changed (only activeNoteGroups changed - highlighting update)
      // 2. OR if we have a non-zero scroll position (user has scrolled, preserve it)
      shouldPreserveScroll = !stateChanged || (scrollTop > 0 || scrollLeft > 0);
    }
    
    if (stateChanged) {
      stateRef.current = currentStateKey;
    }
    
    // Always render to update highlighting, but preserve scroll position when appropriate
    containerRef.current.innerHTML = '';
    noteElementMapRef.current.clear(); // Clear note element map on re-render

    try {
      // Convert progression to actual chords
      const chords = progressionToChords(state.progression.progression, state.key);
      
      if (chords.length === 0) {
        console.warn('No chords to render');
        return;
      }
      
      // Generate voicings for each chord - separate bass and treble
      const trebleVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'treble'));
      const bassVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'bass'));
      
      // Generate styled chord notes based on styling strategy
      const styledChords = chords.map((chord, index) => 
        generateStyledChordNotes(chord, trebleVoicings[index], bassVoicings[index], state.stylingStrategy, state.timeSignature)
      );
      
      // Expand chords across multiple measures based on measuresPerChord
      // Each chord repeats for measuresPerChord measures
      const measuresPerChord = state.measuresPerChord || 1;
      const expandedStyledChords: typeof styledChords = [];
      const expandedChords: typeof chords = [];
      const expandedChordNames: string[] = [];
      
      chords.forEach((chord, chordIndex) => {
        const styledChord = styledChords[chordIndex];
        // Use formatChordName helper function for consistent formatting
        const chordNameString = formatChordName(chord);
        
        // Repeat this chord for measuresPerChord measures
        for (let i = 0; i < measuresPerChord; i++) {
          expandedStyledChords.push(styledChord);
          expandedChords.push(chord);
          // Only show chord name on first measure of each chord
          expandedChordNames.push(i === 0 ? chordNameString : '');
        }
      });
      
      const totalMeasures = expandedStyledChords.length;
      
      // Calculate complexity score to determine rendering scale
      // Factors: number of measures, notes per measure, measures per chord
      const maxNotesPerMeasure = Math.max(...styledChords.map(sc => 
        sc.trebleNotes.length + sc.bassNotes.length
      ));
      
      // Complexity score: higher = more complex
      // Base complexity from number of measures and notes
      const complexityScore = totalMeasures * 0.5 + maxNotesPerMeasure * 2 + measuresPerChord * 2;
      
      // Calculate scale factor: reduce size as complexity increases
      // For simple music (score ~10): scale = 1.0
      // For complex music (score ~30+): scale = 0.75
      const baseComplexity = 10;
      const maxComplexity = 40;
      const minScale = 0.75;
      const maxScale = 1.0;
      const complexityScale = Math.max(minScale, maxScale - ((complexityScore - baseComplexity) / (maxComplexity - baseComplexity)) * (maxScale - minScale));
      
      // Apply overall density reduction: 50% smaller (85% of original size)
      const densityScale = 0.85;
      const finalScale = complexityScale * densityScale;
      
      // Calculate measures per line (wrap to multiple lines)
      // Default to 4 measures per line for better organization
      const containerWidth = containerRef.current.clientWidth || 1200;
      const baseMeasureWidth = 320; // Base width per measure
      const defaultMeasuresPerLine = 4; // Default to 4 measures per line
      
      // Calculate dynamic measure width based on note count in styled chords
      // More notes need more space to prevent escaping
      // Apply density scale to measure width as well
      const measureWidth = (baseMeasureWidth + Math.max(0, (maxNotesPerMeasure - 4) * 15)) * finalScale;
      
      // Calculate how many measures fit, but prefer 4 if possible
      const maxMeasuresByWidth = Math.floor((containerWidth - 120) / measureWidth);
      const measuresPerLine = maxMeasuresByWidth >= defaultMeasuresPerLine 
        ? defaultMeasuresPerLine 
        : Math.max(1, maxMeasuresByWidth);
      const numLines = Math.ceil(totalMeasures / measuresPerLine);
      
      // Create renderer - grand staff needs more height per line
      // Scale down height and spacing based on complexity
      const baseLineHeight = 240;
      const baseLineSpacing = 40;
      const baseStaffSpacing = 100; // Space between treble and bass staves
      const lineHeight = baseLineHeight * finalScale;
      const lineSpacing = baseLineSpacing * finalScale;
      const staffSpacing = baseStaffSpacing * finalScale;
      const totalHeight = (lineHeight * numLines) + (lineSpacing * (numLines - 1)) + 40;
      
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(containerWidth, totalHeight);
      const context = renderer.getContext();
      
      // Apply scale transform to reduce the actual size of staff and notes
      // This makes the musical notation itself smaller, not just spacing
      context.scale(finalScale, finalScale);
      
      // Adjust coordinates to account for scaling
      // After scaling, we need to divide positions by scale to get correct placement
      const scaleFactor = 1 / finalScale;
      
      // Normalize key for VexFlow
      const normalizedKey = normalizeKeyForVexFlow(state.key);
      const keySig = getKeySignature(state.key);
      
      // Track the last staves across all lines for repeat connector
      let lastTrebleStaveGlobal: Stave | null = null;
      let lastBassStaveGlobal: Stave | null = null;
      
      // Render each line
      for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
        const startMeasure = lineIndex * measuresPerLine;
        const endMeasure = Math.min(startMeasure + measuresPerLine, totalMeasures);
        
        // After scaling context, coordinates need to be adjusted by scaleFactor
        const trebleY = (30 * scaleFactor) + (lineIndex * ((lineHeight + lineSpacing) * scaleFactor));
        const bassY = trebleY + (staffSpacing * scaleFactor);
        
        // Create separate staves for each measure to ensure proper formatting
        const trebleStaves: Stave[] = [];
        const bassStaves: Stave[] = [];
        
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          // After scaling, x positions need to be adjusted
          const xPosition = (20 * scaleFactor) + (localMeasureIndex * (measureWidth * scaleFactor));
          const isLastMeasure = measureIndex === totalMeasures - 1;
          
          // Create treble stave for this measure (keep same width for alignment)
          // After scaling, stave width needs to be adjusted by scaleFactor
          const trebleStave = new Stave(xPosition, trebleY, measureWidth * scaleFactor);
          // Add clef, key signature, and time signature to first measure of each line
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
          // Set barline type before drawing
          if (isLastMeasure) {
            // Add repeat barline at the end to indicate looping
            trebleStave.setEndBarType(BarlineType.REPEAT_END);
          } else {
            trebleStave.setEndBarType(BarlineType.SINGLE);
          }
          trebleStaves.push(trebleStave);
          
          // Create bass stave for this measure
          // After scaling, stave width needs to be adjusted by scaleFactor
          const bassStave = new Stave(xPosition, bassY, measureWidth * scaleFactor);
          // Add clef, key signature, and time signature to first measure of each line
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
          // Set barline type before drawing
          if (isLastMeasure) {
            // Add repeat barline at the end to indicate looping
            bassStave.setEndBarType(BarlineType.REPEAT_END);
          } else {
            bassStave.setEndBarType(BarlineType.SINGLE);
          }
          bassStaves.push(bassStave);
        }
        
        // Draw all staves (with barlines already set)
        // Let VexFlow automatically calculate note start X based on clef/key/time signature
        trebleStaves.forEach(stave => stave.setContext(context).draw());
        bassStaves.forEach(stave => stave.setContext(context).draw());
        
        // Add brace for each line (system brackets)
        if (trebleStaves.length > 0 && bassStaves.length > 0) {
          const connector = new StaveConnector(trebleStaves[0], bassStaves[0]);
          connector.setType(StaveConnector.type.BRACE);
          connector.setContext(context).draw();
        }
        
        // Connect staves within the line
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
        
        // Track the last staves for repeat connector (only if this is the last line)
                if (endMeasure === totalMeasures) {
                  lastTrebleStaveGlobal = trebleStaves[trebleStaves.length - 1];
                  lastBassStaveGlobal = bassStaves[bassStaves.length - 1];
                }
        
        // Store first note references for chord name placement
        const firstNoteRefs: Map<number, { note: StaveNote; stave: Stave }> = new Map();
        
        // Render notes measure by measure
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          const trebleStave = trebleStaves[localMeasureIndex];
          const bassStave = bassStaves[localMeasureIndex];
          const styledChord = expandedStyledChords[measureIndex];
          
          // Create treble and bass notes for this measure
          // VexFlow will automatically align notes that start at the same tick position when voices are joined
          // To ensure proper alignment, we ensure that bass and treble note groups are synchronized
          const trebleNotes: StaveNote[] = [];
          const bassNotes: StaveNote[] = [];
          
          // Create treble and bass notes
          // VexFlow's joinVoices aligns notes at the same tick position (beat position)
          // Notes are added sequentially - VexFlow calculates tick positions based on cumulative duration
          // So notes starting at the same cumulative duration will align when joinVoices is used
          styledChord.trebleNotes.forEach((trebleGroup, groupIndex) => {
            const trebleNote = notesToStaveNote(trebleGroup.notes, trebleGroup.duration, 'treble');
            // Store note group identifier for later highlight updates
            const noteKey = `${measureIndex}:treble:${groupIndex}`;
            // Set data attribute on the note for later reference (VexFlow will preserve this in SVG)
            // Note: VexFlow doesn't directly support data attributes, so we'll use a different approach
            // For now, we'll still set style during render, but avoid full re-render when only highlighting changes
            if (activeNoteGroups.has(noteKey)) {
              trebleNote.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
            }
            trebleNotes.push(trebleNote);
          });
          
          styledChord.bassNotes.forEach((bassGroup, groupIndex) => {
            const bassNote = notesToStaveNote(bassGroup.notes, bassGroup.duration, 'bass');
            const noteKey = `${measureIndex}:bass:${groupIndex}`;
            if (activeNoteGroups.has(noteKey)) {
              bassNote.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
            }
            bassNotes.push(bassNote);
          });
          
          // Create voices for this measure
          // Use strict mode like ChordStylePreview - this ensures proper alignment with joinVoices
          // Strict mode ensures notes fit exactly within measure boundaries
          const trebleVoice = new Voice({ 
            numBeats: state.timeSignature.numerator, 
            beatValue: state.timeSignature.denominator 
          });
          trebleVoice.setStrict(true); // Strict mode for proper alignment
          trebleVoice.addTickables(trebleNotes);
          
          const bassVoice = new Voice({ 
            numBeats: state.timeSignature.numerator, 
            beatValue: state.timeSignature.denominator 
          });
          bassVoice.setStrict(true); // Strict mode for proper alignment
          bassVoice.addTickables(bassNotes);
          
          // Calculate format width for even note distribution across the measure
          // Use VexFlow's getNoteStartX() to get the actual start position after clef/key/time signature
          const noteStartX = trebleStave.getNoteStartX();
          // Use the stave's actual width (already scaled) instead of recalculating
          const staveWidth = trebleStave.getWidth();
          const staveX = trebleStave.getX();
          const staveEndX = staveX + staveWidth;
          
          // Calculate format width: from note start to stave end, with minimal right padding
          // This ensures notes are distributed evenly across the measure width and stay within boundaries
          const barlineWidth = 10 * scaleFactor; // Account for barline
          const rightPadding = 15 * scaleFactor; // Minimal right padding for breathing room
          // Ensure formatWidth doesn't exceed the available space
          const formatWidth = Math.max(30 * scaleFactor, Math.min(
            staveEndX - noteStartX - barlineWidth - rightPadding,
            staveWidth - (noteStartX - staveX) - barlineWidth - rightPadding
          ));
          
          // Add beams for eighth notes based on time signature
          // In compound time (6/8, 12/8), beam eighth notes in groups of 3
          // In simple time (3/4, 4/4), beam eighth notes in groups of 2
          const addBeams = (notes: StaveNote[]) => {
            const beams: Beam[] = [];
            let currentBeamGroup: StaveNote[] = [];
            
            const isCompoundTime = state.timeSignature.denominator === 8;
            const beamGroupSize = isCompoundTime ? 3 : 2; // Group of 3 for compound, 2 for simple
            
            notes.forEach((note, index) => {
              // Only beam eighth notes (duration '8')
              const duration = note.getDuration();
              if (duration === '8' && note.getKeys().length > 0 && !note.isRest()) {
                currentBeamGroup.push(note);
                
                // Create beam when group is complete or at end of measure
                if (currentBeamGroup.length === beamGroupSize || index === notes.length - 1) {
                  if (currentBeamGroup.length >= 2) {
                    // Only create beam if we have at least 2 notes
                    const beam = new Beam(currentBeamGroup);
                    beams.push(beam);
                  }
                  currentBeamGroup = [];
                }
              } else {
                // Non-beamable note or rest - finish current beam group if any
                if (currentBeamGroup.length >= 2) {
                  const beam = new Beam(currentBeamGroup);
                  beams.push(beam);
                }
                currentBeamGroup = [];
              }
            });
            
            return beams;
          };
          
          const trebleBeams = addBeams(trebleNotes);
          const bassBeams = addBeams(bassNotes);
          
          // Format and draw voices for this measure
          // joinVoices aligns notes at the same tick position (beat position) across voices
          // This ensures that treble and bass notes starting at the same beat align horizontally
          const formatter = new Formatter();
          
          // Join voices together - this tells VexFlow to align notes at same tick positions
          formatter.joinVoices([trebleVoice, bassVoice]);
          
          // Format both voices together - VexFlow will align notes at same tick positions
          // Notes starting at tick 0 in both voices will be horizontally aligned
          formatter.format([trebleVoice, bassVoice], formatWidth);
          
          // Draw voices - VexFlow will position notes within the stave boundaries
          trebleVoice.draw(context, trebleStave);
          bassVoice.draw(context, bassStave);
          
          // Draw beams after notes are drawn
          trebleBeams.forEach(beam => beam.setContext(context).draw());
          bassBeams.forEach(beam => beam.setContext(context).draw());
          
          // Store reference to the first note for later position lookup
          // Prefer treble note, fallback to bass note
          const firstNote = trebleNotes.length > 0 ? trebleNotes[0] : (bassNotes.length > 0 ? bassNotes[0] : null);
          if (firstNote) {
            firstNoteRefs.set(measureIndex, { note: firstNote, stave: trebleStave });
          }
        }
        
        // Add chord names positioned above beat 1 of each measure
        const svgElement = containerRef.current?.querySelector('svg');
        if (svgElement) {
          for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
            const chordName = expandedChordNames[measureIndex];
            // Only render chord name if it's not empty (only first measure of each chord)
            if (!chordName) continue;
            
            const localMeasureIndex = measureIndex - startMeasure;
            const trebleStave = trebleStaves[localMeasureIndex];
            
            // Get the X position of the first note (beat 1) from stored reference
            let xPosition: number;
            const noteRef = firstNoteRefs.get(measureIndex);
            if (noteRef) {
              try {
                // Get bounding box of the first note after drawing
                const bounds = noteRef.note.getBoundingBox();
                if (bounds) {
                  xPosition = bounds.getX();
                } else {
                  // Fallback: use stave position
                  // Chord name x position needs to account for scaling
                  xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? (60 + (keySig.count * 4)) * scaleFactor : 40 * scaleFactor);
                }
              } catch {
                // Fallback: use stave position
                // Chord name x position needs to account for scaling
                xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? (100 + (keySig.count * 7)) * scaleFactor : 25 * scaleFactor);
              }
            } else {
              // Fallback: use stave position
              xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? 100 + (keySig.count * 7) : 25);
            }
            
            // Position chord name above the first note (beat 1)
            // Chord names are rendered in scaled coordinates
            const yPosition = trebleY + (5 * scaleFactor); // Lower, closer to staff lines
            
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('x', String(xPosition));
            textElement.setAttribute('y', String(yPosition));
            textElement.setAttribute('font-family', 'Arial, sans-serif');
            // Keep chord name font size readable - don't scale it down
            // Since we're rendering in a scaled context, we need to compensate for the scale
            // to keep the font size readable (divide by finalScale to counteract context scaling)
            const chordNameFontSize = 14 / finalScale; // Compensate for context scaling to keep readable size
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
      
      // Restore scroll position if we preserved it
      // Only restore if the user had scrolled (non-zero position) to avoid interfering with default scroll
      if (shouldPreserveScroll && scrollContainerRef.current && (scrollTop > 0 || scrollLeft > 0)) {
        // Use requestAnimationFrame to ensure DOM is updated before scrolling
        // Use double requestAnimationFrame to ensure rendering is complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              // Check if user has scrolled since we captured the position
              // If so, don't override their scroll
              let currentScrollTop = 0;
              let currentScrollLeft = 0;
              if (scrollContainerRef.current === document.documentElement) {
                currentScrollTop = window.scrollY;
                currentScrollLeft = window.scrollX;
              } else {
                currentScrollTop = scrollContainerRef.current.scrollTop;
                currentScrollLeft = scrollContainerRef.current.scrollLeft;
              }
              
              // Only restore if scroll hasn't changed significantly (user isn't actively scrolling)
              // Allow small differences for smooth scrolling
              const scrollDiff = Math.abs(currentScrollTop - scrollTop) + Math.abs(currentScrollLeft - scrollLeft);
              if (scrollDiff < 50) { // User hasn't scrolled more than 50px
                if (scrollContainerRef.current === document.documentElement) {
                  window.scrollTo(scrollLeft, scrollTop);
                } else {
                  scrollContainerRef.current.scrollTop = scrollTop;
                  scrollContainerRef.current.scrollLeft = scrollLeft;
                }
              }
            }
          });
        });
      }
      
      // Add connector at the very end to make repeat barline span both staves
      // Use VexFlow's StaveConnector instead of manually drawing a line
      // This ensures proper alignment and connection using VexFlow's built-in logic
      if (lastTrebleStaveGlobal && lastBassStaveGlobal) {
        // Use StaveConnector with SINGLE_RIGHT type to connect the staves at the right side (barline)
        // SINGLE_RIGHT is specifically designed for connecting staves at the right edge
        // This will automatically handle the proper connection between treble and bass staves
        // and align with the repeat barline that's already drawn on each stave
        const barlineConnector = new StaveConnector(lastTrebleStaveGlobal, lastBassStaveGlobal);
        barlineConnector.setType(StaveConnector.type.SINGLE_RIGHT);
        barlineConnector.setContext(context).draw();
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
      // Show error message to user
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: red; padding: 2rem;">Error rendering chord score: ${error instanceof Error ? error.message : String(error)}. Please try again.</p>`;
      }
    }
  }, [state, currentChordIndex, activeNoteGroups]);

  return (
    <div className="chord-score-container" ref={containerRef} />
  );
};

export default ChordScoreRenderer;
