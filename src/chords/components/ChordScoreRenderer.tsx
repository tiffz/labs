/**
 * VexFlow renderer for chord progressions
 * Renders grand staff (bass + treble clef) with proper measure-by-measure formatting
 */

import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, BarlineType, Dot, Beam } from 'vexflow';
import type { ChordProgressionState } from '../types';
import { progressionToChords } from '../utils/chordTheory';
import { generateVoicing } from '../utils/chordVoicing';
import { formatChordName } from '../utils/chordNaming';
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

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

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
      
      // Calculate measures per line (wrap to multiple lines)
      // Default to 4 measures per line for better organization
      const containerWidth = containerRef.current.clientWidth || 1200;
      const baseMeasureWidth = 320; // Base width per measure
      const defaultMeasuresPerLine = 4; // Default to 4 measures per line
      
      // Calculate dynamic measure width based on note count in styled chords
      // More notes need more space to prevent escaping
      const maxNotesPerMeasure = Math.max(...styledChords.map(sc => 
        sc.trebleNotes.length + sc.bassNotes.length
      ));
      const measureWidth = baseMeasureWidth + Math.max(0, (maxNotesPerMeasure - 4) * 15);
      
      // Calculate how many measures fit, but prefer 4 if possible
      const maxMeasuresByWidth = Math.floor((containerWidth - 120) / measureWidth);
      const measuresPerLine = maxMeasuresByWidth >= defaultMeasuresPerLine 
        ? defaultMeasuresPerLine 
        : Math.max(1, maxMeasuresByWidth);
      const numLines = Math.ceil(chords.length / measuresPerLine);
      
      // Create renderer - grand staff needs more height per line
      // Reduced height for denser display
      const lineHeight = 240; // Reduced height for grand staff per line
      const lineSpacing = 40; // Reduced space between lines
      const totalHeight = (lineHeight * numLines) + (lineSpacing * (numLines - 1)) + 40;
      
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(containerWidth, totalHeight);
      const context = renderer.getContext();
      
      // Normalize key for VexFlow
      const normalizedKey = normalizeKeyForVexFlow(state.key);
      const keySig = getKeySignature(state.key);
      
      // Render each line
      for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
        const startMeasure = lineIndex * measuresPerLine;
        const endMeasure = Math.min(startMeasure + measuresPerLine, chords.length);
        
        const trebleY = 30 + (lineIndex * (lineHeight + lineSpacing));
        const bassY = trebleY + 100; // Reduced spacing for denser display
        
        // Create separate staves for each measure to ensure proper formatting
        const trebleStaves: Stave[] = [];
        const bassStaves: Stave[] = [];
        
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          const xPosition = 20 + (localMeasureIndex * measureWidth);
          const isLastMeasure = measureIndex === chords.length - 1;
          
          // Create treble stave for this measure (keep same width for alignment)
          const trebleStave = new Stave(xPosition, trebleY, measureWidth);
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
          // Set barline type before drawing (except for last measure)
          if (!isLastMeasure) {
            trebleStave.setEndBarType(BarlineType.SINGLE);
          }
          trebleStaves.push(trebleStave);
          
          // Create bass stave for this measure
          const bassStave = new Stave(xPosition, bassY, measureWidth);
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
          // Set barline type before drawing (except for last measure)
          if (!isLastMeasure) {
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
        
        // Store first note references for chord name placement
        const firstNoteRefs: Map<number, { note: StaveNote; stave: Stave }> = new Map();
        
        // Render notes measure by measure
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          const trebleStave = trebleStaves[localMeasureIndex];
          const bassStave = bassStaves[localMeasureIndex];
          const styledChord = styledChords[measureIndex];
          
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
            // Highlight if this note group is currently active
            if (activeNoteGroups.has(`${measureIndex}:treble:${groupIndex}`)) {
              trebleNote.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
            }
            trebleNotes.push(trebleNote);
          });
          
          styledChord.bassNotes.forEach((bassGroup, groupIndex) => {
            const bassNote = notesToStaveNote(bassGroup.notes, bassGroup.duration, 'bass');
            // Highlight if this note group is currently active
            if (activeNoteGroups.has(`${measureIndex}:bass:${groupIndex}`)) {
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
          
          // Calculate format width properly - VexFlow expects width available for notes
          // VexFlow automatically calculates note start X based on clef/key/time signature
          // Be EXTREMELY conservative to prevent notes from escaping
          const noteCount = trebleNotes.length + bassNotes.length;
          const hasManyNotes = noteCount > 6;
          const hasVeryManyNotes = noteCount > 10;
          const isComplexKey = keySig.count >= 5;
          
          // Very aggressive reduction to prevent escaping
          // Similar to drums app: measureWidth - 60, but more conservative for first measure
          let formatReduction: number;
          if (localMeasureIndex === 0) {
            // First measure: account for clef/key/time signature + be extremely conservative
            // Base reduction: 150px for clef/key/time signature
            // Additional: 12px per key signature accidental
            // Additional: 25px if many notes, 50px if very many notes
            // Additional: 20px if complex key
            formatReduction = 150 + (keySig.count * 12) + (hasVeryManyNotes ? 50 : hasManyNotes ? 25 : 0) + (isComplexKey ? 20 : 0);
          } else {
            // Other measures: still be very conservative, especially with many notes
            // Base reduction: 80px for barline and spacing
            // Additional: 30px if many notes, 60px if very many notes
            formatReduction = 80 + (hasVeryManyNotes ? 60 : hasManyNotes ? 30 : 0);
          }
          
          // Format width is the available width for notes within the stave
          // VexFlow will automatically start notes after clef/key/time signature
          // Use very conservative minimum to prevent escaping - never go below 30px
          const formatWidth = Math.max(30, measureWidth - formatReduction);
          
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
            const chord = chords[measureIndex];
            const chordName = formatChordName(chord);
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
                xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? 60 + (keySig.count * 4) : 40);
              }
            } catch {
              // Fallback: use stave position
              xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? 100 + (keySig.count * 7) : 25);
            }
          } else {
            // Fallback: use stave position
            xPosition = trebleStave.getX() + (localMeasureIndex === 0 ? 100 + (keySig.count * 7) : 25);
          }
            
            // Position chord name above the first note (beat 1)
            const yPosition = trebleY + 5; // Lower, closer to staff lines
            
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('x', String(xPosition));
            textElement.setAttribute('y', String(yPosition));
            textElement.setAttribute('font-family', 'Arial, sans-serif');
            textElement.setAttribute('font-size', '13');
            textElement.setAttribute('font-weight', 'bold');
            textElement.setAttribute('fill', '#1e293b');
            textElement.setAttribute('text-anchor', 'start');
            textElement.setAttribute('dominant-baseline', 'baseline');
            textElement.textContent = chordName;
            svgElement.appendChild(textElement);
          }
        }
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
